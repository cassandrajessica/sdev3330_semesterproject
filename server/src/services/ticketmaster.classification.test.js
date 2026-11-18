import { describe, test, expect } from '@jest/globals';
import { cleanClassification } from './ticketmaster.js';

describe('cleanClassification', () => {
  test('keeps a real category or genre', () => {
    expect(cleanClassification('Music')).toBe('Music');
    expect(cleanClassification('Rock')).toBe('Rock');
  });

  test('turns Ticketmaster\'s "Undefined" placeholder into null', () => {
    expect(cleanClassification('Undefined')).toBeNull();
  });

  test('turns a missing value into null', () => {
    expect(cleanClassification(undefined)).toBeNull();
    expect(cleanClassification('')).toBeNull();
  });
});
