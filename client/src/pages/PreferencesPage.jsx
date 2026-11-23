import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { ArrowLeft } from '../components/Icons.jsx';
import useFlags from '../hooks/useFlags.js';
import usePreferences from '../hooks/usePreferences.js';
import useSavedEvents from '../hooks/useSavedEvents.js';
import { RADIUS_OPTIONS } from '../hooks/useUserLocation.js';
import { apiFetch } from '../api.js';
import { CATEGORIES } from '../utils/categories.js';
import './PreferencesPage.css';

// /preferences: where a signed-in user sets their home ZIP code, how far they'll
// travel, and their favorite categories. Only exists while the onboarding flag is on.
function PreferencesPage() {
  const navigate = useNavigate();
  const saved = useSavedEvents();
  const { flags, loading: flagsLoading } = useFlags();
  const enabled = !!flags.onboarding && !!saved.user;
  const { preferences, loading } = usePreferences(enabled);

  if (!flagsLoading && !flags.onboarding) return <Navigate to="/dashboard" replace />;
  if (!saved.user) return <Navigate to="/login" replace />;

  return (
    <Layout saved={saved} onSearch={() => navigate('/dashboard')}>
      <section className="prefs-hero">
        <Link to="/dashboard" className="prefs-hero__back">
          <ArrowLeft width={18} height={18} /> Back to events
        </Link>
        <h1>Your Preferences</h1>
        <p>Tell us where you are and what you&rsquo;re into, and we&rsquo;ll pick events for you.</p>
      </section>

      {flagsLoading || loading ? (
        <div className="skeleton prefs-skeleton" />
      ) : (
        <PreferencesForm initial={preferences} onSaved={() => navigate('/dashboard')} />
      )}
    </Layout>
  );
}

function PreferencesForm({ initial, onSaved }) {
  const [zip, setZip] = useState(initial?.zip || '');
  const [radius, setRadius] = useState(initial?.radius || 25);
  const [categories, setCategories] = useState(initial?.categories || []);
  const [status, setStatus] = useState({ saving: false, error: '' });

  function toggleCategory(id) {
    setCategories((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (categories.length === 0) {
      setStatus({ saving: false, error: 'Pick at least one category.' });
      return;
    }
    setStatus({ saving: true, error: '' });
    try {
      await apiFetch('/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({ zip, radius, categories }),
      });
      onSaved();
    } catch (err) {
      setStatus({ saving: false, error: err.message });
    }
  }

  return (
    <form className="prefs-form" onSubmit={handleSubmit}>
      <fieldset className="prefs-field">
        <legend>Home location</legend>
        <label htmlFor="prefs-zip" className="prefs-hint">ZIP code</label>
        <input
          id="prefs-zip"
          className="prefs-input"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="\d{5}"
          placeholder="75189"
          required
        />
      </fieldset>

      <fieldset className="prefs-field">
        <legend>How far will you travel?</legend>
        <div className="chips" role="group" aria-label="Travel radius">
          {RADIUS_OPTIONS.map((r) => (
            <button key={r} type="button" className={`chip ${radius === r ? 'is-active' : ''}`} onClick={() => setRadius(r)} aria-pressed={radius === r}>
              {r} mi
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="prefs-field">
        <legend>Favorite categories</legend>
        <div className="chips" role="group" aria-label="Favorite categories">
          {CATEGORIES.map((c) => {
            const on = categories.includes(c.id);
            return (
              <button key={c.id} type="button" className={`chip ${on ? 'is-active' : ''}`} onClick={() => toggleCategory(c.id)} aria-pressed={on}>
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {status.error && <p className="loc-error" role="alert">{status.error}</p>}

      <button type="submit" className="pill-btn" disabled={status.saving}>
        {status.saving ? 'Saving...' : 'Save preferences'}
      </button>
    </form>
  );
}

export default PreferencesPage;
