const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

/**
 * Search events from the Ticketmaster Discovery API.
 *
 * @param {Object} params - Search parameters
 * @param {string} [params.keyword]            - Search term
 * @param {string} [params.city]               - City name
 * @param {string} [params.stateCode]          - Two-letter state code
 * @param {string} [params.classificationName] - Category (Music, Sports, Arts, etc.)
 * @param {string} [params.startDateTime]      - ISO 8601 datetime
 * @param {string} [params.endDateTime]        - ISO 8601 datetime
 * @param {string} [params.sort]               - e.g. "date,asc" or "relevance,desc"
 * @param {number} [params.size]               - Results per page (max 200)
 * @param {number} [params.page]               - Page number
 * @returns {Promise<{events: Array, totalElements: number, totalPages: number, page: number}>}
 */
export async function searchEvents(params = {}) {
  const query = new URLSearchParams({
    apikey: process.env.TICKETMASTER_API_KEY,
    size: params.size || 20,
    page: params.page || 0,
  });

  // Only add optional params if they were provided
  if (params.keyword)            query.set('keyword', params.keyword);
  if (params.city)               query.set('city', params.city);
  if (params.stateCode)          query.set('stateCode', params.stateCode);
  if (params.classificationName) query.set('classificationName', params.classificationName);
  if (params.startDateTime)      query.set('startDateTime', params.startDateTime);
  if (params.endDateTime)        query.set('endDateTime', params.endDateTime);
  if (params.sort)               query.set('sort', params.sort);

  const url = `${TM_BASE_URL}/events.json?${query.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ticketmaster API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Ticketmaster returns _embedded.events when there are results,
  // or no _embedded at all when there are none.
  const rawEvents = data._embedded?.events || [];

  return {
    events: rawEvents.map(formatEvent),
    totalElements: data.page?.totalElements || 0,
    totalPages: data.page?.totalPages || 0,
    page: data.page?.number || 0,
  };
}

/**
 * Get a single event by its Ticketmaster ID.
 *
 * @param {string} eventId - Ticketmaster event ID
 * @returns {Promise<Object>} Formatted event object
 */
export async function getEventById(eventId) {
  const url = `${TM_BASE_URL}/events/${eventId}.json?apikey=${process.env.TICKETMASTER_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ticketmaster API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return formatEvent(data);
}

/**
 * Map a raw Ticketmaster event object into a cleaner shape
 * for the HeyCiti frontend.
 */
function formatEvent(raw) {
  // Pull the first image that's a reasonable size
  const image = raw.images?.find(img => img.width >= 500) || raw.images?.[0];

  // Venue info is nested inside _embedded
  const venue = raw._embedded?.venues?.[0];

  // Classification (category/genre)
  const classification = raw.classifications?.[0];

  return {
    ticketmaster_id: raw.id,
    name: raw.name,
    description: raw.description || raw.info || null,
    url: raw.url,
    image_url: image?.url || null,
    start_date: raw.dates?.start?.localDate || null,
    start_time: raw.dates?.start?.localTime || null,
    status: raw.dates?.status?.code || null,
    price_min: raw.priceRanges?.[0]?.min || null,
    price_max: raw.priceRanges?.[0]?.max || null,
    currency: raw.priceRanges?.[0]?.currency || null,
    category: classification?.segment?.name || null,
    genre: classification?.genre?.name || null,
    venue: venue
      ? {
          name: venue.name,
          city: venue.city?.name || null,
          state: venue.state?.stateCode || null,
          address: venue.address?.line1 || null,
          latitude: venue.location?.latitude || null,
          longitude: venue.location?.longitude || null,
          ticketmaster_venue_id: venue.id,
        }
      : null,
  };
}
