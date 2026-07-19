import { delay, exponentialDelay, delayWithJitter } from './delay';
import { RabbitMQLogger } from './rabbitmq.logger';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'fixed' | 'exponential' | 'exponential_with_jitter';
  maxDelay?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  logger?: RabbitMQLogger;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
}

/**
 * Выполнение функции с повторными попытками
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    delay: baseDelay = 1000,
    backoff = 'exponential',
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
    logger = new RabbitMQLogger('Retry'),
  } = options;

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      return {
        result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !shouldRetry(error as Error, attempt)) {
        throw error;
      }

      let waitTime = baseDelay;

      switch (backoff) {
        case 'exponential':
          waitTime = exponentialDelay(attempt, baseDelay);
          break;
        case 'exponential_with_jitter':
          waitTime = delayWithJitter(exponentialDelay(attempt, baseDelay));
          break;
        case 'fixed':
        default:
          waitTime = baseDelay;
      }

      waitTime = Math.min(waitTime, maxDelay);

      if (onRetry) {
        onRetry(error as Error, attempt, waitTime);
      }

      logger.warn(
        `Попытка ${attempt}/${maxAttempts} не удалась. Повтор через ${waitTime}мс`,
        {
          error: (error as Error).message,
        },
      );

      await delay(waitTime);
    }
  }

  // Эта строка никогда не должна выполняться, но TypeScript требует
  throw lastError || new Error('Retry failed');
}

/**
 * Выполнение функции с повторными попытками и возвратом значения по умолчанию
 */
export async function retryWithDefault<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  options: RetryOptions = {},
): Promise<T> {
  try {
    const result = await retry(fn, options);
    return result.result;
  } catch {
    return defaultValue;
  }
}

/**
 * Выполнение функции с повторными попытками только для определенных ошибок
 */
export function retryOnErrors<T>(
  fn: () => Promise<T>,
  errorTypes: Array<new (...args: any[]) => Error>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  return retry(fn, {
    ...options,
    shouldRetry: (error, attempt) => {
      const shouldRetryByType = errorTypes.some(
        (errorType) => error instanceof errorType,
      );
      return (
        shouldRetryByType && (options.shouldRetry?.(error, attempt) ?? true)
      );
    },
  });
}

/**
 * Создание retry-декоратора
 */
export function RetryDecorator(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), {
        ...options,
        logger: options.logger || new RabbitMQLogger(`Retry:${propertyKey}`),
      });
    };

    return descriptor;
  };
}

/**
 * Утилита для массового ретрая
 */
export async function retryAll<T>(
  tasks: Array<() => Promise<T>>,
  options: RetryOptions = {},
): Promise<Array<RetryResult<T>>> {
  const results: Array<RetryResult<T>> = [];

  for (const task of tasks) {
    try {
      const result = await retry(task, options);
      results.push(result);
    } catch (error) {
      // Если задача провалилась после всех попыток, пробрасываем ошибку
      throw new Error(`Task failed: ${(error as Error).message}`);
    }
  }

  return results;
}

/**
 * Утилита для параллельного ретрая
 */
export async function retryParallel<T>(
  tasks: Array<() => Promise<T>>,
  options: RetryOptions = {},
): Promise<Array<RetryResult<T>>> {
  const retryPromises = tasks.map((task) => retry(task, options));
  return Promise.all(retryPromises);
}
