import { ExchangeType } from './rabbitmq.types';

export interface ExchangeDefinition {
  name: string;
  type: ExchangeType;
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: Record<string, any>;
  description?: string;
}

export interface ExchangeConfig extends ExchangeDefinition {
  bindings?: BindingDefinition[];
  deadLetterExchange?: string;
  alternateExchange?: string;
}

export interface BindingDefinition {
  sourceExchange: string;
  destinationQueue: string;
  routingKey: string;
  arguments?: Record<string, any>;
  description?: string;
}

export const ExchangeTypes = {
  DIRECT: 'direct' as const,
  TOPIC: 'topic' as const,
  FANOUT: 'fanout' as const,
  HEADERS: 'headers' as const,
} as const;

export interface ExchangeArguments {
  'alternate-exchange'?: string;
  'x-delayed-type'?: string;
  'x-queue-mode'?: 'default' | 'lazy';
  'x-queue-type'?: 'classic' | 'quorum' | 'stream';
  'x-max-length'?: number;
  'x-max-length-bytes'?: number;
  'x-overflow'?: 'drop-head' | 'reject-publish' | 'reject-publish-dlx';
  'x-expires'?: number;
  'x-message-ttl'?: number;
  'x-dead-letter-exchange'?: string;
  'x-dead-letter-routing-key'?: string;
  'x-single-active-consumer'?: boolean;
  'x-max-priority'?: number;
}
