// Housekeeping for old events.
//
// The events table only holds events that someone saved, and users reach an
// event through saved_events. So cleanup works from the bottom up:
//   1. remove saved events whose event date is more than N days ago
//   2. remove past events that nobody has saved anymore
//   3. remove venues that no event uses anymore
// All three steps run in one transaction, so a failure leaves the data as it was.

export const DEFAULT_RETENTION_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Reads CLEANUP_RETENTION_DAYS from the environment. Anything that is not a
// positive whole number falls back to the default.
export function getRetentionDays() {
  const fromEnv = Number(process.env.CLEANUP_RETENTION_DAYS);
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_RETENTION_DAYS;
}

/**
 * Delete old saved events and the event and venue rows left behind.
 *
 * @param {import('pg').Pool} db - Connection pool
 * @param {number} [retentionDays] - How many days after the event date to keep it
 * @returns {Promise<{savedEvents: number, events: number, venues: number}>} Rows removed
 */
export async function cleanupOldEvents(db, retentionDays = getRetentionDays()) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const savedEvents = await client.query(
      `DELETE FROM saved_events
       WHERE event_id IN (
         SELECT id FROM events WHERE start_date < CURRENT_DATE - $1::int
       )`,
      [retentionDays]
    );

    // SKIP LOCKED leaves alone any row that a save in progress is using right now.
    const events = await client.query(
      `DELETE FROM events
       WHERE id IN (
         SELECT e.id FROM events e
         WHERE e.start_date < CURRENT_DATE
           AND NOT EXISTS (SELECT 1 FROM saved_events se WHERE se.event_id = e.id)
         FOR UPDATE SKIP LOCKED
       )`
    );

    const venues = await client.query(
      `DELETE FROM venues
       WHERE id IN (
         SELECT v.id FROM venues v
         WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.venue_id = v.id)
         FOR UPDATE SKIP LOCKED
       )`
    );

    await client.query('COMMIT');

    return {
      savedEvents: savedEvents.rowCount,
      events: events.rowCount,
      venues: venues.rowCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run the cleanup now and then once a day. Errors are logged and never stop the
 * server. The timer is unref'd so it does not keep the process alive on its own.
 *
 * @param {import('pg').Pool} db
 * @param {number} [intervalMs]
 * @returns {NodeJS.Timeout} The interval timer
 */
export function startCleanupSchedule(db, intervalMs = ONE_DAY_MS) {
  async function run() {
    try {
      const removed = await cleanupOldEvents(db);
      console.log(
        `Cleanup removed ${removed.savedEvents} saved events, ${removed.events} events and ${removed.venues} venues`
      );
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  }

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
