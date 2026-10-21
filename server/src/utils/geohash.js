// Encodes a latitude/longitude pair as a geohash string.
// Ticketmaster's Discovery API searches by location with a "geoPoint" geohash
// (its older latlong parameter is deprecated).
//
// A geohash works by repeatedly cutting the map in half: each bit says whether
// the point is in the upper or lower half of the current longitude or latitude
// range. Every 5 bits become one base-32 character, so longer hashes are more precise.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude, longitude, precision = 9) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates');
  }

  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let hash = '';
  let bits = 0;
  let bitCount = 0;
  let useLongitude = true; // geohashes alternate, starting with longitude

  while (hash.length < precision) {
    const range = useLongitude ? lngRange : latRange;
    const value = useLongitude ? lng : lat;
    const mid = (range[0] + range[1]) / 2;

    if (value >= mid) {
      bits = (bits << 1) | 1;
      range[0] = mid;
    } else {
      bits = bits << 1;
      range[1] = mid;
    }

    useLongitude = !useLongitude;
    bitCount += 1;

    if (bitCount === 5) {
      hash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return hash;
}
