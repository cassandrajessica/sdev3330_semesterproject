import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { isOnboardingEnabled, validateCategories, validatePreferences } from './onboarding.js';

// A fake database that answers the feature flag query with the given rows.
function fakeDb(rows) {
  return { query: jest.fn().mockResolvedValue({ rows }) };
}

describe('onboarding feature flag', () => {
  afterEach(() => {
    delete process.env.FEATURE_ONBOARDING;
  });

  describe('environment variable fallback (no database)', () => {
    test('off when unset', async () => {
      expect(await isOnboardingEnabled()).toBe(false);
    });

    test('only exactly "true" turns it on', async () => {
      process.env.FEATURE_ONBOARDING = 'yes';
      expect(await isOnboardingEnabled()).toBe(false);
      process.env.FEATURE_ONBOARDING = 'true';
      expect(await isOnboardingEnabled()).toBe(true);
    });
  });

  describe('feature_flags table', () => {
    test('reads the onboarding row', async () => {
      const db = fakeDb([{ enabled: true }]);
      expect(await isOnboardingEnabled(db)).toBe(true);
      expect(db.query.mock.calls[0][1]).toEqual(['onboarding']);
    });

    test('the table wins over the environment variable', async () => {
      process.env.FEATURE_ONBOARDING = 'true';
      expect(await isOnboardingEnabled(fakeDb([{ enabled: false }]))).toBe(false);
    });

    test('falls back to the environment variable when the row is missing', async () => {
      process.env.FEATURE_ONBOARDING = 'true';
      expect(await isOnboardingEnabled(fakeDb([]))).toBe(true);
    });

    test('falls back (off) when the lookup fails', async () => {
      const db = { query: jest.fn().mockRejectedValue(new Error('connection refused')) };
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(await isOnboardingEnabled(db)).toBe(false);
      spy.mockRestore();
    });
  });
});

describe('validateCategories', () => {
  test('rejects an empty list', () => {
    expect(validateCategories([]).valid).toBe(false);
  });

  test('rejects a non-array', () => {
    expect(validateCategories('music').valid).toBe(false);
  });

  test('rejects unknown categories', () => {
    const result = validateCategories(['music', 'bowling']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('bowling');
  });

  test('accepts valid categories and removes duplicates', () => {
    expect(validateCategories(['music', 'food', 'music'])).toEqual({
      valid: true,
      categories: ['music', 'food'],
    });
  });
});

describe('validatePreferences', () => {
  const good = { zip: '75189', radius: 25, categories: ['music'] };

  test('accepts a complete form and cleans it up', () => {
    expect(validatePreferences({ zip: ' 75189 ', radius: '25', categories: ['music', 'music', 'food'] })).toEqual({
      valid: true,
      preferences: { zip: '75189', radius: 25, categories: ['music', 'food'] },
    });
  });

  test.each(['', '7518', '751890', 'abcde', undefined, 75189])('rejects ZIP %p', (zip) => {
    const result = validatePreferences({ ...good, zip });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ZIP');
  });

  test.each([0, 5, 100, 'far', undefined])('rejects radius %p', (radius) => {
    const result = validatePreferences({ ...good, radius });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Radius');
  });

  test('rejects missing categories', () => {
    expect(validatePreferences({ ...good, categories: [] }).valid).toBe(false);
  });

  test('rejects a missing body', () => {
    expect(validatePreferences().valid).toBe(false);
  });
});
