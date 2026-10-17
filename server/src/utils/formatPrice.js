/**
 * Turn an event's raw price fields into the label shown on event cards.
 */
export function formatPriceLabel({ price_min, price_max, currency }) {
  // == null catches both null and undefined (no price data from Ticketmaster)
  if (price_min == null) {
    return 'Price TBA';
  }
  if (price_min === 0) {
    return 'Free';
  }
  if (price_min === price_max) {
    return formatAmount(price_min);
  }
  return formatAmount(price_min) + ' - ' + formatAmount(price_max);
}

// Formats one dollar amount, like 25 -> "$25".
function formatAmount(amount) {
  return '$' + amount;
}
