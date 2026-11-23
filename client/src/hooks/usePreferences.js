import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

// Loads the signed-in user's onboarding preferences (home ZIP, travel radius,
// favorite categories). Pass enabled = false when the onboarding flag is off
// or nobody is signed in, and it skips the request.
export default function usePreferences(enabled) {
  const [state, setState] = useState({ preferences: null, loading: true });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiFetch('/api/onboarding/preferences')
      .then((data) => !cancelled && setState({ preferences: data.preferences, loading: false }))
      .catch(() => !cancelled && setState({ preferences: null, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? state : { preferences: null, loading: false };
}
