// HW6: functional and non-functional tests for the Ticketmaster service.

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { searchEvents, getEventById } from './ticketmaster.js';

// A sample event shaped like Ticketmaster's response.
function makeRawEvent(overrides = {}) {
  return {
    id: 'evt456',
    name: 'Fort Worth Food Truck Festival',
    description: 'Local food trucks and live music',
    url: 'https://example.com/food-trucks',
    images: [{ url: 'https://example.com/food-trucks.jpg', width: 1024 }],
    dates: {
      start: { localDate: '2026-11-14', localTime: '11:00:00' },
      status: { code: 'onsale' },
    },
    priceRanges: [{ min: 10, max: 15, currency: 'USD' }],
    classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Festival' } }],
    _embedded: {
      venues: [
        {
          id: 'venue77',
          name: 'Panther Island Pavilion',
          city: { name: 'Fort Worth' },
          state: { stateCode: 'TX' },
          address: { line1: '395 Purcey St' },
          postalCode: '76102',
          location: { latitude: '32.76', longitude: '-97.34' },
        },
      ],
    },
    ...overrides,
  };
}

describe('HW6: Ticketmaster service', () => {
  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    jest.restoreAllMocks(); // put the real fetch back
  });

  // Functional: a valid event ID returns the event in the HeyCiti format.
  test('FUNCTIONAL: getEventById returns a correctly formatted event for a valid ID', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => makeRawEvent(),
    });

    const event = await getEventById('evt456');

    expect(event).toMatchObject({
      ticketmaster_id: 'evt456',
      name: 'Fort Worth Food Truck Festival',
      image_url: 'https://example.com/food-trucks.jpg',
      start_date: '2026-11-14',
      start_time: '11:00:00',
      status: 'onsale',
      price_min: 10,
      price_max: 15,
      currency: 'USD',
      category: 'Arts & Theatre',
      genre: 'Festival',
    });
    expect(event.venue).toEqual({
      name: 'Panther Island Pavilion',
      city: 'Fort Worth',
      state: 'TX',
      address: '395 Purcey St',
      postal_code: '76102',
      latitude: '32.76',
      longitude: '-97.34',
      ticketmaster_venue_id: 'venue77',
    });
  });

  // NFR (Reliability)
  // THRESHOLD: When Ticketmaster is down, searchEvents must fail with a clear
  // error in under 500 ms on all 10 of 10 attempts.
  test('NFR (Reliability): fails with a clear error in under 500 ms when Ticketmaster is down', async () => {
    const THRESHOLD_MS = 500;
    const ATTEMPTS = 10;

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    const durations = [];

    for (let i = 0; i < ATTEMPTS; i++) {
      const start = performance.now();

      await expect(searchEvents({ city: 'Dallas' })).rejects.toThrow(
        'Ticketmaster API error 503: Service Unavailable'
      );

      durations.push(performance.now() - start);
    }

    // Every attempt must pass, so check the slowest one.
    const slowest = Math.max(...durations);
    expect(durations).toHaveLength(ATTEMPTS);
    expect(slowest).toBeLessThan(THRESHOLD_MS);
  });

  // NFR (Reliability, slow API)
  // THRESHOLD: When Ticketmaster doesn't respond, searchEvents must give up with
  // a clear timeout error in under 500 ms (200 ms test timeout + 300 ms allowance).
  test('NFR (Reliability): gives up with a clear error when Ticketmaster is too slow', async () => {
    const TIMEOUT_MS = 200;
    const THRESHOLD_MS = TIMEOUT_MS + 300;
    process.env.TICKETMASTER_TIMEOUT_MS = String(TIMEOUT_MS);

    // A fetch that never answers until our code cancels it.
    jest.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason));
      });
    });

    const start = performance.now();

    await expect(searchEvents({ city: 'Dallas' })).rejects.toThrow(
      `Ticketmaster API timed out after ${TIMEOUT_MS} ms`
    );

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(THRESHOLD_MS);

    delete process.env.TICKETMASTER_TIMEOUT_MS;
  });
});
