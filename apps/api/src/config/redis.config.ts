const DEFAULT_REDIS_PORT = 6379;

/**
 * Возвращает полный адрес Redis.
 * REDIS_URL может быть полным URL (`redis://host:6379`, `rediss://...`)
 * или просто именем хоста (`redis`) — тогда порт берётся из REDIS_PORT (по умолчанию 6379).
 * Читается лениво, чтобы .env успел загрузиться; без REDIS_URL падаем сразу
 * с понятной ошибкой, а не подключаемся молча к localhost.
 */
export const getRedisUrl = (): string => {
  const raw = process.env.REDIS_URL?.trim();

  if (!raw) {
    throw new Error('REDIS_URL is not set');
  }

  if (raw.includes('://')) {
    return raw;
  }

  const port = Number(process.env.REDIS_PORT) || DEFAULT_REDIS_PORT;

  return `redis://${raw}:${port}`;
};
