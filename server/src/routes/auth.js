import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { validateRegistration } from '../utils/validation.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const { valid, errors } = validateRegistration({ email, password });
  if (!valid) {
    return res.status(400).json({ error: errors });
  }

  try {
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password and create user
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, auth_provider)
       VALUES ($1, $2, 'local')
       RETURNING id, email, created_at`,
      [email.trim().toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
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
    // Find user by email
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if this is a Google-only account (no password set)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google sign-in' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

export default router;
