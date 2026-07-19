/**
 * DTO для сообщения
 */
export interface MessageDTO<T = any> {
  id: string;
  content: T;
  routingKey: string;
  exchange: string;
  timestamp: number;
  priority?: number;
  headers?: Record<string, any>;
  metadata: MessageMetadataDTO;
}

/**
 * Метаданные сообщения
 */
export interface MessageMetadataDTO {
  publishedAt: number;
  deliveredAt?: number;
  processedAt?: number;
  retryCount: number;
  status: 'pending' | 'delivered' | 'processed' | 'failed';
  consumerTag?: string;
  error?: string;
}

/**
 * Создание DTO сообщения
 */
export function createMessageDTO<T>(
  id: string,
  content: T,
  routingKey: string,
  exchange: string,
): MessageDTO<T> {
  return {
    id,
    content,
    routingKey,
    exchange,
    timestamp: Date.now(),
    metadata: {
      publishedAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    },
  };
}

/**
 * Обновление статуса сообщения
 */
export function updateMessageStatus(
  message: MessageDTO,
  status: MessageMetadataDTO['status'],
  error?: string,
): MessageDTO {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      status,
      error,
      processedAt:
        status === 'processed' || status === 'failed' ? Date.now() : undefined,
    },
  };
}
