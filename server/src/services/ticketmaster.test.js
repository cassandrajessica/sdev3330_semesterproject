import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { searchEvents, getEventById } from './ticketmaster.js';


// Makes the fake fetch return a successful response with the data we give it.
function mockFetchSuccess(data) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => data,
  });
}

// Makes the fake fetch return an error response, like a 500 from the API.
function mockFetchFailure(status, body) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status,
    text: async () => body,
  });
}

// A simple raw event shaped like what Ticketmaster sends back.
// Each test copies this and changes only the part it cares about.
function makeRawEvent(overrides = {}) {
  return {
    id: 'evt123',
    name: 'Dallas Jazz Night',
    description: 'A night of live jazz',
    url: 'https://example.com/jazz',
    images: [{ url: 'https://example.com/jazz-big.jpg', width: 800 }],
    dates: {
      start: { localDate: '2026-11-01', localTime: '19:30:00' },
      status: { code: 'onsale' },
    },
    priceRanges: [{ min: 25, max: 60, currency: 'USD' }],
    classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' } }],
    _embedded: {
      venues: [
        {
          id: 'venue1',
          name: 'The Blue Room',
          city: { name: 'Dallas' },
          state: { stateCode: 'TX' },
          address: { line1: '123 Main St' },
          location: { latitude: '32.77', longitude: '-96.79' },
        },
      ],
    },
    ...overrides,
  };
}

// Wraps raw events in the same shape the real API uses.
function makeApiResponse(events) {
  return {
    _embedded: { events },
    page: { totalElements: events.length, totalPages: 1, number: 0 },
  };
}

describe('ticketmaster service', () => {
  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    // Put the real fetch back after every test.
    jest.restoreAllMocks();
  });

  // ── Test 1: EP, normal response with events ──
  // EP: partition = a response that contains events.
  // One normal example should be enough to represent this whole group.
  test('turns a raw Ticketmaster event into the HeyCiti format', async () => {
    mockFetchSuccess(makeApiResponse([makeRawEvent()]));

    const result = await searchEvents({ city: 'Dallas' });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      ticketmaster_id: 'evt123',
      name: 'Dallas Jazz Night',
      category: 'Music',
      genre: 'Jazz',
      start_date: '2026-11-01',
      price_min: 25,
      price_max: 60,
    });
    expect(result.events[0].venue.name).toBe('The Blue Room');
    expect(result.totalElements).toBe(1);
  });

  // ── Test 2: EP, response with no events ──
  // EP: partition = a response with no results.
  // Ticketmaster leaves out the _embedded part completely when nothing matches.
  test('returns an empty list when the API has no results', async () => {
    mockFetchSuccess({ page: { totalElements: 0, totalPages: 0, number: 0 } });

    const result = await searchEvents({ keyword: 'nothing-matches-this' });

    expect(result.events).toEqual([]);
    expect(result.totalElements).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  // ── Test 3: EP, event with no venue ──
  // EP: partition = an event that is missing its venue information.
  test('sets venue to null when the event has no venue', async () => {
    const eventWithoutVenue = makeRawEvent({ _embedded: undefined });
    mockFetchSuccess(makeApiResponse([eventWithoutVenue]));

    const result = await searchEvents();

    expect(result.events[0].venue).toBeNull();
  });

  // ── Test 4: EP, API error ──
  // EP: partition = the API fails and sends back an error status.
  // Test double: the fake fetch pretends Ticketmaster returned a 500 error.
  test('throws a clear error when the API responds with an error', async () => {
    mockFetchFailure(500, 'Server exploded');

    await expect(searchEvents()).rejects.toThrow(
      'Ticketmaster API error 500: Server exploded'
    );
  });

  // ── Test 5: BVA, image width just below the 500px cutoff ──
  // BVA: the code prefers an image with width >= 500.
  // A 499px image is just below that cutoff, so it should NOT be chosen.
  // The code should fall back to the first image in the list instead.
  test('does not pick a 499px image as the large image', async () => {
    const event = makeRawEvent({
      images: [
        { url: 'first-image.jpg', width: 300 },
        { url: 'just-below.jpg', width: 499 },
      ],
    });
    mockFetchSuccess(makeApiResponse([event]));

    const result = await searchEvents();

    expect(result.events[0].image_url).toBe('first-image.jpg');
  });

  // ── Test 6: BVA, image width exactly on the 500px cutoff ──
  // BVA: a 500px image is right on the boundary, so it SHOULD be chosen.
  test('picks an image that is exactly 500px wide', async () => {
    const event = makeRawEvent({
      images: [
        { url: 'first-image.jpg', width: 300 },
        { url: 'exactly-500.jpg', width: 500 },
      ],
    });
    mockFetchSuccess(makeApiResponse([event]));

    const result = await searchEvents();

    expect(result.events[0].image_url).toBe('exactly-500.jpg');
  });

  // ── Test 7: BVA, lowest possible price (free event) ──
  // BVA: 0 is the lowest valid price and sits right between "no price"
  // and "has a price". A free event should show a price of 0, not null.
  test('keeps a minimum price of 0 for a free event', async () => {
    const freeEvent = makeRawEvent({
      priceRanges: [{ min: 0, max: 0, currency: 'USD' }],
    });
    mockFetchSuccess(makeApiResponse([freeEvent]));

    const result = await searchEvents();

    expect(result.events[0].price_min).toBe(0);
    expect(result.events[0].price_max).toBe(0);
  });

  // ── Test 8: Test double, request URL for search ──
  // Test double: we use the fake fetch to check what URL our code asked for.
  // Only the search options we pass in should show up in the URL.
  test('only adds search options to the URL when they are provided', async () => {
    const fetchMock = mockFetchSuccess(makeApiResponse([]));

    await searchEvents({ keyword: 'concert', city: 'Dallas' });

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('keyword')).toBe('concert');
    expect(calledUrl.searchParams.get('city')).toBe('Dallas');
    expect(calledUrl.searchParams.get('apikey')).toBe('test-key');
    expect(calledUrl.searchParams.get('size')).toBe('20');
    expect(calledUrl.searchParams.get('page')).toBe('0');
    // These were not provided, so they should not be in the URL.
    expect(calledUrl.searchParams.has('stateCode')).toBe(false);
    expect(calledUrl.searchParams.has('classificationName')).toBe(false);
  });

  // ── Test 9: Test double, request URL for a single event ──
  // Test double: check that getEventById asks for the right event.
  test('getEventById requests the correct event URL', async () => {
    const fetchMock = mockFetchSuccess(makeRawEvent({ id: 'abc999' }));

    const event = await getEventById('abc999');

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/events/abc999.json');
    expect(calledUrl).toContain('apikey=test-key');
    expect(event.ticketmaster_id).toBe('abc999');
  });

  // ── Test 10: EP, response missing page information ──
  // EP: partition = a response where the "page" section is missing.
  // The code should fall back to zeros instead of crashing.
  test('uses zeros when the response has no page information', async () => {
    mockFetchSuccess({ _embedded: { events: [makeRawEvent()] } });

    const result = await searchEvents();

    expect(result.totalElements).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.page).toBe(0);
    expect(result.events).toHaveLength(1);
  });
});
