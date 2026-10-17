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
});
