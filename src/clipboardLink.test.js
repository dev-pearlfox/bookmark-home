import { describe, expect, it } from 'vitest';
import { linkFromClipboardText, readClipboardLink } from './clipboardLink.js';

describe('linkFromClipboardText', () => {
  it('accepts one absolute http(s) link, trimmed', () => {
    expect(linkFromClipboardText('https://github.com/x')).toEqual({ url: 'https://github.com/x' });
    expect(linkFromClipboardText('  http://example.com/a?b=1#c \n')).toEqual({ url: 'http://example.com/a?b=1#c' });
  });
  it('rejects ordinary text, so a copied word or password is never bookmarked', () => {
    for (const t of ['hunter2', 'hello world', 'github.com', 'www.github.com', '', '   ']) {
      expect(linkFromClipboardText(t)).toBeNull();
    }
  });
  it('rejects text that merely contains a link', () => {
    expect(linkFromClipboardText('look at https://github.com now')).toBeNull();
    expect(linkFromClipboardText('https://a.com https://b.com')).toBeNull();
    expect(linkFromClipboardText('https://a.com\nhttps://b.com')).toBeNull();
  });
  it('rejects unsafe or non-web schemes', () => {
    for (const t of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://example.com', 'vbscript:x']) {
      expect(linkFromClipboardText(t)).toBeNull();
    }
  });
  it('follows the app-wide link rule: internal single-word hosts are fine', () => {
    expect(linkFromClipboardText('http://intranet/wiki')).toEqual({ url: 'http://intranet/wiki' });
  });
  it('rejects a link with an invalid hostname, and absurdly long text', () => {
    expect(linkFromClipboardText('https://exa mple.com')).toBeNull();
    expect(linkFromClipboardText('https://bad_host!.com')).toBeNull();
    expect(linkFromClipboardText(`https://example.com/${'a'.repeat(3000)}`)).toBeNull();
  });
  it('rejects non-strings', () => {
    for (const t of [null, undefined, 42, {}, ['https://a.com']]) expect(linkFromClipboardText(t)).toBeNull();
  });
});

describe('readClipboardLink', () => {
  it('returns the link when the clipboard holds one', async () => {
    const clipboard = { readText: async () => 'https://github.com' };
    expect(await readClipboardLink(clipboard)).toEqual({ url: 'https://github.com' });
  });
  it('returns null when the clipboard holds something else', async () => {
    expect(await readClipboardLink({ readText: async () => 'just text' })).toBeNull();
  });
  it('returns null (never throws) when permission is refused', async () => {
    const clipboard = { readText: async () => { throw new DOMException('denied', 'NotAllowedError'); } };
    expect(await readClipboardLink(clipboard)).toBeNull();
  });
  it('returns null when the browser has no clipboard API', async () => {
    expect(await readClipboardLink(undefined)).toBeNull();
    expect(await readClipboardLink({})).toBeNull();
  });
});
