import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import eventRoutes from './routes/events.js';
import authRoutes from './routes/auth.js';
import savedRoutes from './routes/saved.js';
import pool from './db.js';
import { startCleanupSchedule } from './services/cleanup.js';
import onboardingRoutes from './routes/onboarding.js';
import { isOnboardingEnabled } from './utils/onboarding.js';
import { metrics } from './utils/telemetry.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/events/saved', savedRoutes);  // must come before /api/events (has /:id param)
app.use('/api/events', eventRoutes);

// Public feature flags so the client knows which unfinished features to show.
// Flip the onboarding flag in the Supabase feature_flags table; no restart needed.
app.get('/api/flags', async (req, res) => {
  res.json({ onboarding: await isOnboardingEnabled(pool) });
});

// Telemetry: shows Ticketmaster call and failure counts
app.get('/api/metrics', (req, res) => res.json(metrics));

// Start server
app.listen(PORT, () => {
  console.log(`HeyCiti server running on port ${PORT}`);
  startCleanupSchedule(pool); // removes old saved events now and then every 24 hours
});
