import { EXCHANGES } from './exchanges.constants';

import type { Queue } from '../types/exchanges.types';

export const QUEUES: Record<string, Queue> = {
  EMAIL_HIGH: {
    name: 'email.high.queue',
    routingKey: 'email.high.#',
    exchange: EXCHANGES.EMAIL_EXCHANGE.name,
    durable: true,
    type: 'quorum',
    description: 'Critical major emails',
    arguments: {
      'x-max-priority': 10,
    },
  },
  EMAIL_MEDIUM: {
    name: 'email.medium.queue',
    routingKey: 'email.medium.#',
    exchange: EXCHANGES.EMAIL_EXCHANGE.name,
    durable: true,
    type: 'quorum',
    description: 'Simple emails',
    arguments: {
      'x-max-priority': 5,
    },
  },
  // ORDER: {
  //   name: 'order.queue',
  //   routingKey: 'order.#',
  //   durable: true,
  //   type: 'quorum',
  //   description: 'Очередь для обработки заказов',
  // },
  // NOTIFICATION: {
  //   name: 'notification.queue',
  //   routingKey: 'notification.#',
  //   durable: true,
  //   type: 'quorum',
  //   description: 'Очередь для отправки уведомлений',
  // },
  DEAD_LETTER: {
    name: 'dead.letter.queue',
    exchange: EXCHANGES.DLX_EXCHANGE.name,
    routingKey: 'dead.letter.#',
    durable: true,
    type: 'quorum',
    description: 'Очередь для сообщений, которые не удалось обработать',
  },
};
