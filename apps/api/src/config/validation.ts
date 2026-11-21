import * as Joi from 'joi';

/**
 * Проверка окружения при старте: без обязательных переменных приложение
 * не поднимается и пишет, чего именно не хватает.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  SERVER_PORT: Joi.number().port().required(),

  PORT: Joi.number().port().optional(),

  CLIENT_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  REDIS_PORT: Joi.number().port().default(6379),

  JWT_SECRET: Joi.string().min(32).required(),

  // Секрет сессий Auth.js: AuthGuard читает AUTH_SECRET или NEXTAUTH_SECRET.
  AUTH_SECRET: Joi.string().min(16),
  NEXTAUTH_SECRET: Joi.string().min(16),

  ENABLE_SWAGGER: Joi.boolean().optional(),
  ENABLE_METRICS: Joi.boolean().optional(),
  TRUST_PROXY: Joi.string().optional(),
})
  .or('AUTH_SECRET', 'NEXTAUTH_SECRET')
  .unknown(true);
