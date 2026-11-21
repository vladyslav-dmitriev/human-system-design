import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

import { MAX_IMAGE_SIZE_BYTES, toImageUpload } from './image-upload';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Минимальный валидный PNG 1x1: сигнатура + IHDR + IDAT + IEND. */
const png = () =>
  Buffer.concat([
    PNG_SIGNATURE,
    Buffer.from('0000000d49484452', 'hex'),
    Buffer.from('00000001000000010806000000', 'hex'),
    Buffer.from('1f15c489', 'hex'),
    Buffer.from('0000000a49444154789c6300010000050001', 'hex'),
    Buffer.from('0d0a2db4', 'hex'),
    Buffer.from('0000000049454e44ae426082', 'hex'),
  ]);

const jpeg = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00'),
    Buffer.alloc(32),
  ]);

const webp = () =>
  Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x1a, 0, 0, 0]),
    Buffer.from('WEBPVP8 '),
    Buffer.alloc(32),
  ]);

const file = (buffer: Buffer, extra: Record<string, unknown> = {}) =>
  ({
    buffer,
    size: buffer.length,
    mimetype: 'image/png',
    originalname: 'a.png',
    ...extra,
  }) as Express.Multer.File;

describe('toImageUpload', () => {
  it.each([
    ['png', png, 'image/png'],
    ['jpg', jpeg, 'image/jpeg'],
    ['webp', webp, 'image/webp'],
  ])('accepts a real %s and names it by detected type', (ext, make, mime) => {
    const result = toImageUpload(file(make()), 'todos');

    expect(result.contentType).toBe(mime);
    expect(result.fileName).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${ext}$`));
    expect(result.folder).toBe('todos');
  });

  it('ignores the client file name and mimetype (name is generated)', () => {
    const result = toImageUpload(
      file(png(), { originalname: '../../evil.php', mimetype: 'text/html' }),
      'todos',
    );

    expect(result.fileName).not.toContain('evil');
    expect(result.fileName.endsWith('.png')).toBe(true);
  });

  it.each([
    [
      'an HTML payload disguised as png',
      Buffer.from('<html><script>alert(1)</script>'),
    ],
    [
      'SVG (can carry scripts)',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    ],
    ['GIF', Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;')],
    ['a PDF', Buffer.from('%PDF-1.4\n%....\n')],
    ['RIFF that is not WebP (WAV)', Buffer.from('RIFF\x1a\0\0\0WAVEfmt ')],
    ['a truncated PNG signature', PNG_SIGNATURE.subarray(0, 7)],
  ])('rejects %s', (_name, buffer) => {
    expect(() => toImageUpload(file(buffer), 'todos')).toThrow(
      BadRequestException,
    );
  });

  it('rejects an ASF payload (file-type@16 looped on it) fast, without parsing', () => {
    const asfGuid = Buffer.from('3026b2758e66cf11a6d900aa0062ce6c', 'hex');
    const payload = Buffer.concat([asfGuid, Buffer.alloc(60 - asfGuid.length)]);
    const started = Date.now();

    expect(() => toImageUpload(file(payload), 'todos')).toThrow(
      BadRequestException,
    );
    expect(Date.now() - started).toBeLessThan(100);
  });

  it('rejects a missing or empty file', () => {
    expect(() => toImageUpload(undefined, 'todos')).toThrow(
      BadRequestException,
    );
    expect(() => toImageUpload(file(Buffer.alloc(0)), 'todos')).toThrow(
      BadRequestException,
    );
  });

  it('a file over 5 MB gives 413 even if it is a valid PNG', () => {
    const big = Buffer.concat([png(), Buffer.alloc(MAX_IMAGE_SIZE_BYTES)]);

    expect(() => toImageUpload(file(big), 'todos')).toThrow(
      PayloadTooLargeException,
    );
  });

  it('a file of exactly 5 MB is accepted', () => {
    const head = png();
    const exact = Buffer.concat([
      head,
      Buffer.alloc(MAX_IMAGE_SIZE_BYTES - head.length),
    ]);

    expect(exact.length).toBe(MAX_IMAGE_SIZE_BYTES);
    expect(toImageUpload(file(exact), 'todos')).toBeDefined();
  });
});
