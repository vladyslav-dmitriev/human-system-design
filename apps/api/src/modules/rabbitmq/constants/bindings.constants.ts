import { EXCHANGES } from './exchanges.constants';
import { BindingDefinition } from '../types/exchanges.types';

export const DEFAULT_BINDINGS: BindingDefinition[] = [
  // Email очереди
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'email.queue',
    routingKey: 'email.*',
    description: 'Все email сообщения',
  },
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'email.welcome.queue',
    routingKey: 'email.welcome',
    description: 'Welcome email',
  },
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'email.reset.queue',
    routingKey: 'email.reset.*',
    description: 'Password reset emails',
  },

  // Order очереди
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'order.queue',
    routingKey: 'order.*',
    description: 'Все заказы',
  },
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'order.priority.queue',
    routingKey: 'order.priority.*',
    description: 'Приоритетные заказы',
  },

  // Notification очереди
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'notification.queue',
    routingKey: 'notification.*',
    description: 'Все уведомления',
  },
  {
    sourceExchange: EXCHANGES.APP_EXCHANGE.name,
    destinationQueue: 'notification.push.queue',
    routingKey: 'notification.push',
    description: 'Push уведомления',
  },

  // Dead Letter биндинги
  {
    sourceExchange: EXCHANGES.DLX_EXCHANGE.name,
    destinationQueue: 'dead.letter.queue',
    routingKey: 'dead.letter.*',
    description: 'Все dead letter сообщения',
  },

  // Events биндинги
  {
    sourceExchange: EXCHANGES.EVENTS_EXCHANGE.name,
    destinationQueue: 'events.audit.queue',
    routingKey: '*', // Для fanout все равно, но оставляем для совместимости
    description: 'Аудит событий',
  },
  {
    sourceExchange: EXCHANGES.EVENTS_EXCHANGE.name,
    destinationQueue: 'events.analytics.queue',
    routingKey: '*',
    description: 'Аналитика событий',
  },
];
