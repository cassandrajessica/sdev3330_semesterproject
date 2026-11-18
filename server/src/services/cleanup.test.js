import { describe, test, expect, jest, afterEach } from '@jest/globals';
import {
  cleanupOldEvents,
  getRetentionDays,
  startCleanupSchedule,
  DEFAULT_RETENTION_DAYS,
} from './cleanup.js';

// A fake connection pool that records every query it receives.
function makeDb({ failOnTable } = {}) {
  const queries = [];
  const client = {
    query: jest.fn(async (sql, params) => {
      queries.push({ sql, params });
      const table = /^DELETE FROM (\w+)/.exec(sql)?.[1];
      if (table && table === failOnTable) throw new Error('boom');
      if (table === 'saved_events') return { rowCount: 3 };
      if (table === 'events') return { rowCount: 2 };
      if (table === 'venues') return { rowCount: 1 };
      return { rowCount: 0 }; // BEGIN, COMMIT, ROLLBACK
    }),
    release: jest.fn(),
  };
  return { db: { connect: jest.fn(async () => client) }, client, queries };
}

const steps = (queries) => queries.map((q) => /^(\w+(?: FROM \w+)?)/.exec(q.sql)[1]);

afterEach(() => {
  delete process.env.CLEANUP_RETENTION_DAYS;
  jest.restoreAllMocks();
});

describe('cleanupOldEvents', () => {
  // ── Test 1: runs the three deletes in dependency order inside one transaction ──
  test('deletes saved events, then events, then venues inside a transaction', async () => {
    const { db, client, queries } = makeDb();

    await cleanupOldEvents(db, 30);

    expect(steps(queries)).toEqual([
      'BEGIN',
      'DELETE FROM saved_events',
      'DELETE FROM events',
      'DELETE FROM venues',
      'COMMIT',
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: reports how many rows each step removed ──
  test('returns the number of rows removed from each table', async () => {
    const { db } = makeDb();

    const result = await cleanupOldEvents(db, 30);

    expect(result).toEqual({ savedEvents: 3, events: 2, venues: 1 });
  });

  // ── Test 3: the retention period reaches the query as a parameter ──
  test('passes the retention days to the saved events delete', async () => {
    const { db, queries } = makeDb();

    await cleanupOldEvents(db, 45);

    const savedDelete = queries.find((q) => q.sql.startsWith('DELETE FROM saved_events'));
    expect(savedDelete.params).toEqual([45]);
  });

  // ── Test 4: with no argument the default of 30 days is used ──
  test('uses 30 days when no retention is given', async () => {
    const { db, queries } = makeDb();

    await cleanupOldEvents(db);

    const savedDelete = queries.find((q) => q.sql.startsWith('DELETE FROM saved_events'));
    expect(savedDelete.params).toEqual([DEFAULT_RETENTION_DAYS]);
  });

  // ── Test 5: a failure part way through undoes everything and releases the connection ──
  test('rolls back, releases the connection and rethrows when a step fails', async () => {
    const { db, client, queries } = makeDb({ failOnTable: 'events' });

    await expect(cleanupOldEvents(db, 30)).rejects.toThrow('boom');

    expect(steps(queries)).toEqual(['BEGIN', 'DELETE FROM saved_events', 'DELETE FROM events', 'ROLLBACK']);
    expect(steps(queries)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe('getRetentionDays', () => {
  // ── Test 6: EP, no setting ──
  test('defaults to 30 days when the setting is missing', () => {
    expect(getRetentionDays()).toBe(30);
  });

  // ── Test 7: EP, valid setting ──
  test('uses CLEANUP_RETENTION_DAYS when it is a positive whole number', () => {
    process.env.CLEANUP_RETENTION_DAYS = '45';
    expect(getRetentionDays()).toBe(45);
  });

  // ── Test 8: BVA, lowest valid value ──
  test('accepts 1 day, the lowest valid value', () => {
    process.env.CLEANUP_RETENTION_DAYS = '1';
    expect(getRetentionDays()).toBe(1);
  });

  // ── Test 9: BVA and EP, values that must fall back to the default ──
  test.each(['0', '-5', '2.5', 'abc', ''])('falls back to 30 days for "%s"', (value) => {
    process.env.CLEANUP_RETENTION_DAYS = value;
    expect(getRetentionDays()).toBe(30);
  });
});

describe('startCleanupSchedule', () => {
  // ── Test 10: runs right away and logs what it removed ──
  test('runs the cleanup once straight away and logs the result', async () => {
    const { db } = makeDb();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    const timer = startCleanupSchedule(db, 1_000_000);
    await new Promise((resolve) => setImmediate(resolve));
    clearInterval(timer);

    expect(db.connect).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('Cleanup removed 3 saved events, 2 events and 1 venues');
  });

  // ── Test 11: a failing cleanup is logged and does not crash the server ──
  test('logs an error instead of throwing when the cleanup fails', async () => {
    const db = { connect: jest.fn(async () => { throw new Error('database down'); }) };
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    const timer = startCleanupSchedule(db, 1_000_000);
    await new Promise((resolve) => setImmediate(resolve));
    clearInterval(timer);

    expect(error).toHaveBeenCalledWith('Cleanup error:', 'database down');
  });
});
