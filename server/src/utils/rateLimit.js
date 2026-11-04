/**
 * Small in-memory limiter: at most `max` attempts per key within `windowMs`.
 * Only attempts that are allowed are counted, so being blocked does not extend the block.
 * It resets when the server restarts, which is fine for a single server.
 *
 * @returns {{ check: (key: string, now?: number) => { allowed: boolean, retryAfterMs: number } }}
 */
export function createRateLimiter({ max, windowMs }) {
  const attempts = new Map(); // key -> list of timestamps (ms)

  return {
    check(key, now = Date.now()) {
      const recent = (attempts.get(key) || []).filter((t) => now - t < windowMs);

      if (recent.length >= max) {
        attempts.set(key, recent);
        return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
      }

      recent.push(now);
      attempts.set(key, recent);
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}
