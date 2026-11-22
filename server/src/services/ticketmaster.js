import { metrics } from '../utils/telemetry.js';

const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Stop waiting for Ticketmaster after this many ms so a slow API can't hang a request.
const DEFAULT_TIMEOUT_MS = 8000;

function getTimeoutMs() {
  const fromEnv = Number(process.env.TICKETMASTER_TIMEOUT_MS);
  return fromEnv > 0 ? fromEnv : DEFAULT_TIMEOUT_MS;
}

// fetch with a time limit. Throws a clear error on a timeout or network failure.
async function fetchWithTimeout(url) {
  const timeoutMs = getTimeoutMs();
  try {
    return await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Ticketmaster API timed out after ${timeoutMs} ms`);
    }
    throw new Error(`Ticketmaster API request failed: ${err.message}`);
  }
}

// ── Rate limiting ──
// Ticketmaster allows about 5 requests per second with almost no burst, and answers
// 429 "Spike arrest violation" when requests arrive too close together. The dashboard
// sends several searches at once, so every outgoing request waits for its turn.
const DEFAULT_MIN_INTERVAL_MS = 250;
const MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let nextSlotAt = 0; // earliest time the next request may start
const inFlight = new Map(); // url -> promise for requests that are still running

// Minimum gap between requests. TICKETMASTER_MIN_INTERVAL_MS can change it (0 turns spacing off).
function getMinIntervalMs() {
  const raw = process.env.TICKETMASTER_MIN_INTERVAL_MS;
  if (raw === undefined || raw === '') return DEFAULT_MIN_INTERVAL_MS;
  const fromEnv = Number(raw);
  return fromEnv >= 0 ? fromEnv : DEFAULT_MIN_INTERVAL_MS;
}

// Reserves the next free slot right away, so requests that arrive together
// line up one after another instead of all waiting for the same moment.
function waitForTurn() {
  const now = Date.now();
  const startAt = Math.max(now, nextSlotAt);
  nextSlotAt = startAt + getMinIntervalMs();
  return startAt > now ? sleep(startAt - now) : Promise.resolve();
}

// How long to wait before retrying a 429: the Retry-After header (in seconds) when
// Ticketmaster sends one, otherwise a short delay that grows with each attempt.
function getRetryDelayMs(response, attempt) {
  const header = response.headers?.get('retry-after');
  const seconds = header == null || header === '' ? NaN : Number(header);
  const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_DELAY_MS * (attempt + 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

// Sends the request in its turn and retries a 429 up to MAX_RETRIES times.
// Any other response, including other errors, is returned as it is.
async function fetchWithRetry(url) {
  for (let attempt = 0; ; attempt++) {
    await waitForTurn();
    const response = await fetchWithTimeout(url);
    if (response.status !== 429 || attempt >= MAX_RETRIES) return response;
    await sleep(getRetryDelayMs(response, attempt));
  }
}

// Fetches and parses one Ticketmaster URL. Identical requests that are running at
// the same moment (for example React's double render in development) share one call.
// Nothing is kept once the request finishes, so results never go stale.
function fetchJson(url) {
  if (inFlight.has(url)) return inFlight.get(url);

  const request = (async () => {
    const start = Date.now();        // timer for this request
    metrics.ticketmasterCalls++;     // counter: total Ticketmaster calls

    try {
      const response = await fetchWithRetry(url);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ticketmaster API error ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (err) {
      metrics.ticketmasterFailures++; // counter: failed Ticketmaster calls

      // Log statement. The URL is left out on purpose because it contains the API key.
      console.error(JSON.stringify({
        level: 'error',
        event: 'ticketmaster_fetch_failed',
        error: err.message,
        duration_ms: Date.now() - start,
        total_calls: metrics.ticketmasterCalls,
        total_failures: metrics.ticketmasterFailures,
      }));

      throw err;
    }
  })().finally(() => inFlight.delete(url));

  inFlight.set(url, request);
  return request;
}

// Clears the spacing and in-flight state. Only used by tests.
export function resetRateLimiter() {
  nextSlotAt = 0;
  inFlight.clear();
}

// Feature flag: set FEATURE_EVENT_CACHE=true to reuse identical search results
// for a few minutes instead of calling Ticketmaster every time. Off by default.
// Still unfinished, which is why it stays off: there is no size limit, expired
// entries are never cleaned up, and getEventById is not cached yet.
const CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();

function isEventCacheEnabled() {
  return process.env.FEATURE_EVENT_CACHE === 'true';
}

// Empties the search cache. Used by tests so each one starts fresh.
export function clearEventCache() {
  searchCache.clear();
}

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
 * @param {string} [params.venueId]            - Ticketmaster venue ID
 * @param {string} [params.geoPoint]           - Geohash of the search center
 * @param {number} [params.radius]             - Search radius around geoPoint
 * @param {string} [params.unit]               - "miles" or "km"
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
  if (params.venueId)            query.set('venueId', params.venueId);
  if (params.geoPoint)           query.set('geoPoint', params.geoPoint);
  if (params.radius)             query.set('radius', params.radius);
  if (params.unit)               query.set('unit', params.unit);

  const url = `${TM_BASE_URL}/events.json?${query.toString()}`;

  const useCache = isEventCacheEnabled();
  if (useCache) {
    const cached = searchCache.get(url);
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  const data = await fetchJson(url);

  // Ticketmaster returns _embedded.events when there are results,
  // or no _embedded at all when there are none.
  const rawEvents = data._embedded?.events || [];

  const result = {
    events: rawEvents.map(formatEvent),
    totalElements: data.page?.totalElements || 0,
    totalPages: data.page?.totalPages || 0,
    page: data.page?.number || 0,
  };

  if (useCache) {
    searchCache.set(url, { result, savedAt: Date.now() });
  }

  return result;
}

/**
 * Get a single event by its Ticketmaster ID.
 *
 * @param {string} eventId - Ticketmaster event ID
 * @returns {Promise<Object>} Formatted event object
 */
export async function getEventById(eventId) {
  const url = `${TM_BASE_URL}/events/${eventId}.json?apikey=${process.env.TICKETMASTER_API_KEY}`;

  const data = await fetchJson(url);
  return formatEvent(data);
}

// Ticketmaster fills in a missing category or genre with the word "Undefined".
// Treat that the same as no value so it never shows up as a label.
export function cleanClassification(name) {
  return name && name !== 'Undefined' ? name : null;
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
    price_min: raw.priceRanges?.[0]?.min ?? null,
    price_max: raw.priceRanges?.[0]?.max ?? null,
    currency: raw.priceRanges?.[0]?.currency || null,
    category: cleanClassification(classification?.segment?.name),
    genre: cleanClassification(classification?.genre?.name),
    // Extra details shown in the event panel
    please_note: raw.pleaseNote || null,
    ticket_limit: raw.ticketLimit?.info || null,
    age_restricted: raw.ageRestrictions?.legalAgeEnforced ?? null,
    sales_start: raw.sales?.public?.startDateTime || null,
    sales_end: raw.sales?.public?.endDateTime || null,
    seatmap_url: raw.seatmap?.staticUrl || null,
    promoter: raw.promoter?.name || null,
    venue: venue
      ? {
          name: venue.name,
          city: venue.city?.name || null,
          state: venue.state?.stateCode || null,
          address: venue.address?.line1 || null,
          postal_code: venue.postalCode || null,
          latitude: venue.location?.latitude || null,
          longitude: venue.location?.longitude || null,
          ticketmaster_venue_id: venue.id,
        }
      : null,
  };
}
