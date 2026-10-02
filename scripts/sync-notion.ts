/**
 * Pulls posts marked "Published" from a Notion database into the repo.
 *
 *   npm run sync:notion              write src/content/blog/<slug>.md + src/assets/blog/<slug>/*
 *   npm run sync:notion -- --dry-run print what would change, touch nothing
 *
 * Needs NOTION_TOKEN and NOTION_POSTS_DATABASE_ID (see .env.example). Generated posts carry a
 * `notionId` in their frontmatter: only those files are ever rewritten or deleted by this script.
 */
import { Client, isFullPage } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const POSTS_DIR = join(ROOT, 'src/content/blog');
const ASSETS_DIR = join(ROOT, 'src/assets/blog');
const DRY_RUN = process.argv.includes('--dry-run');

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_POSTS_DATABASE_ID;
if (!token || !databaseId) {
  console.error('Set NOTION_TOKEN and NOTION_POSTS_DATABASE_ID in .env (see .env.example).');
  process.exit(1);
}

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });

const warnings: string[] = [];
const warn = (message: string) => {
  warnings.push(message);
  console.warn(`  ! ${message}`);
};

// ---------------------------------------------------------------- helpers

type Prop = PageObjectResponse['properties'][string];

function propText(prop: Prop | undefined): string {
  switch (prop?.type) {
    case 'title':
      return prop.title.map((t) => t.plain_text).join('').trim();
    case 'rich_text':
      return prop.rich_text.map((t) => t.plain_text).join('').trim();
    case 'select':
      return prop.select?.name ?? '';
    case 'status':
      return prop.status?.name ?? '';
    default:
      return '';
  }
}

function propDate(prop: Prop | undefined): string | undefined {
  return prop?.type === 'date' ? prop.date?.start.slice(0, 10) : undefined;
}

/** Looks a property up case-insensitively, so "Topic" and "topic" both work. */
function prop(page: PageObjectResponse, name: string): Prop | undefined {
  const key = Object.keys(page.properties).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? page.properties[key] : undefined;
}

function pageTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find((p) => p.type === 'title');
  return propText(titleProp);
}

// NFD does not decompose "ł", so it needs its own mapping.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Notion's code language labels that Shiki knows under a different name. */
const LANGUAGES: Record<string, string> = {
  'c#': 'csharp',
  'f#': 'fsharp',
  'c++': 'cpp',
  'plain text': 'text',
  shell: 'bash',
  'objective-c': 'objc',
};

const yaml = (value: string) => JSON.stringify(value);

function readFrontmatterId(file: string): string | undefined {
  return readFileSync(file, 'utf8').match(/^notionId:\s*"?([^"\r\n]+)"?\s*$/m)?.[1];
}

function writeIfChanged(file: string, content: string): 'created' | 'updated' | 'unchanged' {
  const exists = existsSync(file);
  if (exists && readFileSync(file, 'utf8') === content) return 'unchanged';
  if (!DRY_RUN) writeFileSync(file, content);
  return exists ? 'updated' : 'created';
}

// ---------------------------------------------------------------- images and block transformers

/** Set before each page is converted; the image transformer needs to know where to put files. */
let currentSlug = '';
let currentImages = new Set<string>();

