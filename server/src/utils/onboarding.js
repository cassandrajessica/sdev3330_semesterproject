// Feature flag: set FEATURE_ONBOARDING=true to turn on the onboarding
// preferences step. Off by default because it is unfinished: preferences
// are validated but not saved yet, and there is no onboarding UI.
export function isOnboardingEnabled() {
  return process.env.FEATURE_ONBOARDING === 'true';
}

// Same ids as client/src/utils/categories.js
export const PREFERENCE_CATEGORIES = ['music', 'arts', 'food', 'community', 'sports'];

export function validatePreferences(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { valid: false, error: 'Pick at least one category' };
  }
  const unknown = categories.filter((c) => !PREFERENCE_CATEGORIES.includes(c));
  if (unknown.length > 0) {
    return { valid: false, error: `Unknown categories: ${unknown.join(', ')}` };
  }
  return { valid: true, categories: [...new Set(categories)] };
}
