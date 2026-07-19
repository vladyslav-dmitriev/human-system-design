import type { RabbitMQMessage } from '../types/rabbitmq.types';

/**
 * DTO для потребления сообщения
 */
export interface ConsumeDTO<T = any> {
  queue: string;
  routingKey: string;
  handler: (message: T, metadata: ConsumeMetadata) => Promise<void>;
  exchange?: string;
  noAck?: boolean;
  prefetch?: number;
  exclusive?: boolean;
  priority?: number;
  concurrency?: number;
}

/**
 * Метаданные потребления
 */
export interface ConsumeMetadata {
  queue: string;
  routingKey: string;
  exchange: string;
  messageId: string;
  correlationId?: string;
  deliveryTag: number;
  redelivered: boolean;
  timestamp: number;
  retryCount: number;
  consumerTag: string;
}

/**
 * DTO для результата обработки
 */
export interface ConsumeResult {
  success: boolean;
  messageId: string;
  error?: Error;
  processingTime: number;
  metadata: ConsumeMetadata;
}

/**
 * DTO для остановки потребления
 */
export interface StopConsumeDTO {
  queue: string;
  consumerTag?: string;
}

/**
 * Создание метаданных из сообщения
 */
export function createConsumeMetadata(
  message: RabbitMQMessage,
  queue: string,
  consumerTag: string,
): ConsumeMetadata {
  return {
    queue,
    routingKey: message.fields.routingKey,
    exchange: message.fields.exchange,
    messageId: message.properties.messageId || 'unknown',
    correlationId: message.properties.correlationId,
    deliveryTag: message.fields.deliveryTag,
    redelivered: message.fields.redelivered,
    timestamp: message.properties.timestamp || Date.now(),
    retryCount: (message.properties.headers?.retryCount as number) || 0,
    consumerTag,
  };
}
