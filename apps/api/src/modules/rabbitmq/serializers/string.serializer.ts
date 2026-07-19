import { RabbitMQSerializer } from './rabbitmq.serializer';

export class StringSerializer<T extends string> extends RabbitMQSerializer<T> {
  serialize(data: T): Buffer {
    return Buffer.from(data);
  }

  deserialize(buffer: Buffer): T {
    return buffer.toString() as T;
  }
}
