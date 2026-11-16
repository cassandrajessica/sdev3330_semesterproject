import { describe, test, expect, afterEach } from '@jest/globals';
import { isOnboardingEnabled } from './onboarding.js';

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
