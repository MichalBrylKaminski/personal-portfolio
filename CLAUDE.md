# CLAUDE.md

Personal portfolio + blog for Michał Kamiński. Astro 7 (static output), Tailwind CSS v4, MDX. No UI framework, almost no client JS (the mobile menu toggle in `SiteHeader.astro` and Vercel Analytics, injected in `BaseLayout.astro`).

## Commands

- `npm run dev` — dev server on `localhost:4321`; draft posts are visible here only.
- `npm run build` — `astro check` then `astro build` to `dist/`. Run this to verify changes; it must finish with 0 errors.
- `npx astro sync` — regenerate content-collection types after changing `src/content.config.ts`.
- `SITE_URL=https://… npm run build` — overrides `site` (defaults to `https://brylex-it.pl`; used for canonical URLs, RSS, sitemap).

## Where things come from

- **`cv.json` is the single source of truth** for the home page. It follows the [JSON Resume](https://jsonresume.org/schema) schema; the extensions are an optional `keywords` array on `work[]` entries (rendered as tech tags) and an optional `topic` string on `publications[]` entries (overrides the topic inferred from the title). Don't hardcode resume facts in components. Add the field to `cv.json` and read it through `src/lib/cv.ts`.
- `src/lib/cv.ts` — typed view of `cv.json` plus everything derived from it: grouping work by company, durations, stats (career years, lead years), skill levels (0–4 tally bars), cloud-keyword detection for accent tags.
- `src/lib/dates.ts` — year/month maths and formatting. `NOW` is the **build** date, so durations and stats only update on rebuild.
- `src/lib/posts.ts` — merges local MDX posts with `cv.json` `publications` (external links, e.g. Code Maze) into one list. Publications have no tags in JSON Resume, so their topic is inferred from the title via `TOPIC_RULES`.
- `src/data/site.ts` — copy that isn't resume data (readout card facts, section intros, blog title/description).
- `src/content/blog/*.{md,mdx}` — blog posts. Schema in `src/content.config.ts` (`title`, `description`, `pubDate`, `topic`, optional `updatedDate`, `draft`, `notionId`). Files with a `notionId` are **generated** by `npm run sync:notion` (from the Notion Posts database, only `Status = Published`; images go to `src/assets/blog/<slug>/`): don't hand-edit them, and the script deletes them when the page is unpublished. Hand-written posts have no `notionId` and are never touched. Setup and the Notion schema are in `README.md` ("Adding an article"); the script needs `NOTION_TOKEN` + `NOTION_POSTS_DATABASE_ID` in `.env` (see `.env.example`).
- `scripts/` — `sync-notion.ts` (above) and `add-external.ts` (`npm run add:external -- <url>`: scrapes title/date/summary and inserts a `publications` entry into `cv.json` as text, preserving its mixed CRLF/LF line endings, so don't re-serialize that file with `JSON.stringify`). Run directly by Node (native TypeScript, erasable syntax only) and type-checked by `tsc`/`astro check`. Files starting with `_` are ignored. `post-template.mdx` is a draft kept as the authoring template.
- Optional files in `public/`: the `basics.image` path (`me_avatar.jpg`) replaces the initials avatar, and `cv.pdf` enables the Download CV button. Both are detected at build time by `src/lib/files.ts`.

## Routes

`/` home · `/blog/` all posts · `/blog/topic/[topic]/` static per-topic pages (topic filter is plain links, no JS) · `/blog/[...slug]/` local posts · `/rss.xml`.

## Design system

The look follows the **Tallydial** design system ("control room": a single dark theme, one amber accent). The approved mockups live on the design canvas <https://claude.ai/artifact/GyjCKu8E9tgmwV7iBw6qio> (desktop, mobile, blog index). Match it when changing UI.

- Tokens are in the `@theme` block of `src/styles/global.css`: use `bg-page`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-2`, `text-muted`, `border-border`, `border-border-strong`, `text-accent`, `rounded-sm` (10px), `rounded-lg` (14px). Don't introduce raw hex values or new greys; reach for a dimmer existing token first.
- Type: Chakra Petch (`font-sans`) for headings/body, JetBrains Mono (`font-mono`) for labels, uppercase with wide tracking. Fonts are self-hosted via `@fontsource` imports in `BaseLayout.astro`.
- Component classes in `global.css`: `.card`, `.caption`, `.tag`/`.tag-accent`, `.btn` + `.btn-primary` / `.btn-outline-accent` / `.btn-ghost`, `.nav-tab`, `.prose-post`, and the `wrap` utility (page column). Borders, not shadows. No emoji; icons come from `src/components/Icon.astro` (inline stroke SVGs; add new paths there).
- **Tailwind v4 gotcha:** classes defined in `@layer components` can't take variants (`lg:card` silently does nothing). Use plain utilities for responsive variants, or define an `@utility` instead.
- Layout is mobile-first; the desktop design kicks in at `lg`. Accessibility: 44px min touch targets, visible `:focus-visible` ring (accent), real `<a>`/`<button>` elements.

## Decisions already made

- Command palette (Ctrl K) was intentionally dropped for now.
- Hosting is Vercel (static output, no adapter) with the domain `brylex-it.pl`. The original Hostinger host couldn't be used, so the Node adapter was added and then removed. `@astrojs/sitemap` generates the sitemap.
- Git remote: `github.com/MichalBrylKaminski/personal-portfolio`. Main branch is `master`.
