import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { isOnboardingEnabled, validatePreferences } from '../utils/onboarding.js';
import { getPreferences, savePreferences } from '../services/preferences.js';
import { lookupZip } from '../services/zip.js';

const router = express.Router();

// Hide every onboarding route while the flag is off
router.use(async (req, res, next) => {
  if (!(await isOnboardingEnabled(pool))) return res.status(404).json({ error: 'Not found' });
  next();
});

router.use(authenticateToken);

// GET /api/onboarding/preferences
// Returns { preferences: {...} }, or { preferences: null } if none are saved yet.
router.get('/preferences', async (req, res) => {
  try {
    res.json({ preferences: await getPreferences(pool, req.user.id) });
  } catch (err) {
    console.error('Load preferences error:', err.message);
    res.status(500).json({ error: 'Could not load your preferences' });
  }
});

// POST /api/onboarding/preferences
// Body: { zip: "75189", radius: 25, categories: ["music", "food"] }
router.post('/preferences', async (req, res) => {
  const result = validatePreferences(req.body);
  if (!result.valid) return res.status(400).json({ error: result.error });

  // Ticketmaster only applies a radius to coordinates, so turn the ZIP into lat/lng.
  let location;
  try {
    location = await lookupZip(result.preferences.zip);
  } catch (err) {
    console.error('ZIP lookup error:', err.message);
    return res.status(502).json({ error: "We couldn't check that ZIP code right now. Try again in a minute." });
  }
  if (!location) return res.status(400).json({ error: "We couldn't find that ZIP code" });

  try {
    res.json({ preferences: await savePreferences(pool, req.user.id, { ...result.preferences, ...location }) });
  } catch (err) {
    console.error('Save preferences error:', err.message);
    res.status(500).json({ error: 'Could not save your preferences' });
  }
});

export default router;
