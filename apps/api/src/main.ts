import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';
import { setupSwagger } from './setup-swagger.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const clientUrl = configService.get<string>('CLIENT_URL');
  const serverPort = configService.get<number>('SERVER_PORT');

  app.use(cookieParser());

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
