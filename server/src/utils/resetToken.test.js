import { describe, test, expect } from '@jest/globals';
import { generateResetToken, hashToken, isTokenUsable, RESET_TOKEN_TTL_MS } from './resetToken.js';

describe('generateResetToken', () => {
  // Cycle 1: the token is long and random, and only its hash gets stored.
  test('returns a 64 character hex token and a different 64 character hex hash', () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(token);
  });

  // Cycle 2: the stored hash must match what hashToken gives for the raw token.
  test('the hash matches hashToken(token)', () => {
    const { token, tokenHash } = generateResetToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  // Cycle 3: two tokens should never be the same.
  test('generates a different token each time', () => {
    expect(generateResetToken().token).not.toBe(generateResetToken().token);
  });

  // Cycle 4: tokens last 1 hour.
  test('expires exactly 1 hour after the given time', () => {
    const now = new Date('2026-11-04T12:00:00Z').getTime();
    const { expiresAt } = generateResetToken(now);
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
    expect(expiresAt.toISOString()).toBe('2026-11-04T13:00:00.000Z');
  });
});

describe('hashToken', () => {
  test('gives the same hash for the same token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  test('gives a different hash for a different token', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('isTokenUsable', () => {
  const now = new Date('2026-11-04T12:00:00Z').getTime();

  // BVA: one millisecond before, at, and after the expiry time.
  test('is usable 1 ms before it expires', () => {
    expect(isTokenUsable({ expires_at: new Date(now + 1), used_at: null }, now)).toBe(true);
  });

  test('is not usable at the exact expiry time', () => {
    expect(isTokenUsable({ expires_at: new Date(now), used_at: null }, now)).toBe(false);
  });

  test('is not usable after it expires', () => {
    expect(isTokenUsable({ expires_at: new Date(now - 1), used_at: null }, now)).toBe(false);
  });

  test('is not usable once it has been used', () => {
    expect(isTokenUsable({ expires_at: new Date(now + 60000), used_at: new Date(now - 1000) }, now)).toBe(false);
  });

  test('is not usable when there is no token row', () => {
    expect(isTokenUsable(undefined, now)).toBe(false);
  });
});
