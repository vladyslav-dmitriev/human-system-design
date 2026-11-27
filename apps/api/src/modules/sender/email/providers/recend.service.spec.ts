import { RecendService } from './recend.service';

const send = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe('RecendService', () => {
  const config = {
    get: (key: string) =>
      ({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'App <no-reply@test.dev>' })[
        key
      ],
  };
  const service = new RecendService(config as never);
  const message = { to: 'a@test.dev', subject: 's', html: '<p>h</p>' };

  beforeEach(() => send.mockReset());

  it('sends with the default sender', async () => {
    send.mockResolvedValue({ data: { id: '1' }, error: null });

    await service.sendEmail(message);

    expect(send).toHaveBeenCalledWith({
      from: 'App <no-reply@test.dev>',
      ...message,
    });
  });

  it('fails when Resend returns an error instead of throwing', async () => {
    send.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        statusCode: 403,
        message: 'domain not verified',
      },
    });

    await expect(service.sendEmail(message)).rejects.toThrow(
      'Error sending email via resend [validation_error 403]: domain not verified',
    );
  });

  it('wraps a thrown network error and keeps it as cause', async () => {
    const cause = new Error('socket hang up');
    send.mockRejectedValue(cause);

    await expect(service.sendEmail(message)).rejects.toMatchObject({
      message: 'Error sending email via resend: socket hang up',
      cause,
    });
  });
});
