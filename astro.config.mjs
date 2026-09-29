// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Used for canonical URLs, the RSS feed and the sitemap. Override with SITE_URL (e.g. for preview builds).
  site: process.env.SITE_URL ?? 'https://brylex-it.pl',
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { theme: 'vitesse-dark' },
  },
});
