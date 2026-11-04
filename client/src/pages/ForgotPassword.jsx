import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api.js';
import './Login.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [googleOnly, setGoogleOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setGoogleOnly(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Could not send the reset link');
        return;
      }
      setGoogleOnly(Boolean(data.googleOnly));
      setMessage(data.message);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">HeyCiti</div>

        <div className="login-form-wrap">
          <h1 className="login-heading">Forgot your<br />password?</h1>
          <p className="login-signup-link" style={{ marginBottom: 20 }}>
            Enter your email and we will send you a link to choose a new one.
          </p>

          {message ? (
            <>
              <p className="login-success">{message}</p>
              {googleOnly && (
                <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
                  Back to sign in
                </Link>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                required
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          {!googleOnly && (
            <p className="login-signup-link" style={{ marginTop: 24 }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          )}
        </div>
      </div>

      <div className="login-right">
        <div className="login-hero-img" />
      </div>
    </div>
  );
}

export default ForgotPassword;
