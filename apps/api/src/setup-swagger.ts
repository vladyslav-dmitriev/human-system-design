import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { isSwaggerEnabled } from './config/app.config';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Documetation for API')
    .setVersion('1.0')
    .addCookieAuth('authjs.session-token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'authjs.session-token',
      description:
        'Вставьте сюда валидный токен сессии из браузера для тестирования',
    })
    .build();

  if (isSwaggerEnabled()) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }
};
