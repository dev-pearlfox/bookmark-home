/**
 * Reading a link from the clipboard when the user clicks a "+" button.
 *
 * Two rules keep this safe, because the clipboard can hold anything (a
 * password, a paragraph, yesterday's link):
 *  - Only the WHOLE clipboard text counts, and only if it is one absolute
 *    http(s) link that passes isSafeHttpUrl. Same strictness as link drop.
 *  - Anything else is dropped on the floor: never stored, never sent. The
 *    caller just falls back to the normal Add dialog.
 *
 * Browsers only allow this inside a user gesture (the click), and Chrome asks
 * the person for permission the first time; Safari and Firefox show a small
 * Paste prompt. A refusal is not an error here, it just means "no link".
 */

import { isSafeHttpUrl } from './metadata.js';

const MAX_LINK_LENGTH = 2048;

/** `{ url }` if the text is exactly one usable web link, else null. */
export function linkFromClipboardText(text) {
  if (typeof text !== 'string') return null;
  const url = text.trim();
  if (!url || url.length > MAX_LINK_LENGTH || /\s/.test(url)) return null;
  return isSafeHttpUrl(url) ? { url } : null;
}

/**
 * Read the clipboard and return `{ url }` or null. Never throws: a missing
 * API, a denied permission or an unreadable clipboard all mean null.
 * `clipboard` is injectable so this is testable without a browser.
 */
export async function readClipboardLink(clipboard = globalThis.navigator?.clipboard) {
  if (typeof clipboard?.readText !== 'function') return null;
  try {
    return linkFromClipboardText(await clipboard.readText());
  } catch {
    return null;
  }
}
