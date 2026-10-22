import { logger } from './Logger';

/** Retry any async operation (flaky backend calls, eventual consistency checks). */
export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 1000, backoff = 1.5, label = 'operation' }: { attempts?: number; delayMs?: number; backoff?: number; label?: string } = {},
): Promise<T> {
  let wait = delayMs;
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      logger.warn(`${label} failed (attempt ${i}/${attempts}): ${(e as Error).message.split('\n')[0]}`);
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, wait));
        wait *= backoff;
      }
    }
  }
  throw lastErr;
}
