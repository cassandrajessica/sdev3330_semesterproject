import crypto from 'node:crypto';

// A reset link works for 1 hour.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// SHA-256 hash of a token. We store this hash in the database, never the token itself,
// so a leaked database does not give anyone working reset links.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Make a new reset token.
 *
 * @param {number} [now] - Current time in ms (passed in so tests can control it)
 * @returns {{ token: string, tokenHash: string, expiresAt: Date }}
 *   token is emailed to the user, tokenHash and expiresAt are stored.
 */
export function generateResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
  };
}

/**
 * A token can be used if its row exists, it has not been used, and it has not expired.
 * A token that expires at exactly `now` is already expired.
 */
export function isTokenUsable(row, now = Date.now()) {
  if (!row) return false;
  if (row.used_at) return false;
  return new Date(row.expires_at).getTime() > now;
}
