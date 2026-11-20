import { ForbiddenException, type ExecutionContext } from '@nestjs/common';

import { CaptchaGuard } from './captcha.guard';

const ctx = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('CaptchaGuard', () => {
  const captchaService = { verify: jest.fn() };
  const guard = new CaptchaGuard(captchaService as never);

  beforeEach(() => captchaService.verify.mockReset());

  it('rejects when no token is provided and does not call the service', async () => {
    await expect(
      guard.canActivate(ctx({ body: {}, headers: {} })),
    ).rejects.toThrow(new ForbiddenException('Captcha token is missing'));
    expect(captchaService.verify).not.toHaveBeenCalled();
  });

  it('rejects when the body is undefined', async () => {
    await expect(
      guard.canActivate(ctx({ body: undefined, headers: {} })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a body token and passes the client ip', async () => {
    captchaService.verify.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        ctx({ body: { captchaToken: 'b' }, headers: {}, ip: '9.9.9.9' }),
      ),
    ).resolves.toBe(true);
    expect(captchaService.verify).toHaveBeenCalledWith('b', '9.9.9.9');
  });

  it('accepts the x-captcha-token header', async () => {
    captchaService.verify.mockResolvedValue(true);

    await guard.canActivate(
      ctx({ body: {}, headers: { 'x-captcha-token': 'h' } }),
    );

    expect(captchaService.verify).toHaveBeenCalledWith('h', undefined);
  });

  it('uses the first value of a repeated header', async () => {
    captchaService.verify.mockResolvedValue(true);

    await guard.canActivate(
      ctx({ body: {}, headers: { 'x-captcha-token': ['h1', 'h2'] } }),
    );

    expect(captchaService.verify).toHaveBeenCalledWith('h1', undefined);
  });

  it('prefers the body token over the header', async () => {
    captchaService.verify.mockResolvedValue(true);

    await guard.canActivate(
      ctx({
        body: { captchaToken: 'body' },
        headers: { 'x-captcha-token': 'header' },
      }),
    );

    expect(captchaService.verify).toHaveBeenCalledWith('body', undefined);
  });

  it('rejects an invalid token', async () => {
    captchaService.verify.mockResolvedValue(false);

    await expect(
      guard.canActivate(ctx({ body: { captchaToken: 'x' }, headers: {} })),
    ).rejects.toThrow(new ForbiddenException('Invalid captcha token'));
  });
});
