/**
 * Reading a link that was dragged INTO the page from outside it (Chrome's
 * address bar, the bookmarks bar, another tab, a link on another site).
 *
 * This is native HTML drag-and-drop, completely separate from dnd-kit (which
 * runs on pointer events for moving cards inside the app).
 *
 * Browsers describe a dragged link in several formats:
 *  - `text/uri-list`  : the URL (standard; lines starting with # are comments)
 *  - `text/x-moz-url` : "url\ntitle" (Firefox)
 *  - `text/plain`     : the URL as text (also what a selected word looks like)
 * During `dragover` only `types` can be read, never the data (browser privacy
 * rule), so accepting the drag is decided from the types alone.
 */

import { isSafeHttpUrl } from './metadata.js';

const LINK_TYPES = ['text/uri-list', 'text/x-moz-url', 'text/plain'];

/** True if the drag might carry a link (only `types` are readable mid-drag). */
export function hasLinkPayload(dataTransfer) {
  const types = Array.from(dataTransfer?.types || []);
  return LINK_TYPES.some((t) => types.includes(t));
}

const firstUriListEntry = (text) =>
  text.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'));

/**
 * The dropped link as `{ url, title? }`, or null if it is not a usable web
 * link. Deliberately strict: the text must already be an absolute http(s) URL
 * that passes isSafeHttpUrl. Without that, dragging any selected word onto a
 * column would create a bookmark to "https://word".
 */
export function extractLink(dataTransfer) {
  if (!dataTransfer) return null;
  const read = (type) => {
    try { return dataTransfer.getData(type) || ''; } catch { return ''; }
  };

  const [mozUrl, ...mozTitle] = read('text/x-moz-url').split(/\r?\n/);
  const candidates = [
    { url: firstUriListEntry(read('text/uri-list') || '') },
    { url: mozUrl?.trim(), title: mozTitle.join(' ').trim() },
    { url: read('text/plain').trim() },
  ];
  for (const { url, title } of candidates) {
    if (url && isSafeHttpUrl(url)) return title ? { url, title } : { url };
  }
  return null;
}

/* --- Telling our own native drags apart from outside ones ------------ */
// The page's own links/images are natively draggable too. dnd-kit cancels
// those drags (preventDefault on dragstart); if one slips through, dropping
// it on a column must not create a duplicate bookmark of an existing card.
let internalDrag = false;

export const isInternalDrag = () => internalDrag;

/** Start tracking drags that begin inside this window. Returns a cleanup fn. */
export function trackInternalDrags(target = window) {
  // Bubbling phase on window runs after dnd-kit's document-level handler, so
  // `defaultPrevented` is already set for the drags it cancelled; those never
  // fire dragend, and must not leave the flag stuck on.
  const onStart = (e) => { internalDrag = !e.defaultPrevented; };
  const onEnd = () => { internalDrag = false; };
  target.addEventListener('dragstart', onStart);
  target.addEventListener('dragend', onEnd);
  target.addEventListener('drop', onEnd);
  return () => {
    target.removeEventListener('dragstart', onStart);
    target.removeEventListener('dragend', onEnd);
    target.removeEventListener('drop', onEnd);
    internalDrag = false;
  };
}
