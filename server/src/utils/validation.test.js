import { describe, test, expect } from '@jest/globals';
import { validateRegistration, validateEventIds } from './validation.js';

describe('validateRegistration', () => {

  // ── Test 1: EP – Valid input (valid partition) ──
  test('accepts a valid email and password', () => {
    const result = validateRegistration({
      email: 'cj@example.com',
      password: 'MyPass@99',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Test 2: EP – Missing email (invalid partition) ──
  test('rejects when email is missing', () => {
    const result = validateRegistration({
      email: '',
      password: 'MyPass@99',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Email is required');
  });

  // ── Test 3: EP – Password missing uppercase (invalid partition) ──
  test('rejects password without an uppercase letter', () => {
    const result = validateRegistration({
      email: 'cj@example.com',
      password: 'mypass@99',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Password must contain at least one uppercase letter'
    );
  });

  // ── Test 4: BVA – Password exactly 7 chars (just below minimum) ──
  test('rejects password that is 7 characters (below min boundary)', () => {
    const result = validateRegistration({
      email: 'cj@example.com',
      password: 'Short@1',          // 7 chars
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Password must be at least 8 characters'
    );
  });

  // ── Test 5: BVA – Password exactly 8 chars (on the minimum boundary) ──
  test('accepts password that is exactly 8 characters (min boundary)', () => {
    const result = validateRegistration({
      email: 'cj@example.com',
      password: 'Abcde@1!',         // exactly 8 chars
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

});

describe('validateEventIds', () => {

  // ── Test 1: EP – Valid list (valid partition) ──
  test('accepts a list of positive whole numbers', () => {
    const result = validateEventIds([1, 7, 42]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Test 2: EP – Not an array (invalid partition) ──
  test('rejects a value that is not an array', () => {
    const result = validateEventIds('12');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('eventIds must be a non-empty array');
  });

  // ── Test 3: BVA – Empty list (just below the minimum of 1) ──
  test('rejects an empty list', () => {
    const result = validateEventIds([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('eventIds must be a non-empty array');
  });

  // ── Test 4: BVA – Exactly 200 ids (at the maximum) ──
  test('accepts exactly 200 ids', () => {
    const ids = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(validateEventIds(ids).valid).toBe(true);
  });

  // ── Test 5: BVA – 201 ids (just above the maximum) ──
  test('rejects 201 ids', () => {
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const result = validateEventIds(ids);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('eventIds must contain 200 ids or fewer');
  });

  // ── Test 6: BVA – Id of 0 (just below the lowest valid id) ──
  test('rejects an id of 0', () => {
    const result = validateEventIds([0]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('eventIds must only contain positive whole numbers');
  });

  // ── Test 7: EP – Ids that are not whole numbers (invalid partition) ──
  test.each([[[1.5]], [['3']], [[null]], [[-2]]])('rejects %j', (ids) => {
    expect(validateEventIds(ids).valid).toBe(false);
  });
});
