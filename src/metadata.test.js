import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  domainToTitle,
  fetchTitle,
  getDomain,
  getFaviconUrl,
  isPlausibleHostname,
  isPrivateHost,
  isSafeHttpUrl,
  normalizeUrl,
} from './metadata.js';

describe('normalizeUrl', () => {
  it('adds https:// to bare domains and trims whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
    expect(normalizeUrl('example.com/a?b=1')).toBe('https://example.com/a?b=1');
  });

  it('leaves existing http(s) URLs alone (any case)', () => {
    expect(normalizeUrl('http://x.com')).toBe('http://x.com');
    expect(normalizeUrl('HTTPS://X.com')).toBe('HTTPS://X.com');
  });

  it('returns an empty string for blank or missing input', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
    expect(normalizeUrl(null)).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });

  it('turns scheme-style input into something isSafeHttpUrl rejects', () => {
    // The Add form relies on this: typing javascript:/data: can never be saved.
    // ("https://" gets glued on, leaving a hostname/port that is not a valid URL.)
    for (const typed of ['javascript:alert(1)', 'data:text/html,hi', 'hello world']) {
      expect(isSafeHttpUrl(normalizeUrl(typed))).toBe(false);
    }
    expect(isSafeHttpUrl(normalizeUrl('example.com'))).toBe(true);
  });
});

describe('getDomain / getFaviconUrl / domainToTitle', () => {
  it('strips www. and returns the hostname', () => {
    expect(getDomain('https://www.github.com/a/b')).toBe('github.com');
    expect(getDomain('http://docs.example.com:8080/x')).toBe('docs.example.com');
  });

  it('falls back to the raw input when it is not a URL', () => {
    expect(getDomain('not a url')).toBe('not a url');
  });

  it('builds a Google favicon URL with the domain encoded and size applied', () => {
    expect(getFaviconUrl('https://www.github.com/x', 32)).toBe(
      'https://www.google.com/s2/favicons?domain=github.com&sz=32',
    );
    expect(getFaviconUrl('https://github.com')).toContain('&sz=64');
  });

  it('prettifies a domain into a title', () => {
    expect(domainToTitle('https://github.com')).toBe('Github');
    expect(domainToTitle('https://docs.example.com')).toBe('Docs Example');
    expect(domainToTitle('https://my-cool_site.io')).toBe('My Cool Site');
  });

  it('still returns something for single-label hosts', () => {
    expect(domainToTitle('http://localhost:3000')).toBe('Localhost');
  });
});

describe('isPlausibleHostname', () => {
  // Chrome (unlike Node) accepts hosts containing spaces and percent-encodes
  // them, so the engine-independent hostname check is tested directly with
  // what Chrome would hand back.
  it.each([
    'example.com', 'sub.example.co.uk', 'localhost', 'a_b.com', 'my-site.io',
    'xn--mnchen-3ta45j.de', 'example.com.', '192.168.0.1', '[::1]', '[2001:db8::1]',
  ])('accepts %s', (h) => {
    expect(isPlausibleHostname(h)).toBe(true);
  });

  it.each([
    'hello%20world', 'exa%20mple.com', 'hello world', 'a..b.com', '.example.com',
    'exa<mple>.com', 'user@host', 'a/b', 'a:80', '', '[::1', 'münchen.de',
  ])('rejects %j', (h) => {
    expect(isPlausibleHostname(h)).toBe(false);
  });

  it('rejects non-strings', () => {
    for (const v of [null, undefined, 42, {}]) expect(isPlausibleHostname(v)).toBe(false);
  });
});

describe('isSafeHttpUrl', () => {
  it.each([
    'https://a.com', 'http://a.com/x?y=1#z', 'HTTPS://A.COM',
    'https://münchen.de', 'http://[::1]:8080/x', 'http://192.168.0.1', 'https://a_b.com',
  ])('allows %s', (u) => {
    expect(isSafeHttpUrl(u)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://a.com',
    '//a.com',
    'a.com',
    'https://',
    'https://hello world',
    'https://exa mple.com/x',
    'https://a..b.com',
    '',
  ])('blocks %j', (u) => {
    expect(isSafeHttpUrl(u)).toBe(false);
  });

  it('blocks non-strings', () => {
    for (const v of [null, undefined, 42, {}, ['https://a.com']]) {
      expect(isSafeHttpUrl(v)).toBe(false);
    }
  });
});

describe('isPrivateHost', () => {
  it.each([
    'http://localhost:3000',
    'https://intranet/page',
    'https://wiki.corp.internal',
    'https://printer.local',
    'https://router.lan',
    'http://192.168.1.5',
    'http://10.0.0.1/a',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://127.0.0.1',
    'http://169.254.1.1',
    'http://0.0.0.0',
    'http://[::1]:8080',
  ])('treats %s as private', (u) => {
    expect(isPrivateHost(u)).toBe(true);
  });

  it.each([
    'https://github.com',
    'https://www.pearlfox.io/a?b=1',
    'http://8.8.8.8',
    'http://172.15.0.1', // just below the 172.16/12 private block
    'http://172.32.0.1', // just above it
    'https://192.169.0.1',
    'not a url',
  ])('treats %s as public', (u) => {
    expect(isPrivateHost(u)).toBe(false);
  });
});

describe('fetchTitle', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (impl) => {
    const fn = vi.fn(impl);
    vi.stubGlobal('fetch', fn);
    return fn;
  };

  it('returns the API title, trimmed', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ data: { title: '  GitHub  ' } }) }));
    await expect(fetchTitle('https://github.com')).resolves.toBe('GitHub');
  });

  it('sends the (encoded) URL to microlink', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({ data: {} }) }));
    await fetchTitle('https://a.com/?q=1&r=2');
    expect(fetchMock.mock.calls[0][0]).toContain(
      `url=${encodeURIComponent('https://a.com/?q=1&r=2')}`,
    );
  });

  it.each([
    ['a non-OK response', async () => ({ ok: false, json: async () => ({}) })],
    ['an empty title', async () => ({ ok: true, json: async () => ({ data: { title: '   ' } }) })],
    ['a missing title', async () => ({ ok: true, json: async () => ({}) })],
    ['a network error', async () => { throw new Error('offline'); }],
    ['invalid JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('bad'); } })],
  ])('falls back to the domain title on %s', async (_label, impl) => {
    stubFetch(impl);
    await expect(fetchTitle('https://github.com')).resolves.toBe('Github');
  });

  it('never calls the network for private hosts', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({ data: { title: 'X' } }) }));
    await expect(fetchTitle('http://localhost:3000')).resolves.toBe('Localhost');
    await fetchTitle('http://192.168.0.10');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the fallback for an empty URL without fetching', async () => {
    const fetchMock = stubFetch(async () => ({}));
    await fetchTitle('');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
