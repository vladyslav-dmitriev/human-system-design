import { formatProviderError } from './provider-error';

describe('formatProviderError', () => {
  it('Resend: code, status and message', () => {
    expect(
      formatProviderError('resend', {
        name: 'validation_error',
        statusCode: 403,
        message: 'The domain is not verified',
      }),
    ).toBe(
      'Error sending email via resend [validation_error 403]: The domain is not verified',
    );
  });

  it('SendGrid: takes the reason from response.body.errors', () => {
    const error = Object.assign(new Error('Forbidden'), {
      name: 'ResponseError',
      code: 403,
      response: {
        body: { errors: [{ message: 'The from address does not match' }] },
      },
    });

    expect(formatProviderError('sendgrid', error)).toBe(
      'Error sending email via sendgrid [ResponseError 403]: The from address does not match',
    );
  });

  it('network error without status', () => {
    const error = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    });

    expect(formatProviderError('resend', error)).toBe(
      'Error sending email via resend [ECONNRESET]: socket hang up',
    );
  });

  it('does not leak recipient addresses and truncates long text', () => {
    const text = formatProviderError('resend', {
      name: 'validation_error',
      statusCode: 422,
      message: `Invalid to: user@example.com ${'x'.repeat(1000)}`,
    });

    expect(text).not.toContain('user@example.com');
    expect(text).toContain('<email>');
    expect(text.length).toBeLessThan(400);
  });

  it('unknown thrown value', () => {
    expect(formatProviderError('resend', undefined)).toBe(
      'Error sending email via resend',
    );
    expect(formatProviderError('resend', 'boom')).toBe(
      'Error sending email via resend: boom',
    );
  });
});
