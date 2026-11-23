import { describe, test, expect, jest } from '@jest/globals';
import { lookupZip } from './zip.js';

function fakeFetch(status, body) {
  return jest.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300, json: async () => body });
}

describe('lookupZip', () => {
  test('returns coordinates and a place name', async () => {
    const fetchFn = fakeFetch(200, {
      'post code': '75189',
      places: [{ 'place name': 'Royse City', longitude: '-96.3648', latitude: '32.9628', 'state abbreviation': 'TX' }],
    });

    expect(await lookupZip('75189', fetchFn)).toEqual({ lat: 32.9628, lng: -96.3648, place: 'Royse City, TX' });
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.zippopotam.us/us/75189');
  });

  test('returns null for a ZIP code that does not exist', async () => {
    expect(await lookupZip('00000', fakeFetch(404, {}))).toBeNull();
  });

  test('returns null when the response has no places', async () => {
    expect(await lookupZip('75189', fakeFetch(200, { places: [] }))).toBeNull();
  });

  test('throws when the lookup service fails', async () => {
    await expect(lookupZip('75189', fakeFetch(500, {}))).rejects.toThrow('500');
  });
});
