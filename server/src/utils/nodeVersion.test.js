import { describe, test, expect } from '@jest/globals';

// Week 10 matrix demo: Promise.try() only exists in newer Node versions.
// This passes on Node 24 and fails on Node 22 ("Promise.try is not a function").
describe('environment-specific behavior', () => {
  test('Promise.try runs a function and resolves its result', async () => {
    const result = await Promise.try(() => 'ok');
    expect(result).toBe('ok');
  });
});