n2m.setCustomTransformer('image', async (block) => {
  if (!('image' in block)) return false;
  const { image } = block;
  const url = image.type === 'external' ? image.external.url : image.file.url;
  const alt = image.caption
    .map((c) => c.plain_text)
    .join('')
    .replace(/[\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const dir = join(ASSETS_DIR, currentSlug);
  const stem = block.id.replace(/-/g, '');
  let ext = extname(new URL(url).pathname).toLowerCase();
  const existing = existsSync(dir) ? readdirSync(dir).find((f) => f.startsWith(`${stem}.`)) : undefined;
  let fileName = existing ?? (ext ? `${stem}${ext}` : '');

  if (!existing && !DRY_RUN) {
    // Notion-hosted URLs expire after about an hour, so the file has to be fetched now.
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed (${response.status}): ${url}`);
    if (!ext) {
      ext = `.${(response.headers.get('content-type') ?? 'image/png').split('/')[1]?.split(';')[0] ?? 'png'}`;
      fileName = `${stem}${ext}`;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fileName), Buffer.from(await response.arrayBuffer()));
  }
  fileName ||= `${stem}.png`;
  currentImages.add(fileName);
  return `![${alt}](../../assets/blog/${currentSlug}/${fileName})`;
});

n2m.setCustomTransformer('code', (block) => {
  if (!('code' in block)) return false;
  const { code } = block;
  const language = code.language.toLowerCase();
  const body = code.rich_text.map((t) => t.plain_text).join('');
  // Use a longer fence than any backtick run inside the code.
  const longestRun = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}${LANGUAGES[language] ?? language}\n${body}\n${fence}`;
});

// Files and videos are served from expiring Notion URLs, so a link would be dead within the hour.
for (const type of ['file', 'pdf', 'video', 'audio', 'child_database', 'child_page', 'unsupported']) {
  n2m.setCustomTransformer(type, () => {
    warn(`"${currentSlug}": ${type} block is not supported and was skipped`);
    return '';
  });
}

// ---------------------------------------------------------------- Notion queries

async function fetchPublishedPages(): Promise<PageObjectResponse[]> {
  const database = await notion.databases.retrieve({ database_id: databaseId! });
  const dataSourceId = 'data_sources' in database ? database.data_sources[0]?.id : undefined;
  if (!dataSourceId) {
    throw new Error('Could not find a data source on that database. Is NOTION_POSTS_DATABASE_ID right, and is the database shared with the integration?');
  }

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 });
    for (const result of response.results) {
      if (result.object === 'page' && isFullPage(result)) pages.push(result);
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages.filter((page) => propText(prop(page, 'Status')).toLowerCase() === 'published');
}

// ---------------------------------------------------------------- main

const counts = { created: 0, updated: 0, unchanged: 0, removed: 0 };
const topics = new Set<string>();

console.log(`${DRY_RUN ? '[dry run] ' : ''}Syncing posts from Notion...`);
const pages = await fetchPublishedPages();
console.log(`${pages.length} page(s) with Status = Published`);

mkdirSync(POSTS_DIR, { recursive: true });
const keepSlugs = new Set<string>();
const protectedIds = new Set<string>(); // published pages we could not convert; leave their files alone
const usedSlugs = new Map<string, string>();

for (const page of pages) {
  const title = pageTitle(page);
  const slug = slugify(propText(prop(page, 'Slug')) || title);
  const label = title || page.id;

  if (!slug) {
    warn(`"${label}": no title or slug, skipped`);
    protectedIds.add(page.id);
    continue;
  }
  if (usedSlugs.has(slug)) {
    warn(`"${label}": slug "${slug}" is already used by "${usedSlugs.get(slug)}", skipped`);
    protectedIds.add(page.id);
    continue;
  }
  usedSlugs.set(slug, label);
  keepSlugs.add(slug);

  const description = propText(prop(page, 'Description'));
  const topic = propText(prop(page, 'Topic'));
  const missing = [!title && 'Title', !description && 'Description', !topic && 'Topic'].filter(Boolean);
  if (missing.length) {
    warn(`"${label}": missing ${missing.join(', ')}, skipped`);
    protectedIds.add(page.id);
    continue;
  }

  const target = join(POSTS_DIR, `${slug}.md`);
  const clash = [target, join(POSTS_DIR, `${slug}.mdx`)].find((f) => existsSync(f) && readFrontmatterId(f) !== page.id);
  if (clash) {
    warn(`"${label}": ${slug} already exists and is not managed by Notion, skipped (set a different Slug)`);
    protectedIds.add(page.id);
    continue;
  }

  currentSlug = slug;
  currentImages = new Set();
  const body = n2m.toMarkdownString(await n2m.pageToMarkdown(page.id)).parent?.trim() ?? '';
  if (!body) warn(`"${label}": page body is empty`);

  const pubDate = propDate(prop(page, 'Published')) ?? page.created_time.slice(0, 10);
  const updatedDate = propDate(prop(page, 'Updated'));
  const frontmatter = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description)}`,
    `pubDate: ${pubDate}`,
    ...(updatedDate ? [`updatedDate: ${updatedDate}`] : []),
    `topic: ${yaml(topic)}`,
    `notionId: ${yaml(page.id)}`,
    '---',
  ].join('\n');

  const result = writeIfChanged(target, `${frontmatter}\n\n${body}\n`);
  counts[result]++;
  topics.add(topic);
  console.log(`  ${result.padEnd(9)} ${slug}`);

  // Drop images that are no longer on the page.
  const dir = join(ASSETS_DIR, slug);
  if (existsSync(dir)) {
    for (const file of readdirSync(dir)) {
      if (!currentImages.has(file) && !DRY_RUN) rmSync(join(dir, file));
    }
    if (!currentImages.size && !DRY_RUN) rmSync(dir, { recursive: true, force: true });
  }
}

// Remove generated posts that are no longer published. Never run this off an empty result:
// a wrong token or database ID would otherwise wipe every post.
const owned = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ file: join(POSTS_DIR, f), slug: f.slice(0, -3), id: readFrontmatterId(join(POSTS_DIR, f)) }))
  .filter((post) => post.id);

if (pages.length === 0 && owned.length > 0) {
  warn('Notion returned no published pages; not removing any existing posts');
} else {
  for (const post of owned) {
    if (keepSlugs.has(post.slug) || protectedIds.has(post.id!)) continue;
    if (!DRY_RUN) {
      rmSync(post.file);
      rmSync(join(ASSETS_DIR, post.slug), { recursive: true, force: true });
    }
    counts.removed++;
    console.log(`  removed   ${post.slug}`);
  }
}

console.log(
  `\n${DRY_RUN ? '[dry run] ' : ''}created ${counts.created}, updated ${counts.updated}, unchanged ${counts.unchanged}, removed ${counts.removed}`,
);
if (topics.size) console.log(`Topics used: ${[...topics].sort().join(', ')}`);
if (warnings.length) console.log(`${warnings.length} warning(s), see above.`);
