// Один хоп: nginx на краю (он перезаписывает X-Forwarded-For адресом клиента)
const DEFAULT_TRUST_PROXY = 1;

const parseBoolean = (
  value: string | boolean | undefined,
  fallback: boolean,
): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const isProduction = (env: NodeJS.ProcessEnv) => env.NODE_ENV === 'production';

/** Swagger (`/docs`): по умолчанию включён везде, кроме production. */
export const isSwaggerEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  parseBoolean(env.ENABLE_SWAGGER, !isProduction(env));

/** `GET /metrics`: по умолчанию включён везде, кроме production. */
export const isMetricsEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  parseBoolean(env.ENABLE_METRICS, !isProduction(env));

/**
 * Каким прокси доверяем при определении IP клиента (`X-Forwarded-For`).
 * По умолчанию один хоп (nginx на краю); значение `false` отключает trust proxy,
 * число = количество хопов, иначе список подсетей для Express.
 */
export const getTrustProxy = (
  env: NodeJS.ProcessEnv = process.env,
): string | number | boolean => {
  const raw = env.TRUST_PROXY?.trim();

  if (!raw) {
    return DEFAULT_TRUST_PROXY;
  }

  if (raw === 'false') {
    return false;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  return raw;
};

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
});
