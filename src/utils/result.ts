export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  ok: true;
  value: T;
}

export interface Failure<E> {
  ok: false;
  error: E;
}

export function Ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function Err<E>(error: E): Failure<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.ok === false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
