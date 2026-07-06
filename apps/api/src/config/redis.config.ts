export const redisConfig = {
  // @ts-ignore
  url: process.env.REDIS_URL as string,
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export default () => ({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
});
