import { BullModule } from '@nestjs/bullmq';

import { DEFAULT_JOB_OPTIONS, type QueueName } from 'config/queue.config';

/** Регистрирует очередь с общими настройками ретраев и очистки. Подключение задаёт `BullModule.forRootAsync` в AppModule. */
export const registerQueue = (name: QueueName) =>
  BullModule.registerQueue({
    name,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
