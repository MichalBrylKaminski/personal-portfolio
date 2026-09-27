# personal-portfolio

Single-page portfolio and blog for Michał Kamiński, built with [Astro](https://astro.build) and Tailwind CSS v4 using
the Tallydial design tokens.

## Commands

| Command           | Action                                            |
| ----------------- | ------------------------------------------------- |
| `npm install`     | Install dependencies                              |
| `npm run dev`     | Dev server at `localhost:4321` (drafts included)  |
| `npm run build`   | Type-check and build the static site to `./dist/` |
| `npm run preview` | Serve the production build locally                |

Set `SITE_URL` (e.g. `SITE_URL=https://example.com npm run build`) once the domain is known; it's used for canonical
URLs and absolute links in the RSS feed.

## Content

- **`cv.json`** ([JSON Resume](https://jsonresume.org/schema)) drives the home page: hero, stats, experience timeline,
  skills, education, certificates and contact rows. Work entries may carry an extra `keywords` array, rendered as tech
  tags. `publications` appear in the Writing section and on the blog as external links; their blog topic is inferred
  from the title (`src/lib/posts.ts`).
- **`src/content/blog/*.mdx`** are blog posts. See the draft `post-template.mdx` (visible only in `npm run dev`) for
  the frontmatter fields.
- **`src/data/site.ts`** holds copy that isn't in `cv.json` (readout card facts, section intros, blog title).
- **Optional files in `public/`**: add `me_avatar.jpg` (the path in `basics.image`) to replace the initials avatar, and
  `cv.pdf` to show the Download CV button.
