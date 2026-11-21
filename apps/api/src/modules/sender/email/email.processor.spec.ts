import { render } from 'react-email';

import { EmailProcessor } from './email.processor';

jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class WorkerHost {},
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
}));
jest.mock('react-email', () => ({
  render: jest.fn(() => Promise.resolve('<html>rendered</html>')),
}));
jest.mock('emails/templates/verification-email', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('emails/templates/invoice-email', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('emails/i18n', () => ({ t: (key: string) => key }));
jest.mock('./email.service', () => ({ EmailService: class {} }));

describe('EmailProcessor', () => {
  const emailService = { sendEmail: jest.fn() };
  const config = { get: jest.fn() };
  const processor = new EmailProcessor(emailService as never, config as never);

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockReturnValue('https://app.test');
    (render as jest.Mock).mockResolvedValue('<html>rendered</html>');
  });

  it('send-verification-email: renders and sends through the provider', async () => {
    await processor.process({
      name: 'send-verification-email',
      data: { email: 'a@test.dev', token: 'tok', locale: 'en' },
    } as never);

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: 'a@test.dev',
      subject: 'Confirm your email address',
      html: '<html>rendered</html>',
    });
  });

  it('uses the Ukrainian subject for locale uk', async () => {
    await processor.process({
      name: 'send-verification-email',
      data: { email: 'a@test.dev', token: 'tok', locale: 'uk' },
    } as never);

    expect(emailService.sendEmail.mock.calls[0][0].subject).toBe(
      'Підтвердьте ваш email',
    );
  });

  it('send-invoice-email: sends the thank-you letter', async () => {
    await processor.process({
      name: 'send-invoice-email',
      data: {
        email: 'a@test.dev',
        invoiceNumber: 'INV-1',
        amount: 500,
        currency: 'usd',
        pdfUrl: 'https://s3/x.pdf',
        locale: 'en',
      },
    } as never);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@test.dev',
        subject: 'Thank you for payment',
      }),
    );
  });

  it('a provider failure fails the job so BullMQ retries it', async () => {
    emailService.sendEmail.mockRejectedValue(new Error('provider 500'));

    await expect(
      processor.process({
        name: 'send-verification-email',
        data: { email: 'a@test.dev', token: 'tok', locale: 'en' },
      } as never),
    ).rejects.toThrow('provider 500');
  });

  it('unknown job names are rejected', async () => {
    await expect(
      processor.process({ name: 'nope', data: {} } as never),
    ).rejects.toThrow('Unknown job: nope');
  });
});
