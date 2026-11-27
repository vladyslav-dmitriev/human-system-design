import { RabbitMQConsumer } from './rabbitmq.consumer';
import { QUEUES } from '../constants/queues.constants';

jest.mock('../utils/rabbitmq.logger', () => ({
  RabbitMQLogger: class {
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
    debug = jest.fn();
  },
}));

const makeChannel = () => ({
  prefetch: jest.fn().mockResolvedValue(undefined),
  checkQueue: jest.fn(),
  assertQueue: jest.fn().mockResolvedValue({ queue: 'q' }),
  bindQueue: jest.fn().mockResolvedValue(undefined),
  consume: jest.fn().mockResolvedValue({ consumerTag: 'tag-1' }),
});

const setup = () => {
  const channel = makeChannel();
  const connection = { getChannel: jest.fn().mockResolvedValue(channel) };
  const consumer = new RabbitMQConsumer(
    connection as never,
    {
      exchange: 'ex',
    } as never,
  );
  return { channel, consumer };
};

describe('RabbitMQConsumer.register', () => {
  it('объявляет очередь через assertQueue и не вызывает checkQueue (404 закрывает канал)', async () => {
    const { channel, consumer } = setup();
    const def = Object.values(QUEUES)[0];

    await consumer.register({
      queue: def.name,
      routingKey: def.routingKey,
      handler: jest.fn(),
    });

    expect(channel.checkQueue).not.toHaveBeenCalled();
    expect(channel.assertQueue).toHaveBeenCalledWith(
      def.name,
      expect.objectContaining({ durable: def.durable ?? true }),
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      def.name,
      'ex',
      def.routingKey,
    );
    expect(consumer.isActive(def.name)).toBe(true);
  });

  it('для очереди без определения берёт quorum-очередь по умолчанию', async () => {
    const { channel, consumer } = setup();

    await consumer.register({
      queue: 'custom.queue',
      routingKey: 'custom',
      handler: jest.fn(),
    });

    expect(channel.assertQueue).toHaveBeenCalledWith('custom.queue', {
      durable: true,
      arguments: { 'x-queue-type': 'quorum', 'x-max-priority': 5 },
    });
  });

  it('ошибку assertQueue пробрасывает наверх', async () => {
    const { channel, consumer } = setup();
    channel.assertQueue.mockRejectedValue(new Error('boom'));

    await expect(
      consumer.register({ queue: 'q', routingKey: 'k', handler: jest.fn() }),
    ).rejects.toThrow('boom');
    expect(channel.consume).not.toHaveBeenCalled();
  });
});
