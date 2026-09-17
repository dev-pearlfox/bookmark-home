/**
 * URL metadata helpers.
 *
 * - Favicons: Google's public S2 service. No API key, CORS-friendly
 *   because it's a plain <img> URL (we don't fetch it, just point <img> at it).
 * - Titles:   microlink.io free tier. Client-side, CORS-enabled.
 *   Falls back to the domain name if the API is down or times out.
 *
 * Every function is pure-ish (no state) so components can call freely.
 */

export function normalizeUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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

/** Prettify a domain into a plausible title as a fallback. */
export function domainToTitle(url) {
  const domain = getDomain(url);
  const base = domain.split('.').slice(0, -1).join('.') || domain;
  return base
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Fetch page title via microlink. Times out and falls back gracefully so
 * the UI never blocks on a slow network.
 */
export async function fetchTitle(url, { timeoutMs = 4000 } = {}) {
  const fallback = domainToTitle(url);
  if (!url) return fallback;

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
