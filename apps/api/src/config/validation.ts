import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000).min(1).max(65535),

  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  REDIS_PORT: Joi.number().default(6379),

  JWT_SECRET: Joi.string().min(32).required(),
});
