// import { BullModule } from '@nestjs/bullmq';
// import { BullBoardModule } from '@bull-board/nestjs';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
// import { QUEUE } from 'config/queue.config';

export const setupQueue = (name: (typeof QUEUE)[keyof typeof QUEUE]) => {
  return [];

  // return [
  //   BullModule.registerQueue({ name }),
  //   BullBoardModule.forFeature({
  //     name,
  //     adapter: BullMQAdapter,
  //   }),
  // ];
};

export const registerQueue = (name: (typeof QUEUE)[keyof typeof QUEUE]) => {
  return [];

  // return [
  //   BullModule.registerQueue({
  //     name,
  //     defaultJobOptions: {
  //       removeOnComplete: {
  //         count: 100, // Хранить только 100 последних
  //         age: 3600, // Или старше 1 часа
  //       },
  //       removeOnFail: {
  //         count: 50,
  //         age: 86400,
  //       },
  //       attempts: 1,
  //       backoff: {
  //         type: 'exponential',
  //         delay: 1000,
  //       },
  //     },
  //   }),
  // ];
};
