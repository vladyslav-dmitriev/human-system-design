import { EmailConsumer } from './email.consumer';

jest.mock('./rabbitmq.consumer', () => ({
  RabbitMQConsumer: class {
    protected logger = { info: jest.fn(), error: jest.fn() };
  },
}));
jest.mock('../managers/connection.manager', () => ({
  RabbitMQConnection: class {},
}));
jest.mock('../rabbitmq.config', () => ({ RabbitMQConfig: class {} }));

describe('EmailConsumer', () => {
  it('does not log the whole message (address, token, body)', () => {
    const consumer = new EmailConsumer({} as never, {} as never);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = (consumer as any).logger as { info: jest.Mock };

    (consumer as any).handleEmail(
      { to: 'victim@example.test', token: 'secret-token', html: '<b>hi</b>' },
      { queue: 'q', routingKey: 'email.high', messageId: 'm1' },
    );

    const logged = JSON.stringify([logger.info.mock.calls, log.mock.calls]);

    expect(log).not.toHaveBeenCalled();
    expect(logged).not.toContain('victim@example.test');
    expect(logged).not.toContain('secret-token');
    log.mockRestore();
  });
});
