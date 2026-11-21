/** Валидные по сигнатуре картинки для тестов загрузки (file-type определяет тип по первым байтам). */

const pad = (head: Buffer, size?: number) =>
  size && size > head.length
    ? Buffer.concat([head, Buffer.alloc(size - head.length)])
    : head;

/** PNG: 8-байтная сигнатура + чанк IHDR (1x1) + IEND; добивается нулями до `size`. */
export const pngBuffer = (size?: number) =>
  pad(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('0000000d49484452', 'hex'),
      Buffer.from('00000001000000010806000000', 'hex'),
      Buffer.from('1f15c489', 'hex'),
      Buffer.from('0000000049454e44ae426082', 'hex'),
    ]),
    size,
  );

export const jpegBuffer = (size?: number) =>
  pad(
    Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      Buffer.from('JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00'),
      Buffer.alloc(32),
    ]),
    size,
  );

export const webpBuffer = (size?: number) =>
  pad(
    Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x1a, 0, 0, 0]),
      Buffer.from('WEBPVP8 '),
      Buffer.alloc(32),
    ]),
    size,
  );

export const gifBuffer = () =>
  Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;');
export const svgBuffer = () =>
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
