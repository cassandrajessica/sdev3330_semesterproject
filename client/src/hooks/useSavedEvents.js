import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, clearSession, getStoredUser, getToken } from '../api.js';
import { isPast } from '../utils/dates.js';

// Keeps track of who is signed in and which events they have saved.
// Event cards use ticketmaster_id, but DELETE /api/events/saved/:eventId needs
// our own database id, so this hook keeps a lookup from one to the other.
export default function useSavedEvents() {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    setSaved([]);
  }, []);

  // A 401/403 means the token is missing or expired, so treat it as signed out.
  const handleAuthError = useCallback(
    (err) => {
      if (err.status === 401 || err.status === 403) signOut();
    },
    [signOut]
  );

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/events/saved');
      setSaved(data.saved_events || []);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    // Loading saved events when the page opens is a real sync with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // ticketmaster_id -> database id
  const savedIds = useMemo(() => {
    const map = new Map();
    saved.forEach((e) => map.set(e.ticketmaster_id, e.id));
    return map;
  }, [saved]);

  const isSaved = useCallback((ticketmasterId) => savedIds.has(ticketmasterId), [savedIds]);

  // Saves or unsaves an event. Returns false when the user needs to sign in first.
  const toggleSave = useCallback(
    async (event) => {
      if (!getToken()) return false;
      try {
        if (savedIds.has(event.ticketmaster_id)) {
          await apiFetch(`/api/events/saved/${savedIds.get(event.ticketmaster_id)}`, { method: 'DELETE' });
        } else {
          // The server adds price_label for display; it is not a database column.
          // eslint-disable-next-line no-unused-vars
          const { price_label, ...eventData } = event;
          await apiFetch('/api/events/saved', { method: 'POST', body: JSON.stringify({ event: eventData }) });
        }
        await refresh();
      } catch (err) {
        handleAuthError(err);
      }
      return true;
    },
    [savedIds, refresh, handleAuthError]
  );

  const removeSaved = useCallback(
    async (dbId) => {
      try {
        await apiFetch(`/api/events/saved/${dbId}`, { method: 'DELETE' });
        await refresh();
      } catch (err) {
        handleAuthError(err);
      }
    },
    [refresh, handleAuthError]
  );

  const upcoming = useMemo(() => saved.filter((e) => !isPast(e.start_date)), [saved]);
  const past = useMemo(() => saved.filter((e) => isPast(e.start_date)), [saved]);

  return { user, loading, upcoming, past, isSaved, toggleSave, removeSaved, signOut };
}

// Returns a heart-button handler that sends signed-out visitors to the login page.
export function useSaveHandler(saved, navigate) {
  return useCallback(
    async (event) => {
      const ok = await saved.toggleSave(event);
      if (!ok) navigate('/login');
    },
    [saved, navigate]
  );
}
