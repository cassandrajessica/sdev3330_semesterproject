import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

// Feature flags come from the server (GET /api/flags), which reads the
// Supabase feature_flags table. They are fetched once per page load, so
// flipping a flag in Supabase shows up after a refresh with no redeploy.
let flagsPromise = null;

function loadFlags() {
  if (!flagsPromise) {
    // If the server can't be reached, treat every flag as off.
    flagsPromise = apiFetch('/api/flags').catch(() => ({}));
  }
  return flagsPromise;
}

export default function useFlags() {
  const [state, setState] = useState({ flags: {}, loading: true });

  useEffect(() => {
    let cancelled = false;
    loadFlags().then((flags) => !cancelled && setState({ flags, loading: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
