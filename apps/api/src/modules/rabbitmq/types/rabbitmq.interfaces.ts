import { Channel, Connection, Message } from 'amqplib';
import {
  PublishOptions,
  ConsumeOptions,
  ExchangeDefinition,
} from './rabbitmq.types';
import { RabbitMQConfig } from '../rabbitmq.config';

export interface IRabbitMQConnection {
  connect(): Promise<Connection>;
  getChannel(): Promise<Channel>;
  close(): Promise<void>;
  getConnected(): boolean;
  reconnect(): Promise<void>;
}

export interface IRabbitMQProducer {
  publish<T>(
    routingKey: string,
    message: T,
    options?: Partial<PublishOptions>,
  ): Promise<boolean>;
  publishWithRetry<T>(
    routingKey: string,
    message: T,
    maxAttempts?: number,
  ): Promise<boolean>;
  publishDelayed<T>(
    routingKey: string,
    message: T,
    delayMs: number,
  ): Promise<boolean>;
  close(): Promise<void>;
}

export interface IRabbitMQConsumer {
  register(options: ConsumeOptions): Promise<void>;
  registerAll(): Promise<void>;
  stop(queue: string): Promise<void>;
  stopAll(): Promise<void>;
  pause(queue: string): Promise<void>;
  resume(queue: string): Promise<void>;
}

export interface IRabbitMQQueueManager {
  assertQueue(queueName: string, options?: any): Promise<void>;
  assertExchange(exchange: ExchangeDefinition): Promise<void>;
  bindQueue(
    queueName: string,
    exchange: string,
    routingKey: string,
  ): Promise<void>;
  deleteQueue(queueName: string): Promise<void>;
  purgeQueue(queueName: string): Promise<void>;
  getQueueInfo(
    queueName: string,
  ): Promise<{ messageCount: number; consumerCount: number }>;
}

export interface IRabbitMQSerializer<T = any> {
  serialize(data: T): Buffer;
  deserialize(buffer: Buffer): T;
}

export interface IRabbitMQErrorHandler {
  handleError(message: Message, error: Error, channel: Channel): Promise<void>;
  handleConsumerError(
    message: Message,
    error: Error,
    channel: Channel,
  ): Promise<void>;
  handleProducerError(error: Error): void;
}

export interface IRabbitMQHealth {
  check(): Promise<{ status: 'up' | 'down'; details: any }>;
  getMetrics(): Promise<{
    connectionStatus: boolean;
    activeConsumers: number;
    queuedMessages: number;
    totalProcessed: number;
    errors: number;
  }>;
}

export interface IRabbitMQService {
  init(): Promise<void>;
  shutdown(): Promise<void>;
  getConnection(): IRabbitMQConnection;
  getProducer(): IRabbitMQProducer;
  getConsumer(): IRabbitMQConsumer;
  getQueueManager(): IRabbitMQQueueManager;
  getHealth(): IRabbitMQHealth;
  getConfig(): RabbitMQConfig;
}
