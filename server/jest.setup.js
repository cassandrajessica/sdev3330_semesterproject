// Runs before every test file. Request spacing is switched off here so tests that
// send requests back to back are not slowed down. The rate limit tests set their own value.
process.env.TICKETMASTER_MIN_INTERVAL_MS = '0';
