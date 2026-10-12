/**
 * URL metadata helpers.
 *
 * - Favicons: Google's public S2 service. No API key, CORS-friendly
 *   because it's a plain <img> URL (we don't fetch it, just point <img> at it).
 * - Titles:   microlink.io free tier. Client-side, CORS-enabled.
 *   Falls back to the domain name if the API is down or times out.
 *   Private/internal hosts are NEVER sent to it (see isPrivateHost) — the
 *   service can't reach them anyway, and we'd just be leaking the URL.
 *
 * Every function is pure-ish (no state) so components can call freely.
 */

export function normalizeUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Letters/digits/hyphen/underscore labels joined by dots (IDNs arrive here as
// ASCII punycode), or a bracketed IPv6 literal. Deliberately strict.
const PLAUSIBLE_HOSTNAME = /^(?:[a-z0-9_-]+\.)*[a-z0-9_-]+\.?$|^\[[0-9a-f:.]+\]$/i;

/**
 * Is this a hostname a real website could have? We can't lean on `new URL()`
 * for this: engines disagree. Node rejects `https://hello world`, but Chrome
 * accepts it and silently percent-encodes the host to `hello%20world`.
 */
export function isPlausibleHostname(hostname) {
  return typeof hostname === 'string' && PLAUSIBLE_HOSTNAME.test(hostname);
}

/**
 * Allow-list for links we are willing to put in an `href`: absolute
 * http(s) URLs with a plausible hostname. Blocks `javascript:`, `data:`,
 * `vbscript:`, `file:` etc. (Defence in depth — don't rely on the UI
 * framework to catch these.)
 */
export function isSafeHttpUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === 'http:' || protocol === 'https:') && isPlausibleHostname(hostname);
  } catch {
    return false;
  }
}

export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getFaviconUrl(url, size = 64) {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/**
 * True for hosts a public service can't (and shouldn't) see: localhost,
 * single-label intranet names, *.local/*.internal/*.lan/*.home.arpa,
 * and private/loopback/link-local IPv4 + IPv6 literals.
 */
export function isPrivateHost(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host.startsWith('[')) return true; // any IPv6 literal: treat as private/unusual
  if (host === 'localhost' || !host.includes('.')) return true;
  if (/\.(local|internal|lan|localhost|home\.arpa)$/.test(host)) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

// Country-code second-level domains, e.g. bbc.co.uk -> the name is "bbc", not "bbc.co".
const SECOND_LEVEL_TLD = /\.(co|com|org|net|gov|edu|ac)\.[a-z]{2}$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Prettify a domain into a plausible title as a fallback. */
export function domainToTitle(url) {
  const domain = getDomain(url);
  if (IPV4.test(domain)) return domain; // "192.168.1.5" has no name to extract
  const withoutTld = domain.replace(SECOND_LEVEL_TLD, '');
  const base = withoutTld !== domain
    ? withoutTld
    : domain.split('.').slice(0, -1).join('.') || domain;
  return base
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * The label to show for a bookmark. Uses the saved title when it is a real
 * one; when it is missing, blank, or just the URL pasted in as the title,
 * derives a readable name from the URL instead (https://www.github.com/x
 * becomes "Github").
 */
export function bookmarkLabel({ title, url } = {}) {
  const t = (title || '').trim();
  const isJustAUrl = /^(https?:\/\/|www\.)\S+$/i.test(t);
  if (t && !isJustAUrl) return t;
  return (url && domainToTitle(url)) || t || url || '';
}

/**
 * Fetch page title via microlink. Times out and falls back gracefully so
 * the UI never blocks on a slow network.
 */
export async function fetchTitle(url, { timeoutMs = 4000 } = {}) {
  const fallback = domainToTitle(url);
  if (!url || isPrivateHost(url)) return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true&audio=false&video=false&iframe=false&screenshot=false&palette=false`,
      { signal: controller.signal }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const title = data?.data?.title?.trim();
    return title || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
