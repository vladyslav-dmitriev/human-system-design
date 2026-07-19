/**
 * Создание задержки (Promise)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Создание задержки с возможностью отмены
 */
export function createDelayedPromise<T>(
  ms: number,
  value?: T,
): { promise: Promise<T>; cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: any) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
    timeoutId = setTimeout(() => resolve(value as T), ms);
  });

  return {
    promise,
    cancel: () => {
      clearTimeout(timeoutId);
      rejectFn(new Error('Delay cancelled'));
    },
  };
}

/**
 * Задержка с экспоненциальным ростом
 */
export function exponentialDelay(
  attempt: number,
  baseDelay: number = 1000,
): number {
  return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Задержка с джиттером
 */
export function delayWithJitter(
  baseDelay: number,
  jitter: number = 100,
): number {
  const jitterValue = Math.random() * jitter - jitter / 2;
  return Math.max(0, baseDelay + jitterValue);
}

/**
 * Асинхронный sleep с прогрессом
 */
export async function sleepWithProgress(
  ms: number,
  onTick?: (progress: number) => void,
): Promise<void> {
  const start = Date.now();
  const interval = 100; // Tick every 100ms

  return new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / ms, 1);

      if (onTick) {
        onTick(progress);
      }

      if (progress >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

/**
 * Создание таймаута для промиса
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    }),
  ]);
}

/**
 * Debounce функция
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle функция
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}
