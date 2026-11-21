import { randomUUID } from 'node:crypto';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// +1 байт: multer режет файл строго по лимиту, а точная проверка (413) ниже
export const IMAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES + 1, files: 1 },
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Тип по первым 12 байтам: JPEG `FF D8 FF`, PNG (8 байт), WebP `RIFF????WEBP`.
 * Ручная проверка вместо `file-type`: его парсер ASF зацикливается на ~60 байтах
 * (DoS), а нужны только три формата.
 */
export function detectImage(
  buffer: Buffer,
): { mime: string; extension: string } | null {
  const head = buffer.subarray(0, 12);

  if (
    head.length >= 3 &&
    head[0] === 0xff &&
    head[1] === 0xd8 &&
    head[2] === 0xff
  ) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  if (head.length >= 8 && PNG_SIGNATURE.every((byte, i) => head[i] === byte)) {
    return { mime: 'image/png', extension: 'png' };
  }

  if (
    head.length >= 12 &&
    head.toString('latin1', 0, 4) === 'RIFF' &&
    head.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
}

/**
 * Проверяет, что файл действительно jpg/png/webp: тип определяется по
 * сигнатуре (magic bytes), а не по Content-Type и имени файла от клиента.
 * Возвращает параметры загрузки в S3.
 */
export function toImageUpload(
  file: Express.Multer.File | undefined,
  folder: string,
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Файл не был передан',
    });
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new PayloadTooLargeException({
      message: 'Файл слишком большой. Максимальный размер: 5 МБ',
    });
  }

  const detected = detectImage(file.buffer);

  if (!detected) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Разрешены только изображения jpg, png и webp',
    });
  }

  return {
    file: file.buffer,
    fileName: `${randomUUID()}.${detected.extension}`,
    folder,
    contentType: detected.mime,
  };
}
