// src/modules/rabbitmq/queues/rabbitmq.queue.definitions.ts
import { QueueDefinition } from '../types/rabbitmq.types';

export const QUEUE_DEFINITIONS: Record<string, QueueDefinition> = {
  // ============================================
  // Email очереди
  // ============================================
  EMAIL: {
    name: 'email.queue', // ✅ точка
    routingKey: 'email.*',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 5,
    },
  },
  EMAIL_WELCOME: {
    name: 'email.welcome.queue', // ✅ точка
    routingKey: 'email.welcome',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 10,
    },
  },
  EMAIL_RESET: {
    name: 'email.reset.queue', // ✅ точка
    routingKey: 'email.reset.*',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 10,
    },
  },

  // ============================================
  // Order очереди
  // ============================================
  ORDER: {
    name: 'order.queue', // ✅ точка
    routingKey: 'order.*',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 10,
    },
  },
  ORDER_PRIORITY: {
    name: 'order.priority.queue', // ✅ точка
    routingKey: 'order.priority.*',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 10,
    },
  },

  // ============================================
  // Notification очереди
  // ============================================
  NOTIFICATION: {
    name: 'notification.queue', // ✅ точка
    routingKey: 'notification.*',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 5,
    },
  },
  NOTIFICATION_PUSH: {
    name: 'notification.push.queue', // ✅ точка
    routingKey: 'notification.push',
    durable: true,
    queueType: 'quorum',
    arguments: {
      'x-max-priority': 5,
    },
  },

  // ============================================
  // Dead Letter
  // ============================================
  DEAD_LETTER: {
    name: 'dead.letter.queue', // ✅ точка
    routingKey: 'dead.letter',
    durable: true,
    queueType: 'quorum',
  },

  // ============================================
  // Events очереди
  // ============================================
  EVENTS_AUDIT: {
    name: 'events.audit.queue', // ✅ точка
    routingKey: '*',
    durable: true,
    queueType: 'quorum',
  },
  EVENTS_ANALYTICS: {
    name: 'events.analytics.queue', // ✅ точка
    routingKey: '*',
    durable: true,
    queueType: 'quorum',
  },
};

export const QUEUE_NAMES = {
  EMAIL: 'email.queue',
  EMAIL_WELCOME: 'email.welcome.queue',
  EMAIL_RESET: 'email.reset.queue',
  ORDER: 'order.queue',
  ORDER_PRIORITY: 'order.priority.queue',
  NOTIFICATION: 'notification.queue',
  NOTIFICATION_PUSH: 'notification.push.queue',
  DEAD_LETTER: 'dead.letter.queue',
  EVENTS_AUDIT: 'events.audit.queue',
  EVENTS_ANALYTICS: 'events.analytics.queue',
} as const;
