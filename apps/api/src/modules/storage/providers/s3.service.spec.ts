import { InternalServerErrorException } from '@nestjs/common';

import { S3Client } from '@aws-sdk/client-s3';

import { S3StorageService } from './s3.service';

const send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send })),
  PutObjectCommand: jest.fn((input: unknown) => ({ input })),
}));

const env: Record<string, string | undefined> = {
  AWS_REGION: 'eu-central-1',
  AWS_ACCESS_KEY_ID: 'AKIATEST',
  AWS_SECRET_ACCESS_KEY: 'secret',
  AWS_S3_BUCKET_NAME: 'bucket',
};

const build = (e: Record<string, string | undefined> = env) =>
  new S3StorageService({ get: (k: string) => e[k] } as never);

describe('S3StorageService', () => {
  beforeEach(() => send.mockReset());

  it.each(Object.keys(env))('refuses to start without %s', (key) => {
    expect(() => build({ ...env, [key]: undefined })).toThrow();
  });

  it('uploads to <folder>/<fileName> and returns the public url', async () => {
    send.mockResolvedValue({});
    const file = Buffer.from('img');

    const url = await build().upload({
      file,
      fileName: 'a.png',
      folder: 'todos',
      contentType: 'image/png',
    });

    expect(url).toBe(
      'https://bucket.s3.eu-central-1.amazonaws.com/todos/a.png',
    );
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'bucket',
      Key: 'todos/a.png',
      Body: file,
      ContentType: 'image/png',
      ContentLength: 3,
    });
  });

  it('R2: passes the endpoint and returns a link on the public base URL', async () => {
    send.mockResolvedValue({});

    const url = await build({
      ...env,
      AWS_REGION: 'auto',
      AWS_S3_ENDPOINT: 'https://acc.r2.cloudflarestorage.com',
      AWS_S3_PUBLIC_URL: 'https://files.test.dev/',
    }).upload({ file: Buffer.from('x'), fileName: 'a.png', folder: 'todos' });

    expect(url).toBe('https://files.test.dev/todos/a.png');
    expect(S3Client).toHaveBeenLastCalledWith(
      expect.objectContaining({
        region: 'auto',
        endpoint: 'https://acc.r2.cloudflarestorage.com',
        forcePathStyle: true,
      }),
    );
  });

  it('without R2 variables the client gets no endpoint and the link is AWS-style', () => {
    build();

    expect(S3Client).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ endpoint: expect.anything() }),
    );
  });

  it('hides S3 error details behind a generic 500', async () => {
    send.mockRejectedValue(new Error('AccessDenied: arn:aws:secret'));

    const err = await build()
      .upload({ file: Buffer.from('x'), fileName: 'a.png', folder: 'f' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(InternalServerErrorException);
    expect(JSON.stringify((err as Error).message)).not.toContain('arn:aws');
  });
});
