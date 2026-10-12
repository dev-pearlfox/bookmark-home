/**
 * Snapshot = everything worth backing up:
 *
 *   { categories, bookmarks, layout: { colHeights, secondaryHeights, containerGrid } }
 *
 * `categories` + `bookmarks` are the app state (persisted to localStorage by
 * storage.js). `layout` carries the per-category sizing maps, which live in
 * their own localStorage keys at runtime but must travel with a backup,
 * otherwise a restore brings back your bookmarks but resets your columns.
 *
 * This module is the single gatekeeper for "is this JSON safe to load?" —
 * used by localStorage loading, backup-file picking, and restore.
 */

import { isSafeHttpUrl } from './metadata.js';

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Structural check only — enough to guarantee App can render without
 * throwing (`categories.map`, `bookmarks.filter`, etc.). Deliberately
 * lenient about optional fields so older backups keep loading.
 */
export function isValidState(s) {
  if (!isPlainObject(s)) return false;
  if (!Array.isArray(s.categories) || s.categories.length === 0) return false;
  if (!Array.isArray(s.bookmarks)) return false;
  if (!s.categories.every((c) => isPlainObject(c) && typeof c.id === 'string')) return false;
  return s.bookmarks.every(
    (b) => isPlainObject(b) && typeof b.id === 'string' && typeof b.url === 'string'
  );
}

export function buildSnapshot(state, layout) {
  return { categories: state.categories, bookmarks: state.bookmarks, layout };
}

export function serializeSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Validate + split a parsed JSON blob into app state and layout maps.
 * Returns null if it isn't a usable snapshot. `layout` is always an object
 * (empty for pre-layout backups) so callers can read keys safely.
 *
 * Bookmarks whose URL isn't absolute http(s) (e.g. `javascript:`) are
 * dropped individually — one poisoned entry must not discard the whole
 * library. `dropped` tells the caller how many were removed.
 */
export function splitSnapshot(raw) {
  if (!isValidState(raw)) return null;
  const bookmarks = raw.bookmarks.filter((b) => isSafeHttpUrl(b.url));
  return {
    state: { categories: raw.categories, bookmarks },
    layout: isPlainObject(raw.layout) ? raw.layout : {},
    dropped: raw.bookmarks.length - bookmarks.length,
  };
}
