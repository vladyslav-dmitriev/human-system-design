import { randomUUID } from 'node:crypto';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { fromBuffer } from 'file-type';

import { ErrorCode } from '../../common/errors';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// +1 байт: multer режет файл строго по лимиту, а точная проверка (413) ниже
export const IMAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES + 1, files: 1 },
};

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Проверяет, что файл действительно jpg/png/webp: тип определяется по
 * сигнатуре (magic bytes), а не по Content-Type и имени файла от клиента.
 * Возвращает параметры загрузки в S3.
 */
export async function toImageUpload(
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

  const detected = await fromBuffer(file.buffer);
  const extension = detected ? ALLOWED_IMAGE_TYPES[detected.mime] : undefined;

  if (!detected || !extension) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Разрешены только изображения jpg, png и webp',
    });
  }

  return {
    file: file.buffer,
    fileName: `${randomUUID()}.${extension}`,
    folder,
    contentType: detected.mime,
  };
}
