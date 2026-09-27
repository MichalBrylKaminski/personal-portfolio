import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllPosts } from '../lib/posts';
import { site } from '../data/site';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  return rss({
    title: `${site.title} — Blog`,
    description: site.blog.description,
    // Falls back to the dev server origin until SITE_URL is configured.
    site: context.site ?? context.url.origin,
    items: posts.map((post) => ({
      title: post.title,
      description: post.summary,
      pubDate: post.date,
      link: post.href,
      categories: [post.topic],
    })),
  });
}
