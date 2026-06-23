import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUE } from 'config/queue.config';

export const setupQueue = (name: (typeof QUEUE)[keyof typeof QUEUE]) => {
  return [
    BullModule.registerQueue({ name }),
    BullBoardModule.forFeature({
      name,
      adapter: BullMQAdapter,
    }),
  ];
};

export const registerQueue = (name: (typeof QUEUE)[keyof typeof QUEUE]) => {
  return [
    BullModule.registerQueue({
      name,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 300 },
      },
    }),
  ];
};
