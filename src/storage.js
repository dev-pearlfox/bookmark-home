/**
 * Thin wrapper around localStorage.
 * All persistence goes through here — never sprinkle localStorage calls
 * across components. Every function swallows storage errors (private mode,
 * quota exceeded, blocked storage) so a failing disk never crashes the UI.
 */

import { splitSnapshot } from './snapshot.js';

const KEY = 'pf.bookmarkHome.v1';

/** Returns `{ categories, bookmarks }`, or null if nothing usable is stored. */
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = splitSnapshot(JSON.parse(raw));
    if (!parsed) {
      console.warn('[storage] stored state is malformed; ignoring it');
      return null;
    }
    if (parsed.dropped) {
      console.warn(`[storage] dropped ${parsed.dropped} bookmark(s) with unsafe URLs`);
    }
    return parsed.state;
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

/* --- Generic key -> plain-object maps (layout sizes etc.) ----------- */

/** Load a stored plain object; `{}` if missing, malformed, or not an object. */
export function loadMap(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMap(storageKey, map) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch (err) {
    console.warn(`[storage] failed to save ${storageKey}`, err);
  }
}
