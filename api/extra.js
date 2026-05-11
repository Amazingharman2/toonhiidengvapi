// api/extra.js — Additional utilities and enhanced scraping functions
export const config = { runtime: 'edge' };

import { fetchPage } from '../lib/scrape.js';

/**
 * Extract menu structure from HTML
 */
export function extractMenu(html) {
  const menu = [];
  const menuRegex = /<ul class="menu dfxc dv or-1">([\s\S]*?)<\/ul>/;
  const menuMatch = html.match(menuRegex);

  if (!menuMatch) return menu;

  const menuItemRegex = /<li[^>]*id="menu-item-(\d+)"[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/li>(?=\s*(?:<li|<\/ul))/g;
  let match;

  while ((match = menuItemRegex.exec(menuMatch[1])) !== null) {
    const [, id, classes, content] = match;
    const linkMatch = content.match(/<a href="([^"]+)">([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const [, url, title] = linkMatch;
    const hasChildren = classes.includes('menu-item-has-children');

    const item = {
      id: parseInt(id),
      title: title.trim(),
      url: url.trim(),
      hasChildren,
      children: [],
    };

    if (hasChildren) {
      const submenuRegex = /<ul class="sub-menu">([\s\S]*?)<\/ul>/;
      const submenuMatch = content.match(submenuRegex);

      if (submenuMatch) {
        const subItemRegex = /<li[^>]*id="menu-item-(\d+)"[^>]*>[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>/g;
        let subMatch;
        while ((subMatch = subItemRegex.exec(submenuMatch[1])) !== null) {
          const [, subId, subUrl, subTitle] = subMatch;
          item.children.push({ id: parseInt(subId), title: subTitle.trim(), url: subUrl.trim() });
        }
      }
    }
    menu.push(item);
  }
  return menu;
}

/**
 * Extract footer menu from HTML
 */
export function extractFooter(html) {
  const footer = [];
  const footerRegex = /<nav class="top dfxc alg-cr">[\s\S]*?<ul class="menu[^"]*">([\s\S]*?)<\/ul>/;
  const footerMatch = html.match(footerRegex);

  if (!footerMatch) return footer;

  const footerItemRegex = /<li[^>]*id="menu-item-(\d+)"[^>]*>[\s\S]*?<a(?:[^>]*rel="([^"]*)")?[^>]*href="([^"]+)">([^<]+)<\/a>/g;
  let match;
  while ((match = footerItemRegex.exec(footerMatch[1])) !== null) {
    const [, id, rel, url, title] = match;
    footer.push({ id: parseInt(id), title: title.trim(), url: url.trim(), rel: rel || null });
  }
  return footer;
}

/**
 * Extract schedule from HTML
 */
export function extractSchedule(html) {
  const schedule = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  days.forEach(day => {
    const dayRegex = new RegExp(
      `<div[^>]*class="custom-tab-pane[^"]*"[^>]*id="${day}"[^>]*>([\\s\\S]*?)<\\/div>\\s*(?=<div class="custom-tab-pane|<\\/div>\\s*<\\/div>)`, 'i'
    );
    const dayMatch = html.match(dayRegex);

    if (dayMatch) {
      const scheduleItems = [];
      const itemRegex = /<li class="custom-schedule-item">[\s\S]*?<span class="schedule-time">([^<]+)<\/span>[\s\S]*?<p class="schedule-description">([^<]+)<\/p>[\s\S]*?<\/li>/g;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(dayMatch[1])) !== null) {
        const [, time, description] = itemMatch;
        scheduleItems.push({ time: time.trim(), description: description.trim() });
      }
      schedule[day] = { day: day.charAt(0).toUpperCase() + day.slice(1), items: scheduleItems, count: scheduleItems.length };
    }
  });
  return schedule;
}

/**
 * Extract media items (series or movies)
 */
export function extractMediaItems(html, type = 'unknown') {
  const items = [];
  const itemRegex = /<li[^>]*id="post-(\d+)"[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/li>(?=\s*(?:<li|<\/ul))/g;
  let match;

  while ((match = itemRegex.exec(html)) !== null) {
    const [, id, classes, content] = match;
    const titleMatch    = content.match(/<h2 class="entry-title">([^<]+)<\/h2>/);
    const voteMatch     = content.match(/<span class="vote"><span>TMDB<\/span>\s*([\d.]+)<\/span>/);
    const imgMatch      = content.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/);
    const urlMatch      = content.match(/<a href="([^"]+)" class="lnk-blk"><\/a>/);
    const typeMatch     = content.match(/<span class="watch btn sm">View (Serie|Movie)<\/span>/);
    const categories    = [];
    const categoryRegex = /category-([a-z0-9-]+)/g;
    let catMatch;
    while ((catMatch = categoryRegex.exec(classes)) !== null) categories.push(catMatch[1]);
    const yearMatch = classes.match(/annee-(\d+)/);

    items.push({
      id: parseInt(id),
      title:      titleMatch ? titleMatch[1].trim() : 'Unknown',
      rating:     voteMatch  ? parseFloat(voteMatch[1]) : 0,
      image:      imgMatch   ? imgMatch[1] : '',
      imageAlt:   imgMatch   ? imgMatch[2] : '',
      url:        urlMatch   ? urlMatch[1] : '',
      type:       typeMatch  ? typeMatch[1].toLowerCase() : type,
      categories,
      year: yearMatch ? parseInt(yearMatch[1]) : null,
    });
  }
  return items;
}

