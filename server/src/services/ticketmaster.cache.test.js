import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { searchEvents, clearEventCache } from './ticketmaster.js';

// Fake fetch that always returns an empty successful search.
function mockFetchEmpty() {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ page: { totalElements: 0, totalPages: 0, number: 0 } }),
  });
}

describe('ticketmaster search cache (FEATURE_EVENT_CACHE flag)', () => {
  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = 'test-key';
    clearEventCache();
  });

  afterEach(() => {
    delete process.env.FEATURE_EVENT_CACHE;
    jest.restoreAllMocks();
  });

  test('flag off: identical searches each call the API', async () => {
    const fetchSpy = mockFetchEmpty();

    await searchEvents({ city: 'Dallas' });
    await searchEvents({ city: 'Dallas' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('flag on: an identical search is served from the cache', async () => {
    process.env.FEATURE_EVENT_CACHE = 'true';
    const fetchSpy = mockFetchEmpty();

    const first = await searchEvents({ city: 'Dallas' });
    const second = await searchEvents({ city: 'Dallas' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  test('flag on: different searches are cached separately', async () => {
    process.env.FEATURE_EVENT_CACHE = 'true';
    const fetchSpy = mockFetchEmpty();

    await searchEvents({ city: 'Dallas' });
    await searchEvents({ city: 'Austin' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
