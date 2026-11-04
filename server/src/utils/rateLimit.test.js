import { describe, test, expect } from '@jest/globals';
import { createRateLimiter } from './rateLimit.js';

describe('createRateLimiter', () => {
  const windowMs = 60000;

  // BVA: the max-th attempt is allowed, the next one is not.
  test('allows attempts up to the max', () => {
    const limiter = createRateLimiter({ max: 3, windowMs });
    expect(limiter.check('a', 0).allowed).toBe(true);
    expect(limiter.check('a', 1).allowed).toBe(true);
    expect(limiter.check('a', 2).allowed).toBe(true);
  });

  test('blocks the attempt after the max and says how long to wait', () => {
    const limiter = createRateLimiter({ max: 3, windowMs });
    limiter.check('a', 0);
    limiter.check('a', 1);
    limiter.check('a', 2);
    const result = limiter.check('a', 1000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(windowMs - 1000);
  });

  test('allows attempts again once the window has passed', () => {
    const limiter = createRateLimiter({ max: 1, windowMs });
    limiter.check('a', 0);
    expect(limiter.check('a', windowMs - 1).allowed).toBe(false);
    expect(limiter.check('a', windowMs).allowed).toBe(true);
  });

  test('tracks each key separately', () => {
    const limiter = createRateLimiter({ max: 1, windowMs });
    limiter.check('a', 0);
    expect(limiter.check('b', 1).allowed).toBe(true);
  });

  test('blocked attempts do not extend the block', () => {
    const limiter = createRateLimiter({ max: 1, windowMs });
    limiter.check('a', 0);
    limiter.check('a', 30000);
    expect(limiter.check('a', windowMs).allowed).toBe(true);
  });
});
