// Saving and loading a user's onboarding preferences.
// The database is passed in so tests can use a fake one.

const COLUMNS = 'zip, lat, lng, place, radius, categories';

// Turns a user_preferences row into what the client uses.
function toPreferences(row) {
  return {
    zip: row.zip,
    lat: row.lat,
    lng: row.lng,
    place: row.place,
    radius: row.radius,
    categories: row.categories,
  };
}

// Returns the user's preferences, or null if they haven't set any yet.
export async function getPreferences(db, userId) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM user_preferences WHERE user_id = $1`, [userId]);
  return rows.length > 0 ? toPreferences(rows[0]) : null;
}

// Creates or replaces the user's preferences. Expects values that already
// passed validatePreferences, plus lat/lng/place from lookupZip.
export async function savePreferences(db, userId, { zip, lat, lng, place, radius, categories }) {
  const { rows } = await db.query(
    `INSERT INTO user_preferences (user_id, zip, lat, lng, place, radius, categories, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET zip = EXCLUDED.zip, lat = EXCLUDED.lat, lng = EXCLUDED.lng, place = EXCLUDED.place,
                   radius = EXCLUDED.radius, categories = EXCLUDED.categories, updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [userId, zip, lat, lng, place, radius, categories]
  );
  return toPreferences(rows[0]);
}
