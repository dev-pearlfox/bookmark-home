import { afterEach, describe, expect, it, vi } from 'vitest';
import { POPUP_ICON_PHRASE, describeOpenResult, openAll, openInNewTab } from './openAll.js';

const urls = ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com', 'https://e.com'];

afterEach(() => vi.unstubAllGlobals());

describe('openAll', () => {
  it('tries every URL, in order, and reports all opened', () => {
    const seen = [];
    const result = openAll(urls, (u) => { seen.push(u); return true; });
    expect(seen).toEqual(urls);
    expect(result).toEqual({ total: 5, opened: 5, blocked: 0 });
  });

  it('does NOT stop at the first block (the browser said no to some, not all)', () => {
    // Typical Chrome behaviour: first tab allowed, the rest blocked.
    let calls = 0;
    const result = openAll(urls, () => { calls += 1; return calls === 1; });
    expect(calls).toBe(5);
    expect(result).toEqual({ total: 5, opened: 1, blocked: 4 });
  });

  it('counts a fully blocked run', () => {
    expect(openAll(urls, () => false)).toEqual({ total: 5, opened: 0, blocked: 5 });
  });

  it('never hands an unsafe URL to the opener, and does not count it', () => {
    const open = vi.fn(() => true);
    const result = openAll(
      ['javascript:alert(1)', 'data:text/html,hi', 'https://ok.com', 'not a url', 'file:///etc/passwd'],
      open,
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://ok.com');
    expect(result).toEqual({ total: 1, opened: 1, blocked: 0 });
  });

  it('handles an empty list', () => {
    const open = vi.fn();
    expect(openAll([], open)).toEqual({ total: 0, opened: 0, blocked: 0 });
    expect(open).not.toHaveBeenCalled();
  });
});

describe('openInNewTab (real opener)', () => {
  it('opens in a new tab, severs opener, and reports success', () => {
    const win = { opener: 'the-app-window' };
    const open = vi.fn(() => win);
    vi.stubGlobal('window', { open });
    expect(openInNewTab('https://a.com')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://a.com', '_blank');
    expect(win.opener).toBeNull();
  });

  it('does not use the noopener feature (it would hide blocked pop-ups)', () => {
    const open = vi.fn(() => ({}));
    vi.stubGlobal('window', { open });
    openInNewTab('https://a.com');
    expect(open.mock.calls[0]).toHaveLength(2);
  });

  it('reports false when the browser blocks it (window.open returns null)', () => {
    vi.stubGlobal('window', { open: () => null });
    expect(openInNewTab('https://a.com')).toBe(false);
  });
});

describe('describeOpenResult', () => {
  it('is null when everything opened (nothing to say)', () => {
    expect(describeOpenResult({ total: 5, opened: 5, blocked: 0 })).toBeNull();
    expect(describeOpenResult({ total: 0, opened: 0, blocked: 0 })).toBeNull();
  });

  it('says how many opened and tells the user how to fix it', () => {
    const msg = describeOpenResult({ total: 5, opened: 1, blocked: 4 });
    expect(msg).toContain('Opened 1 of 5');
    expect(msg).toMatch(/allow pop-ups/i);
    expect(msg).toContain('Open all again');
  });

  it('always contains the phrase the banner puts its icon next to', () => {
    expect(describeOpenResult({ total: 5, opened: 1, blocked: 4 })).toContain(POPUP_ICON_PHRASE);
    expect(describeOpenResult({ total: 2, opened: 0, blocked: 2 })).toContain(POPUP_ICON_PHRASE);
  });

  it('has a distinct message when nothing opened, with correct plural', () => {
    expect(describeOpenResult({ total: 3, opened: 0, blocked: 3 })).toContain('blocked all 3 tabs');
    expect(describeOpenResult({ total: 1, opened: 0, blocked: 1 })).toContain('blocked all 1 tab.');
  });
});
