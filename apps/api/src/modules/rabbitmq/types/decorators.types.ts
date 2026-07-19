/**
 * Типы для декораторов RabbitMQ
 */

/**
 * Декоратор для обработчика сообщений
 */
export interface MessageHandlerConfig {
  queue: string;
  routingKey: string;
  exchange?: string;
  concurrency?: number;
  noAck?: boolean;
  priority?: number;
}

/**
 * Декоратор для продюсера
 */
export interface ProducerConfig {
  exchange?: string;
  defaultRoutingKey?: string;
  persistent?: boolean;
}

/**
 * Декоратор для метода
 */
export interface MethodConfig {
  routingKey: string;
  exchange?: string;
  retryOnError?: boolean;
  maxRetries?: number;
}

/**
 * Метаданные декоратора
 */
export interface HandlerMetadata {
  target: any;
  methodName: string;
  config: MessageHandlerConfig;
  method: Function;
}

/**
 * Метаданные продюсера
 */
export interface ProducerMetadata {
  target: any;
  config: ProducerConfig;
  methods: MethodMetadata[];
}

/**
 * Метаданные метода
 */
export interface MethodMetadata {
  methodName: string;
  config: MethodConfig;
  method: Function;
}
