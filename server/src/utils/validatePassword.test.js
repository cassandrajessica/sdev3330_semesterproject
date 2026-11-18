import { describe, test, expect } from '@jest/globals';
import { validatePassword, validateRegistration } from './validation.js';

describe('validatePassword', () => {
  test('returns no errors for a valid password', () => {
    expect(validatePassword('MyPass@99')).toEqual([]);
  });

  test('returns an error when the password is missing', () => {
    expect(validatePassword('')).toContain('Password is required');
    expect(validatePassword(undefined)).toContain('Password is required');
  });

  test('uses the same rules as registration', () => {
    expect(validatePassword('mypass@99')).toContain('Password must contain at least one uppercase letter');
    expect(validatePassword('MyPass99')).toContain('Password must contain at least one special character');
    expect(validatePassword('Ab@1234')).toContain('Password must be at least 8 characters');
    expect(validatePassword('A@' + 'a'.repeat(127))).toContain('Password must be 128 characters or fewer');
  });

  test('registration reports the same password errors', () => {
    const { errors } = validateRegistration({ email: 'cj@example.com', password: 'short' });
    expect(errors).toEqual(expect.arrayContaining(validatePassword('short')));
  });
});
