// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/** Content files (blog posts, case studies) by URL path, with their frontmatter date and draft flag. */
function contentPages() {
  /** @type {Map<string, { draft: boolean; date: Date }>} */
  const pages = new Map();
  for (const [dir, prefix] of [
    ['src/content/blog', '/blog/'],
    ['src/content/projects', '/projects/'],
  ]) {
    for (const file of readdirSync(dir).filter((name) => /\.mdx?$/.test(name) && !name.startsWith('_'))) {
      const frontmatter = readFileSync(`${dir}/${file}`, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const field = (/** @type {string} */ key) => frontmatter.match(new RegExp(`^${key}:[ \t]*['"]?(.+?)['"]?[ \t]*\r?$`, 'm'))?.[1];
      const project = field('project');
      const slug = project ? project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : file.replace(/\.mdx?$/, '');
      pages.set(`${prefix}${slug}/`, {
        draft: field('draft') === 'true',
        date: new Date(field('updatedDate') ?? field('pubDate') ?? NaN),
      });
    }
  }
  return pages;
}

const pages = contentPages();

export default defineConfig({
  // Used for canonical URLs, the RSS feed and the sitemap. Override with SITE_URL (e.g. for preview builds).
  site: process.env.SITE_URL ?? 'https://brylex-it.pl',
  integrations: [
    mdx(),
    sitemap({
      // Drafts are not built, so keep them out of the sitemap.
      filter: (page) => !pages.get(new URL(page).pathname)?.draft,
      // lastmod only where it is true: content pages carry their own dates, everything else gets none.
      serialize(item) {
        const date = pages.get(new URL(item.url).pathname)?.date;
        if (date && !Number.isNaN(date.valueOf())) item.lastmod = date.toISOString();
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { theme: 'vitesse-dark' },
  },
});
