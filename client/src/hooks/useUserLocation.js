import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'heyciti_location';
const DEFAULT_LOCATION = { mode: 'manual', city: 'Dallas', stateCode: 'TX' };
export const RADIUS_OPTIONS = [10, 25, 50];

// Reads the saved location. "chosen" is false until the person picks one,
// which is how the dashboard knows whether to offer turning on location.
function loadLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.mode === 'geo' || saved?.mode === 'manual') return { ...saved, chosen: true };
  } catch {
    // ignore bad data and fall back to the default
  }
  return { ...DEFAULT_LOCATION, chosen: false };
}

function saveLocation(location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // storage can be blocked (private windows); the location still works for this visit
  }
}

// Plain-language messages for the browser's geolocation error codes.
const GEO_ERRORS = {
  1: "Location access is blocked. Allow it in your browser's site settings, or enter a city instead.",
  2: "We couldn't figure out where you are right now. Try again or enter a city.",
  3: 'Finding your location took too long. Try again or enter a city.',
};

// Where to search for events: the browser's location ("geo") or a city the
// person typed ("manual"). Returns the search params for the backend.
export default function useUserLocation() {
  const [location, setLocation] = useState(loadLocation);
  const [status, setStatus] = useState('idle'); // idle | locating | error
  const [error, setError] = useState('');

  const update = useCallback((next) => {
    saveLocation(next);
    setLocation({ ...next, chosen: true });
  }, []);

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError("This browser doesn't support location. Enter a city instead.");
      return;
    }

    setStatus('locating');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('idle');
        update({
          mode: 'geo',
          // 4 decimal places is about 11 meters, plenty for finding events
          lat: Number(position.coords.latitude.toFixed(4)),
          lng: Number(position.coords.longitude.toFixed(4)),
          radius: location.radius || 25,
        });
      },
      (err) => {
        setStatus('error');
        setError(GEO_ERRORS[err.code] || GEO_ERRORS[2]);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, [update, location.radius]);

  const setManual = useCallback(
    (city, stateCode) => {
      setStatus('idle');
      setError('');
      update({ mode: 'manual', city: city.trim() || DEFAULT_LOCATION.city, stateCode: stateCode.trim().toUpperCase().slice(0, 2) });
    },
    [update]
  );

  const setRadius = useCallback((radius) => update({ ...location, radius }), [update, location]);

  // If the person has never picked a location but already allowed location
  // access for this site, use it right away without showing a prompt.
  useEffect(() => {
    if (location.chosen || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (result.state === 'granted') requestGeo();
      })
      .catch(() => {});
    // Only check once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGeo = location.mode === 'geo';

  return {
    location,
    isGeo,
    status,
    error,
    requestGeo,
    setManual,
    setRadius,
    // Params for /api/events/search
    params: isGeo ? { lat: location.lat, lng: location.lng, radius: location.radius || 25 } : { city: location.city, stateCode: location.stateCode },
    // Short label for buttons, and the words that follow "Events" in headings
    label: isGeo ? `Within ${location.radius || 25} mi` : [location.city, location.stateCode].filter(Boolean).join(', '),
    headingPlace: isGeo ? 'Near You' : `In ${location.city}`,
  };
}
