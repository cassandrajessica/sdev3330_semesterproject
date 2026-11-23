import { describe, test, expect, jest } from '@jest/globals';
import { getPreferences, savePreferences } from './preferences.js';

const row = { zip: '75189', lat: 32.9628, lng: -96.3648, place: 'Royse City, TX', radius: 25, categories: ['music', 'food'] };

describe('getPreferences', () => {
  test('returns null when the user has none', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    expect(await getPreferences(db, 7)).toBeNull();
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });

  test('returns the saved preferences', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [row] }) };
    expect(await getPreferences(db, 7)).toEqual(row);
  });
});

describe('savePreferences', () => {
  test('upserts by user id and returns what was saved', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [row] }) };

    const result = await savePreferences(db, 7, row);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO user_preferences');
    expect(sql).toContain('ON CONFLICT (user_id)');
    expect(params).toEqual([7, '75189', 32.9628, -96.3648, 'Royse City, TX', 25, ['music', 'food']]);
    expect(result).toEqual(row);
  });
});
