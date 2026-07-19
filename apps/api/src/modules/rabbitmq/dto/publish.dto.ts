import { MessageProperties } from '../types/rabbitmq.types';

/**
 * DTO для публикации сообщения
 */
export interface PublishDTO<T = any> {
  routingKey: string;
  message: T;
  exchange?: string;
  messageId?: string;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  priority?: number;
  persistent?: boolean;
  headers?: Record<string, any>;
  timestamp?: number;
  type?: string;
}

/**
 * DTO для отложенной публикации
 */
export interface DelayedPublishDTO<T = any> extends PublishDTO<T> {
  delayMs: number;
}

/**
 * DTO для RPC запроса
 */
export interface RPCPublishDTO<T = any> extends PublishDTO<T> {
  timeout?: number;
  expectedResponse?: string;
}

/**
 * Валидация PublishDTO
 */
export function validatePublishDTO(dto: PublishDTO): void {
  if (!dto.routingKey) {
    throw new Error('routingKey is required');
  }

  if (!dto.message) {
    throw new Error('message is required');
  }

  if (dto.expiration && isNaN(parseInt(dto.expiration))) {
    throw new Error('expiration must be a valid number');
  }

  if (dto.priority && (dto.priority < 0 || dto.priority > 10)) {
    throw new Error('priority must be between 0 and 10');
  }
}

/**
 * Преобразование PublishDTO в опции публикации
 */
export function toPublishOptions(dto: PublishDTO): {
  routingKey: string;
  options: Partial<MessageProperties>;
} {
  return {
    routingKey: dto.routingKey,
    options: {
      messageId: dto.messageId,
      correlationId: dto.correlationId,
      replyTo: dto.replyTo,
      expiration: dto.expiration,
      priority: dto.priority,
      persistent: dto.persistent,
      headers: dto.headers,
      timestamp: dto.timestamp || Date.now(),
      type: dto.type,
    },
  };
}
