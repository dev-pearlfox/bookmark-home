import { describe, expect, it } from 'vitest';
import {
  ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, applyZoom, canZoomIn, canZoomOut, clampZoom, readZoomFactor, stepZoom,
} from './zoom.js';

const rootWith = (value) => ({ style: { getPropertyValue: () => value } });

describe('ZOOM_DEFAULT', () => {
  it('is 90, the size the app opens at (owner decision)', () => {
    expect(ZOOM_DEFAULT).toBe(90);
  });
  it('is a valid step inside the range', () => {
    expect(clampZoom(ZOOM_DEFAULT)).toBe(ZOOM_DEFAULT);
  });
});

describe('clampZoom', () => {
  it('keeps valid steps as they are', () => {
    for (const z of [70, 80, 90, 100, 110]) expect(clampZoom(z)).toBe(z);
  });
  it('clamps to the range', () => {
    expect(clampZoom(10)).toBe(ZOOM_MIN);
    expect(clampZoom(500)).toBe(ZOOM_MAX);
    expect(clampZoom(-50)).toBe(ZOOM_MIN);
    expect(clampZoom(150)).toBe(110);   // a larger zoom saved by an earlier version
    expect(clampZoom(200)).toBe(110);
  });
  it('snaps in-between values to the nearest 10', () => {
    expect(clampZoom(104)).toBe(100);
    expect(clampZoom(106)).toBe(110);
  });
  it('accepts numeric strings (saved value, slider value)', () => {
    expect(clampZoom('100')).toBe(100);
    expect(clampZoom(' 80 ')).toBe(80);
  });
  it('falls back to the default for garbage, so a bad saved value never breaks the page', () => {
    for (const bad of [undefined, null, NaN, '', '  ', 'abc', {}, [], Infinity]) {
      expect(clampZoom(bad)).toBe(ZOOM_DEFAULT);
    }
  });
});

describe('stepZoom', () => {
  it('moves one step in either direction', () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
  });
  it('stops at both ends', () => {
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
  it('treats the direction by sign only', () => {
    expect(stepZoom(100, 5)).toBe(110);
    expect(stepZoom(100, -99)).toBe(90);
  });
  it('recovers from an invalid current value', () => {
    expect(stepZoom('junk', 1)).toBe(ZOOM_DEFAULT + 10);
  });
});

describe('canZoomIn / canZoomOut', () => {
  it('disable at the limits only', () => {
    expect(canZoomIn(ZOOM_MAX)).toBe(false);
    expect(canZoomIn(ZOOM_MAX - 10)).toBe(true);
    expect(canZoomOut(ZOOM_MIN)).toBe(false);
    expect(canZoomOut(ZOOM_MIN + 10)).toBe(true);
  });
});

describe('readZoomFactor', () => {
  it('reads the factor the app set on the root element', () => {
    expect(readZoomFactor(rootWith('1.1'))).toBe(1.1);
    expect(readZoomFactor(rootWith('0.7'))).toBe(0.7);
  });
  it('is 1 when nothing is set or the value is junk', () => {
    expect(readZoomFactor(rootWith(''))).toBe(1);
    expect(readZoomFactor(rootWith('banana'))).toBe(1);
    expect(readZoomFactor(null)).toBe(1);
    expect(readZoomFactor({})).toBe(1);
  });
  it('stays inside the supported range', () => {
    expect(readZoomFactor(rootWith('9'))).toBe(1.1);
    expect(readZoomFactor(rootWith('0.01'))).toBe(0.7);
  });
});

describe('applyZoom', () => {
  const fakeRoot = () => {
    const set = {};
    return { set, style: { setProperty: (k, v) => { set[k] = v; } } };
  };
  it('writes the factor the stylesheet turns into CSS zoom', () => {
    const r = fakeRoot(); applyZoom(110, r);
    expect(r.set['--pf-zoom']).toBe('1.1');
  });
  it('never writes an out-of-range or invalid factor', () => {
    const r = fakeRoot();
    applyZoom(9999, r); expect(r.set['--pf-zoom']).toBe('1.1');
    applyZoom(1, r); expect(r.set['--pf-zoom']).toBe('0.7');
    applyZoom(null, r); expect(r.set['--pf-zoom']).toBe(String(ZOOM_DEFAULT / 100));
  });
  it('does nothing without a root (no DOM)', () => {
    expect(() => applyZoom(100, null)).not.toThrow();
  });
});
