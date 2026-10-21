import express from 'express';
import { searchEvents, getEventById } from '../services/ticketmaster.js';
import { formatPriceLabel } from '../utils/formatPrice.js';
import { encodeGeohash } from '../utils/geohash.js';

const router = express.Router();

// GET /api/events/search?keyword=&city=&stateCode=&lat=&lng=&radius=&classificationName=&venueId=&page=&size=
// Send either lat + lng (from the browser's location) or city + stateCode.
router.get('/search', async (req, res) => {
  let geoPoint;
  if (req.query.lat !== undefined || req.query.lng !== undefined) {
    try {
      geoPoint = encodeGeohash(req.query.lat, req.query.lng);
    } catch {
      return res.status(400).json({ error: 'lat and lng must be valid coordinates' });
    }
  }

  try {
    const results = await searchEvents({
      keyword: req.query.keyword,
      city: req.query.city,
      stateCode: req.query.stateCode,
      classificationName: req.query.classificationName,
      startDateTime: req.query.startDateTime,
      endDateTime: req.query.endDateTime,
      venueId: req.query.venueId,
      geoPoint,
      radius: geoPoint ? req.query.radius || 25 : undefined,
      unit: geoPoint ? 'miles' : undefined,
      sort: req.query.sort || 'date,asc',
      size: req.query.size,
      page: req.query.page,
    });

    // Add the display label for event cards ("Free", "$25 - $60", "Price TBA")
    res.json({
      ...results,
      events: results.events.map((e) => ({ ...e, price_label: formatPriceLabel(e) })),
    });
  } catch (err) {
    console.error('Event search error:', err.message);
    res.status(502).json({
      error: 'Failed to fetch events from Ticketmaster',
      message: err.message,
    });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await getEventById(req.params.id);
    res.json({ ...event, price_label: formatPriceLabel(event) });
  } catch (err) {
    console.error('Event detail error:', err.message);

    const status = err.message.includes('404') ? 404 : 502;
    res.status(status).json({
      error: status === 404 ? 'Event not found' : 'Failed to fetch event details',
      message: err.message,
    });
  }
});

export default router;
