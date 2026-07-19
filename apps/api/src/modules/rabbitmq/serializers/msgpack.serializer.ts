import { RabbitMQSerializer } from './rabbitmq.serializer';

export class MsgPackSerializer<T = any> extends RabbitMQSerializer<T> {
  private readonly msgpack: any;

  constructor() {
    super();
    try {
      this.msgpack = require('msgpack-lite');
    } catch {
      throw new Error(
        'msgpack-lite не установлен. Установите: pnpm add msgpack-lite',
      );
    }
  }

  serialize(data: T): Buffer {
    return this.msgpack.encode(data);
  }

  deserialize(buffer: Buffer): T {
    return this.msgpack.decode(buffer);
  }
}
