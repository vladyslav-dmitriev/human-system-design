import { RabbitMQSerializer } from './rabbitmq.serializer';

export class JsonSerializer<T = any> extends RabbitMQSerializer<T> {
  serialize(data: T): Buffer {
    return Buffer.from(JSON.stringify(data));
  }

  deserialize(buffer: Buffer): T {
    return JSON.parse(buffer.toString()) as T;
  }
}
