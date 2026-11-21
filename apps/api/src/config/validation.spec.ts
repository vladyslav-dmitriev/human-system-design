import { validationSchema } from './validation';
import { getTrustProxy } from './app.config';

const base = {
  SERVER_PORT: '3001',
  CLIENT_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'j'.repeat(32),
  AUTH_SECRET: 'a'.repeat(32),
  RABBITMQ_URL: 'amqp://u:p@localhost:5672/',
};
const SECRET = 'i'.repeat(32);

const validate = (env: Record<string, unknown>) =>
  validationSchema.validate(env, { abortEarly: false });

describe('env validation', () => {
  it('the base development environment is valid', () => {
    expect(
      validate({ ...base, NODE_ENV: 'development' }).error,
    ).toBeUndefined();
  });

  describe('INTERNAL_API_SECRET', () => {
    const prod = { ...base, NODE_ENV: 'production', EMAIL_FROM: 'a@b.dev' };

    it('is required in production', () => {
      expect(validate(prod).error?.message).toContain('INTERNAL_API_SECRET');
    });

    it('must be at least 32 characters', () => {
      expect(
        validate({ ...prod, INTERNAL_API_SECRET: 'short' }).error?.message,
      ).toContain('INTERNAL_API_SECRET');
      expect(
        validate({ ...prod, INTERNAL_API_SECRET: SECRET }).error,
      ).toBeUndefined();
    });

    it('is optional outside production, but a short one is still rejected', () => {
      expect(
        validate({ ...base, NODE_ENV: 'development' }).error,
      ).toBeUndefined();
      expect(
        validate({ ...base, NODE_ENV: 'development', INTERNAL_API_SECRET: 'x' })
          .error,
      ).toBeDefined();
    });
  });

  describe('SMS_DEV_MOCK', () => {
    it('is allowed in development', () => {
      const { error, value } = validate({
        ...base,
        NODE_ENV: 'development',
        SMS_DEV_MOCK: 'true',
      });

      expect(error).toBeUndefined();
      expect(value.SMS_DEV_MOCK).toBe(true);
    });

    it('is forbidden in production when true', () => {
      const { error } = validate({
        ...base,
        NODE_ENV: 'production',
        EMAIL_FROM: 'a@b.dev',
        INTERNAL_API_SECRET: SECRET,
        SMS_DEV_MOCK: 'true',
      });

      expect(error?.message).toContain('SMS_DEV_MOCK');
    });

    it('false in production is fine', () => {
      expect(
        validate({
          ...base,
          NODE_ENV: 'production',
          EMAIL_FROM: 'a@b.dev',
          INTERNAL_API_SECRET: SECRET,
          SMS_DEV_MOCK: 'false',
        }).error,
      ).toBeUndefined();
    });
  });

  it('RABBITMQ_URL is required (no fallback with credentials)', () => {
    const { RABBITMQ_URL: _omit, ...rest } = base;

    expect(validate(rest).error?.message).toContain('RABBITMQ_URL');
  });

  it('SMS_DAILY_LIMIT defaults to 1000 and must be a positive integer', () => {
    expect(validate(base).value.SMS_DAILY_LIMIT).toBe(1000);
    expect(validate({ ...base, SMS_DAILY_LIMIT: '0' }).error).toBeDefined();
    expect(
      validate({ ...base, SMS_DAILY_LIMIT: '50' }).value.SMS_DAILY_LIMIT,
    ).toBe(50);
  });
});

describe('getTrustProxy', () => {
  it('defaults to a single hop (nginx at the edge)', () => {
    expect(getTrustProxy({})).toBe(1);
    expect(getTrustProxy({ TRUST_PROXY: '  ' })).toBe(1);
  });

  it('honours explicit values', () => {
    expect(getTrustProxy({ TRUST_PROXY: 'false' })).toBe(false);
    expect(getTrustProxy({ TRUST_PROXY: '2' })).toBe(2);
    expect(getTrustProxy({ TRUST_PROXY: 'loopback' })).toBe('loopback');
  });
});
