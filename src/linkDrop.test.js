import { afterEach, describe, expect, it } from 'vitest';
import { extractLink, hasLinkPayload, isInternalDrag, trackInternalDrags } from './linkDrop.js';

const dt = (data = {}) => ({
  types: Object.keys(data),
  getData: (t) => data[t] ?? '',
});

describe('hasLinkPayload', () => {
  it('accepts drags that carry a URL-ish type', () => {
    expect(hasLinkPayload(dt({ 'text/uri-list': 'https://a.com' }))).toBe(true);
    expect(hasLinkPayload(dt({ 'text/plain': 'x' }))).toBe(true);
    expect(hasLinkPayload(dt({ 'text/x-moz-url': 'x' }))).toBe(true);
  });
  it('rejects file drags and empty or missing transfers', () => {
    expect(hasLinkPayload(dt({ Files: '' }))).toBe(false);
    expect(hasLinkPayload(dt({}))).toBe(false);
    expect(hasLinkPayload(null)).toBe(false);
    expect(hasLinkPayload(undefined)).toBe(false);
  });
});

describe('extractLink', () => {
  it('reads a Chrome address-bar drop (uri-list + plain)', () => {
    const d = dt({ 'text/uri-list': 'https://www.github.com/a/b\r\n', 'text/plain': 'https://www.github.com/a/b' });
    expect(extractLink(d)).toEqual({ url: 'https://www.github.com/a/b' });
  });
  it('skips comment lines in a uri-list and takes the first URL', () => {
    const d = dt({ 'text/uri-list': '# dragged from here\r\nhttps://one.com\r\nhttps://two.com' });
    expect(extractLink(d)).toEqual({ url: 'https://one.com' });
  });
  it('reads Firefox url + title', () => {
    const d = dt({ 'text/x-moz-url': 'https://example.org/p\nExample Page' });
    expect(extractLink(d)).toEqual({ url: 'https://example.org/p', title: 'Example Page' });
  });
  it('falls back to plain text that is already a full URL', () => {
    expect(extractLink(dt({ 'text/plain': '  https://example.com/x  ' }))).toEqual({ url: 'https://example.com/x' });
  });
  it('rejects ordinary text, so a dragged word never becomes a bookmark', () => {
    expect(extractLink(dt({ 'text/plain': 'hello' }))).toBeNull();
    expect(extractLink(dt({ 'text/plain': 'github.com' }))).toBeNull();
    expect(extractLink(dt({ 'text/plain': 'two words https://a.com' }))).toBeNull();
  });
  it('rejects unsafe or non-web links', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'chrome://settings', 'https://hello world']) {
      expect(extractLink(dt({ 'text/uri-list': bad, 'text/plain': bad }))).toBeNull();
    }
  });
  it('uses a later format when an earlier one is unusable', () => {
    const d = dt({ 'text/uri-list': 'javascript:alert(1)', 'text/plain': 'https://ok.com' });
    expect(extractLink(d)).toEqual({ url: 'https://ok.com' });
  });
  it('survives a transfer whose getData throws, and a null transfer', () => {
    expect(extractLink({ types: ['text/plain'], getData: () => { throw new Error('nope'); } })).toBeNull();
    expect(extractLink(null)).toBeNull();
  });
});

describe('trackInternalDrags', () => {
  const targets = [];
  const make = () => {
    const listeners = {};
    const target = {
      addEventListener: (t, fn) => { listeners[t] = fn; },
      removeEventListener: (t) => { delete listeners[t]; },
      fire: (t, e = {}) => listeners[t]?.(e),
      listeners,
    };
    targets.push(target);
    return target;
  };
  afterEach(() => { targets.length = 0; });

  it('flags a native drag that started inside the page until it ends', () => {
    const t = make(); const stop = trackInternalDrags(t);
    expect(isInternalDrag()).toBe(false);
    t.fire('dragstart', { defaultPrevented: false });
    expect(isInternalDrag()).toBe(true);
    t.fire('dragend');
    expect(isInternalDrag()).toBe(false);
    stop();
  });
  it('does NOT stick on for drags dnd-kit cancelled (they never fire dragend)', () => {
    const t = make(); const stop = trackInternalDrags(t);
    t.fire('dragstart', { defaultPrevented: true });
    expect(isInternalDrag()).toBe(false);
    stop();
  });
  it('clears on drop and on cleanup', () => {
    const t = make(); const stop = trackInternalDrags(t);
    t.fire('dragstart', { defaultPrevented: false });
    t.fire('drop');
    expect(isInternalDrag()).toBe(false);
    t.fire('dragstart', { defaultPrevented: false });
    stop();
    expect(isInternalDrag()).toBe(false);
    expect(Object.keys(t.listeners)).toEqual([]);
  });
});
