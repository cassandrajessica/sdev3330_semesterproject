// Helpers for showing event dates and building Ticketmaster date ranges.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Turns "2026-10-25" into a Date at local midnight. Saved events come back from
// Postgres as full timestamps, so only the first 10 characters are used.
export function parseDateOnly(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// "Sat, Oct 25 · 7:30 PM", or just the date when there is no time.
export function formatEventDate(startDate, startTime) {
  const date = parseDateOnly(startDate);
  if (!date) return 'Date TBA';

  let label = `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;

  if (startTime) {
    const [h, min] = startTime.split(':').map(Number);
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    label += ` · ${hour12}:${String(min).padStart(2, '0')} ${ampm}`;
  }
  return label;
}

// Short pieces for the date badge on event cards: { month: "OCT", day: "25" }
export function dateBadge(startDate) {
  const date = parseDateOnly(startDate);
  if (!date) return null;
  return { month: MONTHS[date.getMonth()].toUpperCase(), day: String(date.getDate()) };
}

// True when the event's date is before today.
export function isPast(startDate) {
  const date = parseDateOnly(startDate);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Ticketmaster wants "YYYY-MM-DDTHH:mm:ssZ" with no milliseconds.
function toTicketmasterTime(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 0);
  return d;
}

// Returns { startDateTime, endDateTime } for a date filter, or {} for "any".
export function dateRangeFor(filter, now = new Date()) {
  if (filter === 'today') {
    return { startDateTime: toTicketmasterTime(now), endDateTime: toTicketmasterTime(endOfDay(now)) };
  }

  if (filter === 'weekend') {
    // From Friday 5 PM (or now, if it is already the weekend) through Sunday night.
    const day = now.getDay();
    const daysUntilFriday = day === 0 ? -2 : 5 - day; // Sunday counts as this weekend
    const friday = new Date(now);
    friday.setDate(now.getDate() + daysUntilFriday);
    friday.setHours(17, 0, 0, 0);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    const start = friday > now ? friday : now;
    return { startDateTime: toTicketmasterTime(start), endDateTime: toTicketmasterTime(endOfDay(sunday)) };
  }

  if (filter === 'month') {
    const end = new Date(now);
    end.setDate(now.getDate() + 30);
    return { startDateTime: toTicketmasterTime(now), endDateTime: toTicketmasterTime(endOfDay(end)) };
  }

  return {};
}