export function extractRandomSeries(html) {
  const m = html.match(/<section id="widget_list_movies_series-4"[\s\S]*?<ul class="post-lst[^"]*">([\s\S]*?)<\/ul>/);
  return m ? extractMediaItems(m[1], 'series') : [];
}

export function extractRandomMovies(html) {
  const m = html.match(/<section id="widget_list_movies_series-5"[\s\S]*?<ul class="post-lst[^"]*">([\s\S]*?)<\/ul>/);
  return m ? extractMediaItems(m[1], 'movie') : [];
}

export function extractLogo(html) {
  const logoRegex = /<figure class="logo[^"]*">[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"/;
  const logoMatch = html.match(logoRegex);
  if (!logoMatch) return null;
  return { url: logoMatch[1], image: logoMatch[2], alt: logoMatch[3] };
}

export function extractCopyright(html) {
  const copyrightRegex = /<center>[\s\S]*?<p>\s*([^<]+)\s*<\/p>[\s\S]*?<p>\s*(Copyright[^<]+)\s*<\/p>/;
  const copyrightMatch = html.match(copyrightRegex);
  if (!copyrightMatch) return null;
  return { disclaimer: copyrightMatch[1].trim(), copyright: copyrightMatch[2].trim() };
}

export function parseFullHTML(html) {
  const menu         = extractMenu(html);
  const footer       = extractFooter(html);
  const schedule     = extractSchedule(html);
  const randomSeries = extractRandomSeries(html);
  const randomMovies = extractRandomMovies(html);
  return {
    logo: extractLogo(html),
    menu,
    footer,
    schedule,
    randomSeries,
    randomMovies,
    copyright: extractCopyright(html),
    metadata: {
      totalMenuItems:   menu.length,
      totalFooterItems: footer.length,
      scheduleDays:     Object.keys(schedule).length,
      randomSeriesCount: randomSeries.length,
      randomMoviesCount: randomMovies.length,
    },
  };
}

/**
 * API Handler
 */
export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');
  const query   = searchParams.get('s') || '';

  try {
    const path = query ? `/?s=${encodeURIComponent(query)}` : '/home';
    const { html } = await fetchPage(path);
    const parsedData = parseFullHTML(html);

    const sectionMap = {
      '1': { key: 'menu',         data: parsedData.menu },
      'menu': { key: 'menu',      data: parsedData.menu },
      '2': { key: 'footer',       data: parsedData.footer },
      'footer': { key: 'footer',  data: parsedData.footer },
      '3': { key: 'schedule',     data: parsedData.schedule },
      'schedule': { key: 'schedule', data: parsedData.schedule },
      '4': { key: 'randomSeries', data: parsedData.randomSeries },
      'randomseries': { key: 'randomSeries', data: parsedData.randomSeries },
      'random-series': { key: 'randomSeries', data: parsedData.randomSeries },
      '5': { key: 'randomMovies', data: parsedData.randomMovies },
      'randommovies': { key: 'randomMovies', data: parsedData.randomMovies },
      'random-movies': { key: 'randomMovies', data: parsedData.randomMovies },
      'logo': { key: 'logo',       data: parsedData.logo },
      'copyright': { key: 'copyright', data: parsedData.copyright },
      'metadata': { key: 'metadata',   data: parsedData.metadata },
    };

    if (section) {
      const sectionData = sectionMap[section.toLowerCase()];
      if (sectionData) {
        return new Response(JSON.stringify({
          success: true,
          section: sectionData.key,
          query:   query || null,
          data:    sectionData.data,
          timestamp: new Date().toISOString(),
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
          },
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid section',
          availableSections: {
            '1 or menu': 'Navigation menu items',
            '2 or footer': 'Footer links',
            '3 or schedule': 'Weekly schedule',
            '4 or randomSeries': 'Random series from sidebar',
            '5 or randomMovies': 'Random movies from sidebar',
            'logo': 'Site logo information',
            'copyright': 'Copyright and disclaimer',
            'metadata': 'Summary metadata',
          },
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      query:   query || null,
      data:    parsedData,
      timestamp: new Date().toISOString(),
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
