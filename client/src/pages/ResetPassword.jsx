import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../api.js';
import './Login.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server sends a list of problems for validation errors and a string otherwise.
        const message = Array.isArray(data.error) ? data.error.join('. ') : data.error;
        setError(message || 'Could not reset your password');
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  let content;
  if (!token) {
    content = (
      <>
        <p className="login-error">This reset link is missing its code. Please use the link from your email, or request a new one.</p>
        <p className="login-signup-link" style={{ marginTop: 24 }}>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </>
    );
  } else if (done) {
    content = (
      <>
        <p className="login-success">Your password has been updated.</p>
        <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
          Sign in
        </Link>
      </>
    );
  } else {
    content = (
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="login-input"
          required
        />
        <p className="login-signup-link" style={{ textAlign: 'left' }}>
          At least 8 characters, with one uppercase letter and one special character.
        </p>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Saving...' : 'Update password'}
        </button>

        {error.includes('invalid or has expired') && (
          <p className="login-signup-link">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">HeyCiti</div>

        <div className="login-form-wrap">
          <h1 className="login-heading">Choose a new<br />password</h1>
          {content}
        </div>
      </div>

      <div className="login-right">
        <div className="login-hero-img" />
      </div>
    </div>
  );
}

export default ResetPassword;
