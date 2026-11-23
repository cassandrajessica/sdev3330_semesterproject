-- Onboarding preferences and the feature flag table. Run once in the Supabase SQL editor.

-- One row per user: where they live, how far they will travel, and the
-- categories they like. Category ids match client/src/utils/categories.js.
-- lat/lng are looked up from the ZIP code when it's saved, because Ticketmaster
-- only applies a radius to coordinates (a postalCode search ignores it).
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  zip        VARCHAR(5) NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  place      TEXT,
  radius     INTEGER NOT NULL CHECK (radius IN (10, 25, 50)),
  categories TEXT[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature flags that can be flipped while the app is running.
-- Change "enabled" in the Supabase table editor; no redeploy or restart needed.
CREATE TABLE IF NOT EXISTS feature_flags (
  name       TEXT PRIMARY KEY,
  enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (name, enabled)
VALUES ('onboarding', FALSE)
ON CONFLICT (name) DO NOTHING;
