/**
 * Adds an article published elsewhere to cv.json `publications`.
 *
 *   npm run add:external -- <url> [--topic Messaging] [--title "..."] [--date 2026-01-31]
 *                                 [--summary "..."] [--publisher "..."] [--dry-run]
 *
 * Title, date, summary and publisher are read from the page's metadata; any flag overrides them
 * (and lets you add a page that blocks scraping). The entry is inserted as text, so the rest of
 * cv.json keeps its formatting and line endings.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const CV_PATH = fileURLToPath(new URL('../cv.json', import.meta.url));

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    topic: { type: 'string' },
    title: { type: 'string' },
    date: { type: 'string' },
    summary: { type: 'string' },
    publisher: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

/** Thrown by fail(); caught once at the bottom so the process exits normally (process.exit can crash on Windows with open sockets). */
class Failure extends Error {}
const fail = (message: string): never => {
  throw new Failure(message);
};

function parseUrl(value: string | undefined): URL {
  if (!value) return fail('Usage: npm run add:external -- <url> [--topic X] [--title ...] [--date YYYY-MM-DD]');
  try {
    return new URL(value);
  } catch {
    return fail(`Not a valid URL: ${value}`);
  }
}

// ---------------------------------------------------------------- scraping

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/** Value of <meta property|name="key" content="...">, whatever the attribute order. */
function meta(html: string, key: string): string | undefined {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1]!.toLowerCase(), m[2] ?? m[3] ?? '']),
    );
    if ((attrs.property ?? attrs.name)?.toLowerCase() === key && attrs.content) return decodeEntities(attrs.content).trim();
  }
  return undefined;
}

interface Scraped {
  title?: string;
  date?: string;
  summary?: string;
  publisher?: string;
}

async function scrape(target: URL): Promise<Scraped> {
  const response = await fetch(target, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; portfolio-add-external)', accept: 'text/html' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();

  const publisher = meta(html, 'og:site_name');
  let title = meta(html, 'og:title') ?? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  // "Post title | Site" -> "Post title"
  if (publisher) title = title.replace(new RegExp(`\\s*[|\\u2013\\u2014-]\\s*${publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '');

  const published =
    meta(html, 'article:published_time') ?? html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? meta(html, 'date');
  return {
    title: title || undefined,
    date: published?.match(/^\d{4}-\d{2}-\d{2}/)?.[0],
    summary: meta(html, 'og:description') ?? meta(html, 'description'),
    publisher,
  };
}

async function main() {
  const url = parseUrl(positionals[0]);
  if (flags.date && !/^\d{4}-\d{2}-\d{2}$/.test(flags.date)) fail('--date must look like 2026-01-31');

  let scraped: Scraped = {};
  if (!(flags.title && flags.date)) {
    try {
      scraped = await scrape(url);
    } catch (error) {
      console.warn(`Could not read ${url.href} (${error instanceof Error ? error.message : error}); falling back to flags.`);
    }
  }

  const entry = {
    name: flags.title ?? scraped.title,
    publisher: flags.publisher ?? scraped.publisher ?? url.hostname.replace(/^www\./, ''),
    releaseDate: flags.date ?? scraped.date,
    url: url.href,
    summary: flags.summary ?? scraped.summary,
    topic: flags.topic,
  };

  const missing = [!entry.name && '--title', !entry.releaseDate && '--date'].filter(Boolean);
  if (missing.length) fail(`Could not determine ${missing.join(' and ')} from the page. Pass ${missing.length > 1 ? 'them' : 'it'} explicitly.`);
  if (!entry.summary) console.warn('No summary found; the entry is added without one (use --summary to set it).');

  // ---------------------------------------------------------------- cv.json edit

  const raw = readFileSync(CV_PATH, 'utf8');
  const publications: { releaseDate: string; url?: string }[] = JSON.parse(raw).publications ?? [];

  const normalise = (value: string) => value.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  const duplicate = publications.find((p) => p.url && normalise(p.url) === normalise(url.href));
  if (duplicate) fail(`Already in cv.json: ${duplicate.url}`);

  const section = raw.indexOf('"publications"');
  const arrayStart = raw.indexOf('[', section);
  const arrayEnd = arrayStart + raw.slice(arrayStart).search(/^ {2}\]/m);
  if (section < 0 || arrayStart < 0 || arrayEnd <= arrayStart) fail('Could not find the "publications" array in cv.json.');

  const eol = raw.slice(arrayStart, arrayStart + 3).includes('\r\n') ? '\r\n' : '\n';
  // Entries sit at 4-space indent; deeper objects do not match.
  const entryOffsets = [...raw.slice(arrayStart, arrayEnd).matchAll(/^ {4}\{/gm)].map((m) => arrayStart + m.index);
  if (entryOffsets.length !== publications.length) fail('cv.json publications layout is not what this script expects; edit it by hand.');

  const cleaned = Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
  const text = JSON.stringify(cleaned, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join(eol);

  // Newest first: go before the first entry that is not newer.
  const index = publications.findIndex((p) => p.releaseDate <= entry.releaseDate!);
  let next: string;
  if (index === -1) {
    const lastBrace = raw.lastIndexOf('}', arrayEnd);
    next = `${raw.slice(0, lastBrace + 1)},${eol}${text}${raw.slice(lastBrace + 1)}`;
  } else {
    const at = entryOffsets[index]!;
    next = `${raw.slice(0, at)}${text},${eol}${raw.slice(at)}`;
  }

  const today = new Date().toISOString().slice(0, 10);
  next = next.replace(/("lastModified"\s*:\s*")[^"]*(")/, `$1${today}$2`);

  JSON.parse(next); // never write a broken file

  console.log(`${flags['dry-run'] ? '[dry run] ' : ''}Adding to cv.json (position ${index === -1 ? publications.length + 1 : index + 1} of ${publications.length + 1}):`);
  console.log(JSON.stringify(cleaned, null, 2));
  if (!entry.topic) console.log('\nNo --topic given: the site will infer one from the title (see TOPIC_RULES in src/lib/posts.ts).');
  if (!flags['dry-run']) writeFileSync(CV_PATH, next);
}

main().catch((error) => {
  console.error(error instanceof Failure ? error.message : error);
  process.exitCode = 1;
});
