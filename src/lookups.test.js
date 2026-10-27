import { describe, expect, it } from 'vitest';
import { parseLookups, serializeLookups } from './lookups.js';

describe('parseLookups', () => {
  it('is on when nothing is saved (the app has always looked things up)', () => {
    expect(parseLookups(null)).toBe(true);
    expect(parseLookups(undefined)).toBe(true);
  });
  it('is off only for the exact text "off"', () => {
    expect(parseLookups('off')).toBe(false);
    expect(parseLookups('on')).toBe(true);
  });
  it.each(['', 'OFF', 'false', '0', 'garbage', ' off'])('treats the damaged value %j as on, never as off', (raw) => {
    expect(parseLookups(raw)).toBe(true);
  });
});

describe('serializeLookups', () => {
  it('writes on / off', () => {
    expect(serializeLookups(true)).toBe('on');
    expect(serializeLookups(false)).toBe('off');
  });
  it('round-trips through parseLookups', () => {
    for (const on of [true, false]) expect(parseLookups(serializeLookups(on))).toBe(on);
  });
});
