/**
 * "Open all" for a category: open every bookmark in its own tab.
 *
 * Why window.open and not clicking each card's <a target="_blank">:
 * browsers (Chrome, Edge, Safari) let a page open at most ONE new tab per
 * click unless the user allows pop-ups for the site; the rest are blocked
 * silently. A scripted <a>.click() gives us no way to tell that happened, so
 * the user just saw "only the first one opened". window.open returns null
 * when it is blocked, so we can count what really opened and say so.
 *
 * We deliberately do NOT pass the "noopener" feature: with it, window.open
 * always returns null (even on success), which would make a blocked tab
 * indistinguishable from an opened one. Instead we sever `opener` ourselves
 * the moment the tab exists, which gives the same protection.
 */

import { isSafeHttpUrl } from './metadata.js';

/** Open one URL in a new tab. Returns true if the browser allowed it. */
export function openInNewTab(url) {
  const win = window.open(url, '_blank');
  if (!win) return false;
  win.opener = null;
  return true;
}

/**
 * Try to open every URL, in order. Never stops at the first block: the user
 * may have allowed pop-ups, and each attempt is independent.
 * Unsafe (non-http(s)) URLs are skipped, as defence in depth.
 *
 * @param {string[]} urls
 * @param {(url: string) => boolean} [open] injectable for tests
 * @returns {{ total: number, opened: number, blocked: number }}
 */
export function openAll(urls, open = openInNewTab) {
  const safe = urls.filter(isSafeHttpUrl);
  let opened = 0;
  for (const url of safe) {
    if (open(url)) opened += 1;
  }
  return { total: safe.length, opened, blocked: safe.length - opened };
}

/** The words the banner draws an icon next to (see CategoryColumn). Kept here so the message and the banner cannot drift apart. */
export const POPUP_ICON_PHRASE = 'blocked pop-up icon';

/** Message for the user when something was blocked; null when all opened. */
export function describeOpenResult({ total, opened, blocked }) {
  if (blocked === 0) return null;
  const how = `Allow pop-ups for this site (click the ${POPUP_ICON_PHRASE} in the address bar), then press Open all again.`;
  if (opened === 0) {
    return `Your browser blocked all ${total} tab${total === 1 ? '' : 's'}. ${how}`;
  }
  return `Opened ${opened} of ${total} bookmarks; your browser blocked the rest. ${how}`;
}
