// src/modules/rabbitmq/queues/exchanges.ts
import { ExchangeConfig } from '../types/exchanges.types';

export const EXCHANGES: Record<string, ExchangeConfig> = {
  APP_EXCHANGE: {
    name: 'app.exchange',
    type: 'topic',
    durable: true,
    autoDelete: false,
    description: 'Главный обменник приложения',
    arguments: {
      'x-queue-type': 'quorum',
      'alternate-exchange': 'app.exchange.dlx', // ✅ Добавляем!
    },
  },
  DLX_EXCHANGE: {
    name: 'app.exchange.dlx',
    type: 'topic',
    durable: true,
    autoDelete: false,
    description: 'Dead Letter Exchange',
    arguments: {
      'x-queue-type': 'quorum',
    },
  },
  DELAYED_EXCHANGE: {
    name: 'app.exchange.delayed',
    type: 'topic',
    durable: true,
    autoDelete: false,
    description: 'Обменник для отложенных сообщений',
    arguments: {
      'x-delayed-type': 'topic',
    },
  },
  EVENTS_EXCHANGE: {
    name: 'app.exchange.events',
    type: 'fanout',
    durable: true,
    autoDelete: false,
    description: 'Fanout обменник для широковещательных событий',
  },
  RPC_EXCHANGE: {
    name: 'app.exchange.rpc',
    type: 'direct',
    durable: true,
    autoDelete: false,
    description: 'Обменник для RPC запросов',
  },
};
