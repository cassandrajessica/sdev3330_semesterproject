/**
 * Turn an event's raw price fields into the label shown on event cards.
 */
export function formatPriceLabel({ price_min, price_max, currency }) {
  if (price_min === 0) {
    return 'Free';
  }
  return 'Price TBA';
}
