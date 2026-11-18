import { describe, test, expect, afterEach } from '@jest/globals';
import { isOnboardingEnabled, validatePreferences } from './onboarding.js';

describe('FEATURE_ONBOARDING flag', () => {
  afterEach(() => {
    delete process.env.FEATURE_ONBOARDING;
  });

  test('off when unset', () => {
    expect(isOnboardingEnabled()).toBe(false);
  });

  test('only exactly "true" turns it on', () => {
    process.env.FEATURE_ONBOARDING = 'yes';
    expect(isOnboardingEnabled()).toBe(false);
    process.env.FEATURE_ONBOARDING = 'true';
    expect(isOnboardingEnabled()).toBe(true);
  });
});

describe('validatePreferences', () => {
  test('rejects an empty list', () => {
    expect(validatePreferences([]).valid).toBe(false);
  });

  test('rejects a non-array', () => {
    expect(validatePreferences('music').valid).toBe(false);
  });

  test('rejects unknown categories', () => {
    const result = validatePreferences(['music', 'bowling']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('bowling');
  });

  test('accepts valid categories and removes duplicates', () => {
    expect(validatePreferences(['music', 'food', 'music'])).toEqual({
      valid: true,
      categories: ['music', 'food'],
    });
  });
});
