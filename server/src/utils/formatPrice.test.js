import { describe, test, expect } from '@jest/globals';
import { formatPriceLabel } from './formatPrice.js';

// HW5: these tests were written one at a time, each before the code that makes it pass.
// The commit history shows the red-green-refactor order.

describe('formatPriceLabel', () => {
  // Cycle 1: Ticketmaster often leaves out priceRanges, so the price comes through as null.
  test('shows "Price TBA" when there is no price', () => {
    expect(formatPriceLabel({ price_min: null, price_max: null, currency: null })).toBe('Price TBA');
  });

  // Cycle 2: a price of 0 means the event is free (this is why HW4 fixed price 0 being stored as null).
  test('shows "Free" when the price is 0', () => {
    expect(formatPriceLabel({ price_min: 0, price_max: 0, currency: 'USD' })).toBe('Free');
  });

  // Cycle 3: when min and max match, there is only one ticket price to show.
  test('shows a single price when min and max are the same', () => {
    expect(formatPriceLabel({ price_min: 25, price_max: 25, currency: 'USD' })).toBe('$25');
  });

  // Cycle 4: different min and max means a range of ticket prices.
  test('shows a range when min and max are different', () => {
    expect(formatPriceLabel({ price_min: 25, price_max: 60, currency: 'USD' })).toBe('$25 - $60');
  });
});
