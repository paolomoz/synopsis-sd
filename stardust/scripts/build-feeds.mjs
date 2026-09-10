#!/usr/bin/env node
/**
 * build-feeds.mjs — RSS 2.0 feeds from /query-index.json, one per feed family, written into the code repo
 * (served from the code bus). Mirrors the source feed (/snps/blogs/chip-design.en-us.xml: title, atom:link,
 * dc:creator, pubDate, one <category> per tag, guid, description).
 *
 *   node stardust/scripts/build-feeds.mjs [--base https://main--synopsis-sd--paolomoz.aem.live] [--limit 50]
 *
 * Output: blogs/chip-design/feed.xml, articles/feed.xml, glossary/feed.xml (+ snps/blogs/chip-design.en-us.xml alias)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = opt('--base', 'https://main--synopsis-sd--paolomoz.aem.live');
const LIMIT = +opt('--limit', 50);

const FEEDS = [
  { family: 'blogs', file: 'blogs/chip-design/feed.xml', alias: 'snps/blogs/chip-design.en-us.xml', title: 'Chip Design', link: '/blogs/chip-design', description: 'Discover the design automation tools, silicon IP, and systems verification solutions enabling the era of pervasive intelligence', match: (p) => p.startsWith('/blogs/chip-design/') },
  { family: 'articles', file: 'articles/feed.xml', title: 'Synopsys Articles', link: '/articles', description: 'Technical articles from Synopsys', match: (p) => p.startsWith('/articles/') },
  { family: 'glossary', file: 'glossary/feed.xml', title: 'Synopsys Glossary', link: '/glossary', description: 'Definitions of chip design, verification and silicon IP terms', match: (p) => p.startsWith('/glossary/') },
];

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cdata = (s) => `<![CDATA[${String(s || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const tagsOf = (r) => { const t = r.tags; if (Array.isArray(t)) return t; if (!t) return []; try { return JSON.parse(t); } catch (e) { return String(t).split(/,\s*/).filter(Boolean); } };
const rfc822 = (ts) => new Date((Number(ts) || 0) * 1000).toUTCString();

async function fetchIndex() {
  const rows = []; let offset = 0; let total = Infinity;
  while (offset < total) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${BASE}/query-index.json?offset=${offset}&limit=1000`);
    if (!res.ok) throw new Error(`index ${res.status}`);
    // eslint-disable-next-line no-await-in-loop
    const json = await res.json(); total = json.total; rows.push(...json.data); offset += 1000;
    if (!json.data.length) break;
  }
  return rows;
}

function render(feed, rows) {
  const items = rows.map((r) => `<item>
<title>${esc(r.title.replace(/\s*\|\s*Synopsys.*$/, ''))}</title>
<link>${BASE}${r.path}</link>
${r.author ? `<dc:creator>${cdata(r.author)}</dc:creator>` : ''}
<pubDate>${rfc822(r.publishedTs || r.lastModified)}</pubDate>
${tagsOf(r).map((t) => `<category>${cdata(t)}</category>`).join('\n')}
<guid isPermaLink="true">${BASE}${r.path}</guid>
<description>${cdata(r.description)}</description>
</item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
 xmlns:content="http://purl.org/rss/1.0/modules/content/"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:atom="http://www.w3.org/2005/Atom"
 xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
>
<channel>
 <title>${esc(feed.title)}</title>
 <atom:link href="${BASE}/${feed.file}" rel="self" type="application/rss+xml" />
 <link>${BASE}${feed.link}</link>
 <description>${esc(feed.description)}</description>
 <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
 <language>en-US</language>
 <sy:updatePeriod>hourly</sy:updatePeriod>
 <sy:updateFrequency>1</sy:updateFrequency>
${items}
</channel>
</rss>
`;
}

const all = await fetchIndex();
const report = {};
for (const feed of FEEDS) {
  const rows = all
    .filter((r) => feed.match(r.path) && !/\/category-/.test(r.path) && r.template !== 'listing')
    .sort((a, b) => (Number(b.publishedTs) || 0) - (Number(a.publishedTs) || 0))
    .slice(0, LIMIT);
  const xml = render(feed, rows);
  for (const f of [feed.file, feed.alias].filter(Boolean)) {
    // eslint-disable-next-line no-await-in-loop
    await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, xml);
  }
  report[feed.file] = { items: rows.length, withAuthor: rows.filter((r) => r.author).length, withTags: rows.filter((r) => tagsOf(r).length).length };
}
console.log(JSON.stringify({ indexRows: all.length, feeds: report }, null, 1));
