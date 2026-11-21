import { Transform } from 'class-transformer';

export const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

/** Приводит email к виду `trim().toLowerCase()` до валидации. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );
