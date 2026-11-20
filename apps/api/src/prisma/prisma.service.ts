import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { DatabaseMetrics } from '../modules/metrics/collectors/database.metrics';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

type QueryParams = {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

/**
 * Prisma client extension that records every query into
 * `database_query_duration_seconds{operation, model}`.
 *
 * Uses the top-level `query.$allOperations` hook, which (unlike
 * `$allModels.$allOperations`) also fires for raw queries ($queryRaw,
 * $executeRaw and their *Unsafe variants). Those have no model, so they are
 * labelled model="raw".
 */
export const createQueryDurationExtension = (db: DatabaseMetrics) => ({
  name: 'query-duration-metrics',
  query: {
    $allOperations: ({ model, operation, args, query }: QueryParams) =>
      db.observe(model ?? 'raw', operation, () => query(args)),
  },
});

const OWN_MEMBERS = new Set<PropertyKey>([
  'onModuleInit',
  'onModuleDestroy',
  '$connect',
  '$disconnect',
  '$on',
]);

/**
 * Lifecycle / connection members stay on `target` (the instance Nest manages);
 * everything else (model delegates, $transaction, $queryRaw...) is served by
 * `extended`. Bound functions are cached so identity is stable
 * (`prisma.$transaction === prisma.$transaction`).
 */
export const createExtendedProxy = <T extends object>(
  target: T,
  extended: object,
): T => {
  const bound = new Map<PropertyKey, unknown>();

  return new Proxy(target, {
    get: (_t, prop) => {
      const source = OWN_MEMBERS.has(prop) ? target : extended;
      const value: unknown = Reflect.get(source, prop, source);

      if (typeof value !== 'function') return value;

      let fn = bound.get(prop);

      if (!fn) {
        fn = (value as (...a: unknown[]) => unknown).bind(source);
        bound.set(prop, fn);
      }

      return fn;
    },
  });
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(@Inject(DatabaseMetrics) db: DatabaseMetrics) {
    super({
      adapter,
      log: ['info', 'warn', 'error'],
    });

    // $extends returns a new client, but Nest must keep calling lifecycle
    // hooks on this instance, hence the proxy.
    const extended = this.$extends(createQueryDurationExtension(db));

    return createExtendedProxy(this, extended as object);
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('Database connection failed:', error);
      // Не обязательно бросать ошибку, если хотите, чтобы API всё равно стартовал
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
