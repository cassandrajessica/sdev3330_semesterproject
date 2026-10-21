import { describe, test, expect } from '@jest/globals';
import { encodeGeohash } from './geohash.js';

describe('encodeGeohash', () => {
  // Reference value from the original geohash.org example
  test('encodes a known point', () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
  });

  test('defaults to 9 characters', () => {
    expect(encodeGeohash(32.7767, -96.797)).toHaveLength(9);
  });

  test('nearby points share a prefix', () => {
    // Downtown Dallas and Deep Ellum are about 2 km apart, so they land in the
    // same 4-character cell (roughly 20 km by 39 km)
    const downtown = encodeGeohash(32.7767, -96.797);
    const deepEllum = encodeGeohash(32.7845, -96.7826);
    expect(downtown.slice(0, 4)).toBe(deepEllum.slice(0, 4));
  });

  test('far apart points do not share a prefix', () => {
    const dallas = encodeGeohash(32.7767, -96.797);
    const chicago = encodeGeohash(41.8781, -87.6298);
    expect(dallas.slice(0, 2)).not.toBe(chicago.slice(0, 2));
  });

  // BVA: the edges of the valid ranges
  test('accepts the boundary coordinates', () => {
    expect(() => encodeGeohash(90, 180)).not.toThrow();
    expect(() => encodeGeohash(-90, -180)).not.toThrow();
  });

  test('rejects coordinates just outside the valid range', () => {
    expect(() => encodeGeohash(90.0001, 0)).toThrow('Invalid coordinates');
    expect(() => encodeGeohash(0, -180.0001)).toThrow('Invalid coordinates');
  });

  test('rejects values that are not numbers', () => {
    expect(() => encodeGeohash('abc', 10)).toThrow('Invalid coordinates');
  });
});
