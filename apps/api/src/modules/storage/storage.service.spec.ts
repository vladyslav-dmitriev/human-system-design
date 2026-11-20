import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('delegates upload to the provider and returns its url', async () => {
    const provider = { upload: jest.fn().mockResolvedValue('https://x/y.png') };
    const params = {
      file: Buffer.from('a'),
      fileName: 'y.png',
      folder: 'todos',
      contentType: 'image/png',
    };

    await expect(new StorageService(provider).upload(params)).resolves.toBe(
      'https://x/y.png',
    );
    expect(provider.upload).toHaveBeenCalledWith(params);
  });

  it('propagates provider errors', async () => {
    const provider = { upload: jest.fn().mockRejectedValue(new Error('s3')) };

    await expect(
      new StorageService(provider).upload({
        file: Buffer.alloc(0),
        folder: 'f',
      }),
    ).rejects.toThrow('s3');
  });
});
