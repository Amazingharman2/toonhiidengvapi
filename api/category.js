// api/category.js
export const config = { runtime: 'edge' };

import { fetchPage } from '../lib/scrape.js';
import { parseMediaItem, scrapePagination, json, guardMethod } from '../lib/helper.js';

function scrapeContent(html) {
  const block = html.match(
    /<div[^>]*class="[^"]*section movies[^"]*"[^>]*>[\s\S]*?<ul[^>]*class="post-lst[^"]*"[^>]*>([\s\S]*?)<\/ul>/
  )?.[1];
  if (!block) return [];
  const results = [];
  for (const item of block.matchAll(
    /<li[^>]*id="post-(\d+)"[^>]*class="([^"]*)"[^>]*>\s*<article[^>]*>([\s\S]*?)<\/article>\s*<\/li>/g
  )) {
    results.push(parseMediaItem(item[1], item[2], item[3]));
  }
  return results;
}

export default async function handler(request) {
  const guard = guardMethod(request);
  if (guard) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const page = searchParams.get('page');

    if (!path)
      return json({ success: false, error: 'Parameter "path" (category path) is required.' }, 400);

    const finalPath = page
      ? `/category/${path}/page/${page}/`
      : `/category/${path}/`;

    const { html, baseUrl } = await fetchPage(finalPath);

    const items      = scrapeContent(html);
    const pagination = scrapePagination(html);

    return json({
      success: true,
      category: path,
      page:     page ? Number(page) : 1,
      baseUrl,
      total_items: items.length,
      items,
      pagination: {
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
        nextPageUrl: pagination.nextPageUrl,
        prevPageUrl: pagination.prevPageUrl,
        currentPage: pagination.currentPage,
        totalPages:  pagination.totalPages,
        pages:       pagination.pages,
      },
    });
  } catch (err) {
    const is404 = err.message.includes('HTTP 404');
    return json({ success: false, error: is404 ? 'Category not found.' : err.message }, is404 ? 404 : 500);
  }
}
