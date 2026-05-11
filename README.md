# toon_stream_api — got-scraping edition

## What changed from the original

| Original | This version |
|---|---|
| `src/baseurl.txt` fetched from GitHub on every cold start | `src/config.js` — hardcoded constant, edit once |
| `src/cf_proxy.txt` fetched from GitHub, proxied every request | **Removed entirely** |
| `lib/scrape.js` used Cloudflare Workers cache + CF proxy fallback | Direct `got-scraping` requests (browser TLS fingerprinting) |
| `api/category.js`, `api/scrape.js`, `api/extra.js` each had their own inline CF proxy fetch | Now all use `fetchPage()` from `lib/scrape.js` |

All API routes, response shapes, and scraping logic are **identical**.

---

## Changing the target URL

Open **`src/config.js`** and update `BASE_URL`:

```js
export const BASE_URL = 'http://toonstream.dad'; // ← change this
```

That's it. No other files need touching.

---

## Setup

```bash
npm install
vercel dev        # local dev
vercel            # deploy
```

---

## API Routes

| Route | Description |
|---|---|
| `GET /` | Site meta + homepage article |
| `GET /home` | Home page: featured, episodes, series, movies, schedule |
| `GET /search/:query` | Search results |
| `GET /series/:slug` | Series details + seasons/episodes |
| `GET /episode/:slug` | Episode detail + video servers |
| `GET /movies/:path` | Movie detail + video options |
| `GET /movies` | Movie listing (paginated) |
| `GET /series` | Series listing (paginated) |
| `GET /letter/:letter` | Browse by letter |
| `GET /cast/:cast` | Cast page |
| `GET /category/:path` | Category page |
| `GET /api/catalog?type=series\|movies&page=N` | Full catalog |
| `GET /api/scrape?section=menu\|footer\|schedule\|4\|5` | Structural data |
| `GET /api/extra?section=...` | Extended structural data |
| `GET /api/embed?url=...` | Resolve embed iframe URL |
| `GET /api/s_movies?url=...` | Scrape any movie list URL |

---

## Why got-scraping?

`got-scraping` rotates real browser TLS fingerprints (JA3/JA4) on every request, making the scraper much harder to block than a plain `fetch()` with a spoofed User-Agent. It is a drop-in async HTTP client — no Cloudflare proxy needed.
