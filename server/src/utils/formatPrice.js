/**
 * Turn an event's raw price fields into the label shown on event cards.
 */
export function formatPriceLabel({ price_min, price_max, currency }) {
  if (price_min === null || price_min === undefined) {
    return 'Price TBA';
  }
  if (price_min === 0) {
    return 'Free';
  }
  if (price_min === price_max) {
    return '$' + price_min;
  }
  return 'Price TBA';
}
