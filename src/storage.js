/**
 * Thin, typed-ish wrapper around localStorage.
 * All persistence goes through here — never sprinkle localStorage.setItem
 * across components.
 */

const KEY = 'pf.bookmarkHome.v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (err) {
    console.warn('[storage] failed to load state', err);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[storage] failed to save state', err);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn('[storage] failed to clear state', err);
  }
}
