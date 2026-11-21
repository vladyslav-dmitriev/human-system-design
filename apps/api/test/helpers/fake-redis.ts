/* eslint-disable @typescript-eslint/require-await -- in-memory fake mimics the async ioredis client */

/** Минимальный in-memory Redis для e2e-тестов с моками: set (EX, NX)/get/getdel/incr/del/expire. */
export function createFakeRedis() {
  const store = new Map<string, string>();
  const ttl = new Map<string, number>();

  return {
    store,
    ttl,
    // set(key, value, 'EX', seconds, 'NX'): NX не перезаписывает существующий ключ (возвращает null)
    set: async (key: string, value: string, ...args: (string | number)[]) => {
      if (args.includes('NX') && store.has(key)) return null;
      store.set(key, value);
      const exIndex = args.indexOf('EX');
      if (exIndex >= 0) ttl.set(key, Number(args[exIndex + 1]));

      return 'OK';
    },
    get: async (key: string) => store.get(key) ?? null,
    getdel: async (key: string) => {
      const value = store.get(key) ?? null;

      store.delete(key);

      return value;
    },
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? 0) + 1;

      store.set(key, String(next));

      return next;
    },
    expire: async (key: string, seconds: number) => {
      ttl.set(key, seconds);

      return 1;
    },
    del: async (key: string) => (store.delete(key) ? 1 : 0),
    ping: async () => 'PONG',
  };
}
