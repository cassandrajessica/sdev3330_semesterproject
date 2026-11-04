import { describe, test, expect, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { requestPasswordReset, resetPassword } from './passwordReset.js';
import { hashToken } from '../utils/resetToken.js';

// A fake database: records every query and answers by matching text in the SQL.
function fakeDb(answers = {}) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      for (const [match, result] of Object.entries(answers)) {
        if (sql.includes(match)) return result;
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const now = new Date('2026-11-04T12:00:00Z').getTime();
const clientUrl = 'http://localhost:5173';

describe('requestPasswordReset', () => {
  test('does nothing for an email with no account', async () => {
    const db = fakeDb({ 'FROM users': { rows: [] } });
    const sendEmail = jest.fn();

    const result = await requestPasswordReset(db, 'nobody@example.com', { sendEmail, clientUrl, now });

    expect(result).toEqual({ sent: false });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.calls.some((c) => c.sql.includes('INSERT INTO password_reset_tokens'))).toBe(false);
  });

  test('looks the email up trimmed and lowercased', async () => {
    const db = fakeDb({ 'FROM users': { rows: [] } });

    await requestPasswordReset(db, '  CJ@Example.COM ', { sendEmail: jest.fn(), clientUrl, now });

    expect(db.calls[0].params).toEqual(['cj@example.com']);
  });

  test('ignores a missing or non-string email', async () => {
    const db = fakeDb();
    const sendEmail = jest.fn();

    expect(await requestPasswordReset(db, undefined, { sendEmail, clientUrl, now })).toEqual({ sent: false });
    expect(await requestPasswordReset(db, 42, { sendEmail, clientUrl, now })).toEqual({ sent: false });
    expect(db.calls).toHaveLength(0);
  });

  test('stores only the hash and emails a link containing the raw token', async () => {
    const db = fakeDb({ 'FROM users': { rows: [{ id: 7, email: 'cj@example.com', password_hash: 'saved-hash' }] } });
    const sendEmail = jest.fn().mockResolvedValue({});

    const result = await requestPasswordReset(db, 'cj@example.com', { sendEmail, clientUrl, now });

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, resetUrl } = sendEmail.mock.calls[0][0];
    expect(to).toBe('cj@example.com');
    expect(resetUrl.startsWith(`${clientUrl}/reset-password?token=`)).toBe(true);

    const token = new URL(resetUrl).searchParams.get('token');
    const insert = db.calls.find((c) => c.sql.includes('INSERT INTO password_reset_tokens'));
    expect(insert.params[0]).toBe(7);
    expect(insert.params[1]).toBe(hashToken(token));
    expect(insert.params).not.toContain(token);
    expect(insert.params[2].toISOString()).toBe('2026-11-04T13:00:00.000Z');
  });

  test('cancels earlier unused tokens before adding the new one', async () => {
    const db = fakeDb({ 'FROM users': { rows: [{ id: 7, email: 'cj@example.com', password_hash: 'saved-hash' }] } });

    await requestPasswordReset(db, 'cj@example.com', { sendEmail: jest.fn().mockResolvedValue({}), clientUrl, now });

    const cancelIndex = db.calls.findIndex((c) => c.sql.includes('UPDATE password_reset_tokens'));
    const insertIndex = db.calls.findIndex((c) => c.sql.includes('INSERT INTO password_reset_tokens'));
    expect(cancelIndex).toBeGreaterThan(-1);
    expect(cancelIndex).toBeLessThan(insertIndex);
    expect(db.calls[cancelIndex].params[0]).toBe(7);
  });
});

describe('requestPasswordReset for Google-only accounts', () => {
  const googleOnly = { 'FROM users': { rows: [{ id: 9, email: 'g@example.com', password_hash: null }] } };

  test('reports that the account uses Google and sends no email', async () => {
    const db = fakeDb(googleOnly);
    const sendEmail = jest.fn();

    const result = await requestPasswordReset(db, 'g@example.com', { sendEmail, clientUrl, now });

    expect(result).toEqual({ sent: false, googleOnly: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('creates no reset token for them', async () => {
    const db = fakeDb(googleOnly);

    await requestPasswordReset(db, 'g@example.com', { sendEmail: jest.fn(), clientUrl, now });

    expect(db.calls.some((c) => c.sql.includes('password_reset_tokens'))).toBe(false);
  });

  test('an account with a password and Google linked still gets a reset link', async () => {
    const db = fakeDb({ 'FROM users': { rows: [{ id: 9, email: 'g@example.com', password_hash: 'saved-hash' }] } });
    const sendEmail = jest.fn().mockResolvedValue({});

    const result = await requestPasswordReset(db, 'g@example.com', { sendEmail, clientUrl, now });

    expect(result).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('resetPassword', () => {
  const token = 'a'.repeat(64);

  test('rejects a weak password without touching the database', async () => {
    const db = fakeDb();

    const result = await resetPassword(db, token, 'weak', { now });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errors).toContain('Password must be at least 8 characters');
    expect(db.calls).toHaveLength(0);
  });

  test('rejects a missing token', async () => {
    const db = fakeDb();

    const result = await resetPassword(db, '', 'MyPass@99', { now });

    expect(result).toEqual({ ok: false, status: 400, errors: ['This reset link is invalid or has expired'] });
    expect(db.calls).toHaveLength(0);
  });

  test('rejects a token that is unknown, used or expired and changes no password', async () => {
    const db = fakeDb({ 'UPDATE password_reset_tokens': { rows: [] } });

    const result = await resetPassword(db, token, 'MyPass@99', { now });

    expect(result).toEqual({ ok: false, status: 400, errors: ['This reset link is invalid or has expired'] });
    expect(db.calls.some((c) => c.sql.includes('UPDATE users'))).toBe(false);
  });

  test('looks the token up by its hash and passes the current time', async () => {
    const db = fakeDb({ 'UPDATE password_reset_tokens': { rows: [] } });

    await resetPassword(db, token, 'MyPass@99', { now });

    const claim = db.calls[0];
    expect(claim.params[0]).toBe(hashToken(token));
    expect(claim.params[1].getTime()).toBe(now);
  });

  test('saves a bcrypt hash of the new password for the token owner', async () => {
    const db = fakeDb({ 'RETURNING user_id': { rows: [{ user_id: 7 }] } });

    const result = await resetPassword(db, token, 'MyPass@99', { now });

    expect(result).toEqual({ ok: true });
    const update = db.calls.find((c) => c.sql.includes('UPDATE users'));
    expect(update.params[1]).toBe(7);
    expect(update.params[0]).not.toBe('MyPass@99');
    expect(await bcrypt.compare('MyPass@99', update.params[0])).toBe(true);
  });

  test('cancels the owner\'s other unused tokens after a successful reset', async () => {
    const db = fakeDb({ 'RETURNING user_id': { rows: [{ user_id: 7 }] } });

    await resetPassword(db, token, 'MyPass@99', { now });

    const cancels = db.calls.filter((c) => c.sql.includes('UPDATE password_reset_tokens') && !c.sql.includes('RETURNING'));
    expect(cancels).toHaveLength(1);
    expect(cancels[0].params[0]).toBe(7);
  });
});
