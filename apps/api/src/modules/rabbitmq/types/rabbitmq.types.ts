export type ExchangeType = 'direct' | 'topic' | 'fanout' | 'headers';
export type QueueType = 'classic' | 'quorum' | 'stream';

export interface MessageHeaders {
  [key: string]: any;
}

export interface MessageProperties {
  messageId?: string;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  priority?: number;
  persistent?: boolean;
  contentType?: string;
  contentEncoding?: string;
  headers?: MessageHeaders;
  timestamp?: number;
  type?: string;
  userId?: string;
  appId?: string;
  clusterId?: string;
}

export interface RabbitMQMessage<T = any> {
  content: T;
  properties: MessageProperties;
  fields: {
    consumerTag: string;
    deliveryTag: number;
    redelivered: boolean;
    exchange: string;
    routingKey: string;
  };
  timestamp: number;
}

export interface PublishOptions {
  routingKey: string;
  messageId?: string;
  correlationId?: string;
  replyTo?: string;
  expiration?: string;
  priority?: number;
  persistent?: boolean;
  headers?: MessageHeaders;
  timestamp?: number;
  type?: string;
}

/** Метаданные, которые RabbitMQConsumer передаёт обработчику вторым аргументом */
export interface ConsumedMessageMetadata {
  queue: string;
  routingKey: string;
  exchange: string;
  messageId?: string;
  correlationId?: string;
  deliveryTag: number;
  redelivered: boolean;
  timestamp: number;
  consumerTag: string;
  retryCount: number;
}

/** Обработчик получает уже распарсенный JSON-контент и метаданные */
export type MessageHandler<T = unknown> = (
  content: T,
  metadata: ConsumedMessageMetadata,
) => Promise<void> | void;

export interface ConsumeOptions {
  queue: string;
  routingKey: string;
  handler: MessageHandler;
  noAck?: boolean;
  prefetch?: number;
}

export interface QueueDefinition {
  name: string;
  routingKey: string;
  durable?: boolean;
  autoDelete?: boolean;
  exclusive?: boolean;
  queueType?: QueueType;
  arguments?: Record<string, any>;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  maxPriority?: number;
  ttl?: number;
}

export interface ExchangeDefinition {
  name: string;
  type: ExchangeType;
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: Record<string, any>;
}

export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  DEAD_LETTER = 'dead_letter',
}

export interface MessageMetadata {
  messageId: string;
  queue: string;
  routingKey: string;
  timestamp: number;
  status: MessageStatus;
  retryCount: number;
  error?: string;
  processingTime?: number;
}
