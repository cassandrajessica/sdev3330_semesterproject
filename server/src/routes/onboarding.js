import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { isOnboardingEnabled, validatePreferences } from '../utils/onboarding.js';

const router = express.Router();

// Hide every onboarding route while the flag is off
router.use((req, res, next) => {
  if (!isOnboardingEnabled()) return res.status(404).json({ error: 'Not found' });
  next();
});

router.use(authenticateToken);

// POST /api/onboarding/preferences
router.post('/preferences', (req, res) => {
  const result = validatePreferences(req.body.categories);
  if (!result.valid) return res.status(400).json({ error: result.error });

  // TODO: save to the database (needs a user_preferences table)
  res.status(501).json({ error: 'Saving preferences is not built yet' });
});

export default router;
