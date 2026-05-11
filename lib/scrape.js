/**
 * lib/scrape.js — Universal Scraper (got-scraping edition)
 *
 * Changes from original:
 *  - CF proxy removed entirely
 *  - baseurl.txt / cf_proxy.txt replaced by src/config.js (BASE_URL constant)
 *  - All HTTP requests use got-scraping instead of native fetch
 *    (got-scraping rotates browser TLS fingerprints to avoid bot detection)
 */

import gotScraping from 'got-scraping';
import { BASE_URL } from '../src/config.js';

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  Accept:          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Returns the configured base URL from src/config.js.
 * Kept as an async function so callers don't need to change.
 */
export async function getBaseUrl() {
  return BASE_URL;
}

/**
 * Fetch a page using got-scraping (no CF proxy, direct to target).
 *
 * @param {string} path  - URL path, e.g. '/series/one-piece/'
 * @returns {{ html: string, baseUrl: string }}
 */
export async function fetchPage(path) {
  const targetUrl = BASE_URL + (path.startsWith('/') ? path : '/' + path);

  const response = await gotScraping({
    url: targetUrl,
    headers: BROWSER_HEADERS,
    timeout: { request: 30_000 },
    followRedirect: true,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HTTP ${response.statusCode} — ${targetUrl}`);
  }

  return { html: response.body, baseUrl: BASE_URL };
}

/**
 * Convenience wrapper: fetch any arbitrary URL with got-scraping.
 * Used by api/embed.js and api/s_movies.js.
 *
 * @param {string} url     - Full URL to fetch
 * @param {object} headers - Optional extra headers
 * @returns {{ ok: boolean, status: number, text: () => string }}
 */
export async function fetchUrl(url, headers = {}) {
  try {
    const response = await gotScraping({
      url,
      headers: { ...BROWSER_HEADERS, ...headers },
      timeout: { request: 30_000 },
      followRedirect: true,
      throwHttpErrors: false,
    });
    return {
      ok:     response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      text:   () => response.body,
      json:   () => JSON.parse(response.body),
    };
  } catch (err) {
    return { ok: false, status: 0, text: () => '', json: () => null };
  }
}
