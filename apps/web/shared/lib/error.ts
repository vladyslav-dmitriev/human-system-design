/** Текст ошибки из значения catch (там unknown, а не Error) */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
