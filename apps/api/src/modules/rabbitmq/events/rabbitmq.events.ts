import { RabbitMQMessage } from '../types/rabbitmq.types';

/**
 * Базовый класс события
 */
export class RabbitMQEvent {
  constructor(
    public readonly type: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * Событие подключения
 */
export class ConnectionEvent extends RabbitMQEvent {
  constructor(
    public readonly connected: boolean,
    public readonly attempt: number,
    public readonly error?: Error,
  ) {
    super('connection');
  }
}

/**
 * Событие сообщения
 */
export class MessageEvent extends RabbitMQEvent {
  constructor(
    public readonly message: RabbitMQMessage,
    public readonly queue: string,
    public readonly routingKey: string,
    public readonly status: 'received' | 'processed' | 'failed',
  ) {
    super('message');
  }
}

/**
 * Событие ошибки
 */
export class ErrorEvent extends RabbitMQEvent {
  constructor(
    public readonly error: Error,
    public readonly context: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super('error');
  }
}

/**
 * Событие очереди
 */
export class QueueEvent extends RabbitMQEvent {
  constructor(
    public readonly queueName: string,
    public readonly action:
      | 'created'
      | 'deleted'
      | 'purged'
      | 'bound'
      | 'unbound',
    public readonly details?: Record<string, any>,
  ) {
    super('queue');
  }
}

/**
 * Событие метрики
 */
export class MetricEvent extends RabbitMQEvent {
  constructor(
    public readonly metricName: string,
    public readonly value: number,
    public readonly tags?: Record<string, string>,
  ) {
    super('metric');
  }
}

/**
 * Типы событий
 */
export const EVENT_TYPES = {
  CONNECTION: 'connection',
  MESSAGE: 'message',
  ERROR: 'error',
  QUEUE: 'queue',
  METRIC: 'metric',
  PRODUCER: 'producer',
  CONSUMER: 'consumer',
} as const;
