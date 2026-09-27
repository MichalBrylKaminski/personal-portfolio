// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Set SITE_URL once the hosting/domain is decided; it's used for canonical URLs and the RSS feed.
  site: process.env.SITE_URL,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { theme: 'vitesse-dark' },
  },
});
