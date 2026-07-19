import { IRabbitMQSerializer } from '../types/rabbitmq.interfaces';

export abstract class RabbitMQSerializer<T> implements IRabbitMQSerializer<T> {
  abstract serialize(data: T): Buffer;
  abstract deserialize(buffer: Buffer): T;
}
