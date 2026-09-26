import express from 'express';
import { searchEvents, getEventById } from '../services/ticketmaster.js';

const router = express.Router();

// GET /api/events/search?keyword=&city=&stateCode=&classificationName=&page=&size=
router.get('/search', async (req, res) => {
  try {
    const results = await searchEvents({
      keyword: req.query.keyword,
      city: req.query.city,
      stateCode: req.query.stateCode,
      classificationName: req.query.classificationName,
      startDateTime: req.query.startDateTime,
      endDateTime: req.query.endDateTime,
      sort: req.query.sort || 'date,asc',
      size: req.query.size,
      page: req.query.page,
    });

    res.json(results);
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
    res.json(event);
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
