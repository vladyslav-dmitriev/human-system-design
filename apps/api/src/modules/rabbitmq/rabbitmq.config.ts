export interface RabbitMQConfig {
  url: string;
  exchange: string;
  exchangeType: 'direct' | 'topic' | 'fanout' | 'headers';
  prefetch: number;
  reconnectInterval: number;
  maxRetries: number;
  retryDelay: number;
  heartbeat?: number;
  connectionTimeout?: number;
  queueType?: 'classic' | 'quorum' | 'stream';
  useDeadLetter?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
}

export interface RabbitMQConfigOptions {
  environment?: 'development' | 'production' | 'test';
  customConfig?: Partial<RabbitMQConfig>;
}

const defaultConfig: RabbitMQConfig = {
  url: 'amqp://admin:admin123@localhost:5672',
  exchange: 'app.exchange',
  exchangeType: 'topic',
  prefetch: 1,
  reconnectInterval: 5000,
  maxRetries: 5,
  retryDelay: 5000,
  heartbeat: 30,
  connectionTimeout: 10000,
  queueType: 'quorum',
  useDeadLetter: true,
  deadLetterExchange: 'dlx_exchange',
  deadLetterRoutingKey: 'dead.letter',
};

const envConfigs: Record<string, Partial<RabbitMQConfig>> = {
  development: {
    url: 'amqp://guest:guest@localhost:5672',
    prefetch: 1,
    maxRetries: 3,
  },
  production: {
    url: process.env.RABBITMQ_URL || 'amqp://user:pass@rabbitmq:5672',
    prefetch: 5,
    maxRetries: 3,
    reconnectInterval: 10000,
  },
  test: {
    url: 'amqp://guest:guest@localhost:5672',
    prefetch: 1,
    maxRetries: 1,
    reconnectInterval: 1000,
  },
};

export function loadRabbitMQConfig(
  options?: RabbitMQConfigOptions,
): RabbitMQConfig {
  const environment =
    options?.environment || process.env.NODE_ENV || 'development';
  const envConfig = envConfigs[environment] || {};

  return {
    ...defaultConfig,
    ...envConfig,
    ...options?.customConfig,
  };
}
