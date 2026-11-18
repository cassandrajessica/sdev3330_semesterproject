import bcrypt from 'bcrypt';
import { generateResetToken, hashToken } from '../utils/resetToken.js';
import { validatePassword } from '../utils/validation.js';

const INVALID_LINK = 'This reset link is invalid or has expired';

/**
 * Start a password reset: create a token for the account and email the link.
 * Does nothing when there is no account for the email. For a Google-only account it makes no token
 * and returns googleOnly: true so the page can tell the user to sign in with Google. The caller should give the
 * same answer either way so the endpoint cannot be used to find out who has an account.
 *
 * @param {{ query: Function }} db
 * @param {string} email
 * @param {{ sendEmail: Function, clientUrl: string, now?: number }} options
 * @returns {Promise<{ sent: boolean, googleOnly?: boolean }>}
 */
export async function requestPasswordReset(db, email, { sendEmail, clientUrl, now = Date.now() }) {
  if (typeof email !== 'string' || email.trim() === '') {
    return { sent: false };
  }

  const normalized = email.trim().toLowerCase();
  const found = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [normalized]);
  if (found.rows.length === 0) {
    return { sent: false };
  }
  const user = found.rows[0];

  // No saved password means the account signs in with Google only, so there is nothing to reset.
  // (auth_provider is not used here: it flips to 'google' when a password account later signs in
  // with Google, but that account still has its password.)
  if (!user.password_hash) {
    return { sent: false, googleOnly: true };
  }

  // Only the newest link should work.
  await db.query(
    'UPDATE password_reset_tokens SET used_at = $2 WHERE user_id = $1 AND used_at IS NULL',
    [user.id, new Date(now)]
  );

  const { token, tokenHash, expiresAt } = generateResetToken(now);
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  await sendEmail({
    to: user.email,
    resetUrl: `${clientUrl}/reset-password?token=${token}`,
  });

  return { sent: true };
}

/**
 * Finish a password reset: check the token and save the new password.
 *
 * @returns {Promise<{ ok: true } | { ok: false, status: number, errors: string[] }>}
 */
export async function resetPassword(db, token, newPassword, { now = Date.now() } = {}) {
  const passwordErrors = validatePassword(newPassword);
  if (passwordErrors.length > 0) {
    return { ok: false, status: 400, errors: passwordErrors };
  }

  if (typeof token !== 'string' || token === '') {
    return { ok: false, status: 400, errors: [INVALID_LINK] };
  }

  // One statement checks the token and marks it used, so two requests with the
  // same link cannot both succeed.
  const claimed = await db.query(
    `UPDATE password_reset_tokens
     SET used_at = $2
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
     RETURNING user_id`,
    [hashToken(token), new Date(now)]
  );
  if (claimed.rows.length === 0) {
    return { ok: false, status: 400, errors: [INVALID_LINK] };
  }
  const userId = claimed.rows[0].user_id;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

  // Any other links sent earlier stop working too.
  await db.query(
    'UPDATE password_reset_tokens SET used_at = $2 WHERE user_id = $1 AND used_at IS NULL',
    [userId, new Date(now)]
  );

  return { ok: true };
}
