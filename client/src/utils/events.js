import { apiFetch } from '../api.js';

// Calls our backend's /api/events/search with only the params that have values.
export function searchEvents(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  return apiFetch(`/api/events/search?${query.toString()}`);
}

// Groups events by venue and returns the venues with the most upcoming events.
export function topVenues(events, limit = 8) {
  const byVenue = new Map();
  events.forEach((e) => {
    const v = e.venue;
    if (!v?.ticketmaster_venue_id) return;
    const entry = byVenue.get(v.ticketmaster_venue_id) || { ...v, count: 0, image_url: null };
    entry.count += 1;
    if (!entry.image_url && e.image_url) entry.image_url = e.image_url;
    byVenue.set(v.ticketmaster_venue_id, entry);
  });
  return [...byVenue.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

// Saved events come from our database with flat venue columns. This turns one
// back into the same shape as a Ticketmaster search result so the panel can show it.
export function savedRowToEvent(row) {
  return {
    ticketmaster_id: row.ticketmaster_id,
    name: row.name,
    description: row.description,
    url: row.url,
    image_url: row.image_url,
    start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
    start_time: row.start_time,
    status: row.status,
    category: row.category,
    genre: row.genre,
    venue: row.venue_name
      ? {
          name: row.venue_name,
          city: row.venue_city,
          state: row.venue_state,
          address: row.venue_address,
          latitude: row.venue_latitude,
          longitude: row.venue_longitude,
        }
      : null,
  };
}

// Google Maps link for a venue, using coordinates when we have them.
export function directionsUrl(venue) {
  if (!venue) return null;
  const query =
    venue.latitude && venue.longitude
      ? `${venue.latitude},${venue.longitude}`
      : [venue.name, venue.address, venue.city, venue.state].filter(Boolean).join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
