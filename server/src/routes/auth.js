import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db.js';
import { validateRegistration } from '../utils/validation.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { requestPasswordReset, resetPassword } from '../services/passwordReset.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const { valid, errors } = validateRegistration({ email, password });
  if (!valid) {
    return res.status(400).json({ error: errors });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_provider)
       VALUES ($1, $2, 'local')
       RETURNING id, email, created_at`,
      [email.trim().toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Something went wrong during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google sign-in' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, sub: googleId, picture: avatarUrl } = payload;

    const existing = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let user;

    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE users
         SET google_id = $1, avatar_url = $2, auth_provider = 'google'
         WHERE email = $3
         RETURNING id, email`,
        [googleId, avatarUrl, email.toLowerCase()]
      );
      user = updated.rows[0];
    } else {
      const created = await pool.query(
        `INSERT INTO users (email, google_id, avatar_url, auth_provider)
         VALUES ($1, $2, $3, 'google')
         RETURNING id, email`,
        [email.toLowerCase(), googleId, avatarUrl]
      );
      user = created.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google sign-in successful',
      token,
      user: { id: user.id, email: user.email, avatarUrl },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// Password reset limits: 5 reset emails and 10 reset attempts per IP address every 15 minutes.
const forgotLimiter = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const resetLimiter = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

function tooManyRequests(res, retryAfterMs) {
  res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
}

// POST /api/auth/forgot-password
// Always answers the same way whether or not the email has an account.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const limit = forgotLimiter.check(req.ip);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  try {
    const result = await requestPasswordReset(pool, email, {
      sendEmail: sendPasswordResetEmail,
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    });

    // Same hint the login form already gives for Google accounts.
    if (result.googleOnly) {
      return res.json({
        googleOnly: true,
        message: 'This account signs in with Google. Use "Sign in with Google" on the sign in page.',
      });
    }
  } catch (err) {
    // Logged, but the user still gets the normal answer so errors cannot reveal which emails exist.
    console.error('Forgot password error:', err.message);
  }

  res.json({ message: 'If an account exists for that email, we sent a password reset link.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  const limit = resetLimiter.check(req.ip);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  try {
    const result = await resetPassword(pool, token, password);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.errors });
    }
    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Something went wrong while resetting your password' });
  }
});

export default router;
