// Turns a US ZIP code into coordinates using Zippopotam.us (free, no API key).
// Ticketmaster only applies a search radius to coordinates, so the onboarding
// preferences store these alongside the ZIP code.
const ZIP_API = 'https://api.zippopotam.us/us';

// Returns { lat, lng, place } for a known ZIP code, or null if it doesn't exist.
// Throws if the lookup service can't be reached. fetchFn is swappable for tests.
export async function lookupZip(zip, fetchFn = fetch) {
  const res = await fetchFn(`${ZIP_API}/${encodeURIComponent(zip)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ZIP lookup failed (${res.status})`);

  const data = await res.json();
  const first = data.places?.[0];
  if (!first) return null;

  const lat = Number(first.latitude);
  const lng = Number(first.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    place: [first['place name'], first['state abbreviation']].filter(Boolean).join(', '),
  };
}
