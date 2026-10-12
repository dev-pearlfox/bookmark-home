/**
 * Page zoom: pure rules (no DOM). The slider and the +/- buttons all go
 * through these so the range and step are defined in exactly one place.
 * Values are whole percentages (100 = normal).
 */

export const ZOOM_MIN = 70;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

/** Anything (a saved string, a slider value, garbage) -> a valid zoom step. */
export function clampZoom(value) {
  // Only numbers and non-blank strings count. Number(null), Number([]) and
  // Number('') are all 0, which would clamp to the minimum instead of 100.
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  const n = isNumeric ? Number(value) : NaN;
  if (!Number.isFinite(n)) return ZOOM_DEFAULT;
  const snapped = Math.round(n / ZOOM_STEP) * ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, snapped));
}

/** One step in or out (`direction` is +1 or -1), staying inside the range. */
export function stepZoom(current, direction) {
  return clampZoom(clampZoom(current) + Math.sign(direction) * ZOOM_STEP);
}

export const canZoomIn = (z) => clampZoom(z) < ZOOM_MAX;
export const canZoomOut = (z) => clampZoom(z) > ZOOM_MIN;

/**
 * The page zoom as a factor (1 = 100%), read from the `--pf-zoom` variable
 * App.jsx sets on <html>. Code that mixes screen pixels (pointer positions,
 * getBoundingClientRect) with CSS pixels must divide by this, because CSS
 * `zoom` scales CSS pixels but not what the pointer reports. `root` is
 * injectable so this stays testable without a DOM.
 */
export function readZoomFactor(root = typeof document !== 'undefined' ? document.documentElement : null) {
  const raw = root?.style?.getPropertyValue?.('--pf-zoom');
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(ZOOM_MAX / 100, Math.max(ZOOM_MIN / 100, n));
}
