import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';
import { setupSwagger } from './setup-swagger.js';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters';
import { getTrustProxy, isSwaggerEnabled } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const clientUrl = configService.get<string>('CLIENT_URL');
  const serverPort = configService.get<number>('SERVER_PORT');

  // IP клиента для rate limit: верим X-Forwarded-For только от nginx / внутренней сети
  app.set('trust proxy', getTrustProxy());
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Swagger UI использует inline-скрипты; без него у API строгий CSP
      contentSecurityPolicy: isSwaggerEnabled()
        ? false
        : {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          },
    }),
  );
  app.use(cookieParser());

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
      exposeDefaultValues: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  setupSwagger(app);

  app.enableCors({
    origin: clientUrl,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  if (!serverPort) {
    throw new Error('SERVER_PORT is not defined');
  }

  app.enableShutdownHooks();

  await app.listen(serverPort, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
});
