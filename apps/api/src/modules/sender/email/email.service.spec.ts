import { EmailService, verificationCooldownKey } from './email.service';

jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));
jest.mock('../../redis', () => ({ REDIS_CLIENT: 'REDIS_CLIENT' }));

describe('EmailService', () => {
  const provider = { sendEmail: jest.fn() };
  const queue = { add: jest.fn() };
  const redis = { set: jest.fn(), del: jest.fn() };
  const service = new EmailService(provider, queue as never, redis as never);

  beforeEach(() => {
    jest.resetAllMocks();
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
  });

  it('sendEmail goes straight to the configured provider (used by the queue processor)', async () => {
    const message = { to: 'a@test.dev', subject: 's', html: '<p/>' };

    await service.sendEmail(message);

    expect(provider.sendEmail).toHaveBeenCalledWith(message);
  });

  describe('sendVerificationEmail', () => {
    const params = { email: 'a@test.dev', token: 'tok' };

    it('puts a job into email-queue and does not call the provider inline', async () => {
      await service.sendVerificationEmail(params, 'uk');

      expect(queue.add).toHaveBeenCalledWith(
        'send-verification-email',
        { email: 'a@test.dev', token: 'tok', locale: 'uk' },
        { removeOnComplete: true },
      );
      expect(provider.sendEmail).not.toHaveBeenCalled();
    });

    it('a repeated request inside the cooldown (register + web call) queues one email', async () => {
      redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

      await service.sendVerificationEmail(params, 'en');
      await service.sendVerificationEmail(params, 'en');

      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        verificationCooldownKey('a@test.dev'),
        '1',
        'EX',
        60,
        'NX',
      );
    });

    it('the cooldown key does not contain the plain address', () => {
      expect(verificationCooldownKey('a@test.dev')).not.toContain('a@test.dev');
    });

    it('a failed enqueue releases the cooldown and propagates', async () => {
      queue.add.mockRejectedValue(new Error('redis down'));

      await expect(service.sendVerificationEmail(params, 'en')).rejects.toThrow(
        'redis down',
      );
      expect(redis.del).toHaveBeenCalledWith(
        verificationCooldownKey('a@test.dev'),
      );
    });
  });

  it('sendInvoiceEmail uses one jobId per invoice number (no duplicate letters)', async () => {
    await service.sendInvoiceEmail({
      email: 'a@test.dev',
      invoiceNumber: 'INV-2026-1001',
      amount: 500,
      currency: 'usd',
      pdfUrl: 'https://s3/x.pdf',
      locale: 'en',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'send-invoice-email',
      expect.objectContaining({ invoiceNumber: 'INV-2026-1001' }),
      { jobId: 'invoice-email-INV-2026-1001' },
    );
  });
});
