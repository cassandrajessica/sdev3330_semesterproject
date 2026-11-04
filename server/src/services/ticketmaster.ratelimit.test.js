import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { searchEvents, getEventById, resetRateLimiter } from './ticketmaster.js';

// A successful Ticketmaster response with one event in it.
function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      _embedded: { events: [{ id: 'evt1', name: 'Dallas Jazz Night' }] },
      page: { totalElements: 1, totalPages: 1, number: 0 },
    }),
  };
}

// A 429 "too many requests" response. `retryAfter` is the Retry-After header value, or null.
function tooManyRequests(retryAfter = null) {
  return {
    ok: false,
    status: 429,
    headers: { get: (name) => (name.toLowerCase() === 'retry-after' ? retryAfter : null) },
    text: async () => 'Spike arrest violation',
  };
}

beforeEach(() => {
  process.env.TICKETMASTER_API_KEY = 'test-key';
  process.env.TICKETMASTER_MIN_INTERVAL_MS = '0';
  resetRateLimiter();
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env.TICKETMASTER_MIN_INTERVAL_MS = '0'; // back to the value jest.setup.js uses
});

describe('Ticketmaster request spacing', () => {
  // ── Test 1: requests that arrive together go out one after another ──
  test('spaces out requests that arrive at the same moment', async () => {
    process.env.TICKETMASTER_MIN_INTERVAL_MS = '80';
    const startTimes = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      startTimes.push(Date.now());
      return okResponse();
    });

    await Promise.all([
      searchEvents({ city: 'Dallas' }),
      searchEvents({ city: 'Austin' }),
      searchEvents({ city: 'Houston' }),
    ]);

    expect(startTimes).toHaveLength(3);
    // A few milliseconds of allowance for timer jitter.
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(70);
    expect(startTimes[2] - startTimes[1]).toBeGreaterThanOrEqual(70);
  });

  // ── Test 2: a single request is not delayed ──
  test('sends the first request straight away', async () => {
    process.env.TICKETMASTER_MIN_INTERVAL_MS = '500';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    const start = Date.now();
    await searchEvents({ city: 'Dallas' });

    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe('Ticketmaster 429 retries', () => {
  // ── Test 3: a 429 followed by success gives the caller the events ──
  test('retries after a 429 and returns the events when the retry works', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tooManyRequests('0'))
      .mockResolvedValueOnce(okResponse());

    const result = await searchEvents({ city: 'Dallas' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Dallas Jazz Night');
  });

  // ── Test 4: BVA, gives up after the retry limit (1 try + 2 retries = 3 calls) ──
  test('gives up after 2 retries and reports the 429', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(tooManyRequests('0'));

    await expect(searchEvents({ city: 'Dallas' })).rejects.toThrow(
      'Ticketmaster API error 429: Spike arrest violation'
    );

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  // ── Test 5: BVA, succeeds on the last allowed retry ──
  test('succeeds when the second retry is the one that works', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tooManyRequests('0'))
      .mockResolvedValueOnce(tooManyRequests('0'))
      .mockResolvedValueOnce(okResponse());

    const result = await searchEvents({ city: 'Dallas' });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.events).toHaveLength(1);
  });

  // ── Test 6: the Retry-After header decides how long to wait ──
  test('waits for the time in the Retry-After header before retrying', async () => {
    const callTimes = [];
    const responses = [tooManyRequests('0.2'), okResponse()];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callTimes.push(Date.now());
      return responses.shift();
    });

    await searchEvents({ city: 'Dallas' });

    expect(callTimes).toHaveLength(2);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(180);
  });

  // ── Test 7: other errors are not retried ──
  test('does not retry a 500 error', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
    });

    await expect(searchEvents({ city: 'Dallas' })).rejects.toThrow('Ticketmaster API error 500: Server Error');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 8: getEventById gets the same protection ──
  test('getEventById also retries after a 429', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tooManyRequests('0'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'evt1', name: 'Dallas Jazz Night' }) });

    const event = await getEventById('evt1');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(event.name).toBe('Dallas Jazz Night');
  });
});

describe('Ticketmaster duplicate requests', () => {
  // ── Test 9: identical requests at the same moment share one call ──
  test('sends one request when two identical searches run at the same time', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    const [first, second] = await Promise.all([
      searchEvents({ city: 'Dallas', size: 12 }),
      searchEvents({ city: 'Dallas', size: 12 }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(first.events[0].name).toBe('Dallas Jazz Night');
    expect(second).toEqual(first);
  });

  // ── Test 10: different searches are not merged ──
  test('sends separate requests for different searches', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    await Promise.all([searchEvents({ city: 'Dallas' }), searchEvents({ city: 'Austin' })]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // ── Test 11: nothing is cached once a request has finished ──
  test('sends a new request for an identical search after the first one finished', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    await searchEvents({ city: 'Dallas' });
    await searchEvents({ city: 'Dallas' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // ── Test 12: a failed shared request fails for both callers, then clears ──
  test('shares a failure between duplicate callers and tries again on the next search', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
      .mockResolvedValueOnce(okResponse());

    const results = await Promise.allSettled([searchEvents({ city: 'Dallas' }), searchEvents({ city: 'Dallas' })]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const retry = await searchEvents({ city: 'Dallas' });
    expect(retry.events).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
