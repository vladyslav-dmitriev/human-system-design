import { Logger } from '@nestjs/common';

import { CaptchaService } from './captcha.service';

describe('CaptchaService', () => {
  const config = (value: string | undefined) =>
    ({ get: jest.fn().mockReturnValue(value) }) as never;

  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  const respond = (body: unknown) =>
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(body) });

  it('throws on construction when the secret is missing', () => {
    expect(() => new CaptchaService(config(undefined))).toThrow(
      'GOOGLE_CAPTCHA_SECRET_KEY is not defined',
    );
  });

  it('posts secret, token and ip to the reCAPTCHA endpoint', async () => {
    respond({ success: true, score: 0.9 });
    const service = new CaptchaService(config('s3cret'));

    await expect(service.verify('tok', '1.2.3.4')).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body);

    expect(url).toBe('https://www.google.com/recaptcha/api/siteverify');
    expect(init.method).toBe('POST');
    expect(body.get('secret')).toBe('s3cret');
    expect(body.get('response')).toBe('tok');
    expect(body.get('remoteip')).toBe('1.2.3.4');
  });

  it.each([
    [{ success: true, score: 0.5 }, true],
    [{ success: true, score: 0.49 }, false],
    [{ success: true, score: 0 }, false],
    [{ success: true }, false],
    [{ success: false, score: 0.9 }, false],
    [{ success: false }, false],
  ])('treats %j as valid=%s (threshold 0.5)', async (payload, expected) => {
    respond(payload);
    const service = new CaptchaService(config('k'));

    await expect(service.verify('tok')).resolves.toBe(expected);
  });

  it('fails closed when the network call fails', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    const service = new CaptchaService(config('k'));

    await expect(service.verify('tok')).resolves.toBe(false);
  });

  it('fails closed when Google returns a non-JSON body', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.reject(new SyntaxError('bad json')),
    });
    const service = new CaptchaService(config('k'));

    await expect(service.verify('tok')).resolves.toBe(false);
  });
});
