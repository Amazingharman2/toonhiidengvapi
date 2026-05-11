/**
 * lib/scrape.js — Universal Scraper (Edge Runtime edition)
 *
 * FIX: Replaced got-scraping (Node.js-only, uses node:http, node:https,
 *      node:stream, node:crypto, etc.) with native fetch API, which is
 *      fully supported in Vercel Edge Runtime.
 *
 * All API files (cast.js, home.js, etc.) remain unchanged.
 */

import { BASE_URL } from '../src/config.js';

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection':      'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest':  'document',
  'Sec-Fetch-Mode':  'navigate',
  'Sec-Fetch-Site':  'none',
  'Cache-Control':   'max-age=0',
};

/**
 * Returns the configured base URL from src/config.js.
 * Kept as an async function so callers don't need to change.
 */
export async function getBaseUrl() {
  return BASE_URL;
}

/**
 * Fetch a page using native fetch (Edge Runtime compatible).
 *
 * @param {string} path  - URL path, e.g. '/series/one-piece/'
 * @returns {{ html: string, baseUrl: string }}
 */
export async function fetchPage(path) {
  const targetUrl = BASE_URL + (path.startsWith('/') ? path : '/' + path);

  const response = await fetch(targetUrl, {
    method:   'GET',
    headers:  BROWSER_HEADERS,
    redirect: 'follow',
    signal:   AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${targetUrl}`);
  }

  const html = await response.text();
  return { html, baseUrl: BASE_URL };
}

/**
 * Convenience wrapper: fetch any arbitrary URL with native fetch.
 * Used by api/embed.js and api/s_movies.js.
 *
 * @param {string} url     - Full URL to fetch
 * @param {object} headers - Optional extra headers
 * @returns {{ ok: boolean, status: number, text: () => string, json: () => any }}
 */
export async function fetchUrl(url, headers = {}) {
  try {
    const response = await fetch(url, {
      method:   'GET',
      headers:  { ...BROWSER_HEADERS, ...headers },
      redirect: 'follow',
      signal:   AbortSignal.timeout(30_000),
    });

    const body = await response.text();

    return {
      ok:     response.ok,
      status: response.status,
      text:   () => body,
      json:   () => JSON.parse(body),
    };
  } catch (err) {
    return {
      ok:     false,
      status: 0,
      text:   () => '',
      json:   () => null,
    };
  }
}
