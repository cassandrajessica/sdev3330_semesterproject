import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes here require authentication
router.use(authenticateToken);

// POST /api/events/saved — Save an event
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { event } = req.body;

  if (!event || !event.ticketmaster_id) {
    return res.status(400).json({ error: 'Event data with ticketmaster_id is required' });
  }

  try {
    // Start a transaction so venue + event + saved_events all succeed or all fail
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Upsert venue (if the event has one)
      let venueId = null;
      if (event.venue) {
        const venueResult = await client.query(
          `INSERT INTO venues (ticketmaster_venue_id, name, city, state, address, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (ticketmaster_venue_id)
           DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, state = EXCLUDED.state,
                         address = EXCLUDED.address, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
           RETURNING id`,
          [
            event.venue.ticketmaster_venue_id,
            event.venue.name,
            event.venue.city,
            event.venue.state,
            event.venue.address,
            event.venue.latitude,
            event.venue.longitude,
          ]
        );
        venueId = venueResult.rows[0].id;
      }

      // 2. Upsert event
      const eventResult = await client.query(
        `INSERT INTO events (ticketmaster_id, name, description, url, image_url, start_date, start_time,
                             status, price_min, price_max, currency, category, genre, venue_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (ticketmaster_id)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, url = EXCLUDED.url,
                       image_url = EXCLUDED.image_url, start_date = EXCLUDED.start_date,
                       start_time = EXCLUDED.start_time, status = EXCLUDED.status,
                       price_min = EXCLUDED.price_min, price_max = EXCLUDED.price_max,
                       currency = EXCLUDED.currency, category = EXCLUDED.category,
                       genre = EXCLUDED.genre, venue_id = EXCLUDED.venue_id
         RETURNING id`,
        [
          event.ticketmaster_id,
          event.name,
          event.description,
          event.url,
          event.image_url,
          event.start_date,
          event.start_time,
          event.status,
          event.price_min,
          event.price_max,
          event.currency,
          event.category,
          event.genre,
          venueId,
        ]
      );
      const eventId = eventResult.rows[0].id;

      // 3. Create saved_events record (ignore if already saved)
      await client.query(
        `INSERT INTO saved_events (user_id, event_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING`,
        [userId, eventId]
      );

      await client.query('COMMIT');

      res.status(201).json({ message: 'Event saved', event_id: eventId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Save event error:', err.message);
    res.status(500).json({ error: 'Failed to save event' });
  }
});

// GET /api/events/saved — Get user's saved events
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT e.*, v.name AS venue_name, v.city AS venue_city, v.state AS venue_state,
              v.address AS venue_address, v.latitude AS venue_latitude, v.longitude AS venue_longitude,
              se.created_at AS saved_at
       FROM saved_events se
       JOIN events e ON se.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE se.user_id = $1
       ORDER BY se.created_at DESC`,
      [userId]
    );

    res.json({ saved_events: result.rows });
  } catch (err) {
    console.error('Get saved events error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve saved events' });
  }
});

// DELETE /api/events/saved/:eventId — Unsave an event
router.delete('/:eventId', async (req, res) => {
  const userId = req.user.id;
  const { eventId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2 RETURNING *',
      [userId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved event not found' });
    }

    res.json({ message: 'Event unsaved' });
  } catch (err) {
    console.error('Unsave event error:', err.message);
    res.status(500).json({ error: 'Failed to unsave event' });
  }
});

export default router;
