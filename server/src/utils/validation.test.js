import { describe, test, expect } from '@jest/globals';
import { validateRegistration } from './validation.js';

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
