// Feature flag for onboarding preferences and the "Recommended For You" section.
//
// The live value is the "onboarding" row in the feature_flags table, so it can be
// flipped in Supabase while the app is running. If there is no database, no row,
// or the lookup fails, it falls back to the FEATURE_ONBOARDING environment
// variable (set it to "true" to turn it on). Off by default.
export async function isOnboardingEnabled(db) {
  if (db) {
    try {
      const { rows } = await db.query('SELECT enabled FROM feature_flags WHERE name = $1', ['onboarding']);
      if (rows.length > 0) return rows[0].enabled === true;
    } catch (err) {
      console.error('Feature flag lookup failed, using FEATURE_ONBOARDING:', err.message);
    }
  }
  return process.env.FEATURE_ONBOARDING === 'true';
}

// Same ids as client/src/utils/categories.js
export const PREFERENCE_CATEGORIES = ['music', 'arts', 'food', 'community', 'sports'];

// Same options as the radius picker in client/src/hooks/useUserLocation.js
export const RADIUS_OPTIONS = [10, 25, 50];

export function validateCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { valid: false, error: 'Pick at least one category' };
  }
  const unknown = categories.filter((c) => !PREFERENCE_CATEGORIES.includes(c));
  if (unknown.length > 0) {
    return { valid: false, error: `Unknown categories: ${unknown.join(', ')}` };
  }
  return { valid: true, categories: [...new Set(categories)] };
}

// Checks the whole preferences form: a 5-digit US ZIP code, one of the radius
// options, and at least one known category.
export function validatePreferences({ zip, radius, categories } = {}) {
  const cleanZip = typeof zip === 'string' ? zip.trim() : '';
  if (!/^\d{5}$/.test(cleanZip)) {
    return { valid: false, error: 'Enter a 5-digit ZIP code' };
  }

  const cleanRadius = Number(radius);
  if (!RADIUS_OPTIONS.includes(cleanRadius)) {
    return { valid: false, error: `Radius must be ${RADIUS_OPTIONS.join(', ')} miles` };
  }

  const cats = validateCategories(categories);
  if (!cats.valid) return cats;

  return { valid: true, preferences: { zip: cleanZip, radius: cleanRadius, categories: cats.categories } };
}
