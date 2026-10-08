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
| `npm run sync:notion` | Pull Published posts from Notion into `src/content/blog/` (add `-- --dry-run` to preview) |
| `npm run add:external -- <url>` | Add an article published elsewhere to `cv.json` |

Set `SITE_URL` (e.g. `SITE_URL=https://example.com npm run build`) once the domain is known; it's used for canonical
URLs and absolute links in the RSS feed.

## Content

- **`cv.json`** ([JSON Resume](https://jsonresume.org/schema)) drives the home page: hero, stats, experience timeline,
  skills, education, certificates and contact rows. Work entries may carry an extra `keywords` array, rendered as tech
  tags. `publications` appear in the Writing section and on the blog as external links; their blog topic is the
  optional `topic` field, otherwise inferred from the title (`src/lib/posts.ts`).
- **`src/content/blog/*.md` / `*.mdx`** are blog posts. Notion-synced posts are `.md` files carrying a `notionId`;
  don't edit those by hand. For posts written directly in the repo, see the draft `post-template.mdx` (visible only
  in `npm run dev`) for the frontmatter fields.
- **`src/data/site.ts`** holds copy that isn't in `cv.json` (readout card facts, section intros, blog title).
- **Optional files**: add `src/assets/me_avatar.png` (the basename in `basics.image`) to replace the initials avatar, and
  `public/cv.pdf` to show the Download CV button.
- **Project case studies**: `src/content/projects/<name>.mdx` with `project:` set to the `cv.json` project name. Set
  `draft: false` to publish.

## Adding an article

### An article published elsewhere (Code Maze, dev.to, ...)

```sh
npm run add:external -- https://code-maze.com/some-article/ --topic Messaging
```

Title, date, summary and publisher are read from the page's metadata. Pass `--title`, `--date YYYY-MM-DD`,
`--summary` or `--publisher` to override them, or when the site can't be scraped. Without `--topic` the site guesses
one from the title. Add `--dry-run` to preview. Then `git diff cv.json`, commit and push.

### A post written in Notion

**One-time setup**

1. Create a Notion database ("Posts") with these properties (property names are matched case-insensitively):

   | Property      | Type                        | Notes                                                              |
   | ------------- | --------------------------- | ------------------------------------------------------------------ |
   | `Name`        | Title                       | Becomes the post title (the title property can be named anything). |
   | `Description` | Text                        | Required. One or two sentences; used as the summary and meta tag.  |
   | `Topic`       | Select                      | Required. Reuse existing topics (Messaging, Testing, AWS, ASP.NET Core, C#); a new name creates a new topic page. |
   | `Published`   | Date                        | Publish date. Falls back to the page's creation date.              |
   | `Status`      | Select or Status            | `Draft` or `Published`. Only `Published` is synced.                |
   | `Slug`        | Text (optional)             | URL part. Defaults to the slugified title.                         |
   | `Updated`     | Date (optional)             | Shows "Updated ..." on the post.                                   |

2. Create an internal integration at <https://www.notion.so/profile/integrations> and share the database with it
   (database `...` menu, Connections).
3. Copy `.env.example` to `.env` and fill in `NOTION_TOKEN` and `NOTION_POSTS_DATABASE_ID` (the 32-character part of
   the database URL, before `?v=`).

**Publishing**

1. Write the page in Notion and set `Status` to `Published`.
2. `npm run sync:notion` (or `npm run sync:notion -- --dry-run` first). This writes `src/content/blog/<slug>.md` and
   downloads images to `src/assets/blog/<slug>/`.
3. Check `git diff`, run `npm run build`, commit and push; Vercel deploys.

Notes:

- Edit posts in Notion, not in the repo: the next sync overwrites the generated files.
- Setting a page back to `Draft` (or deleting it) removes its generated files on the next sync. Drafts are never
  written to the repo. Hand-written posts are never touched.
- Images are copied into the repo because Notion's file URLs expire. Videos, files, PDFs and audio blocks are not
  supported (the sync warns and skips them).
- Posts are Markdown, not MDX, so `<` and `{` in prose are safe. Put generics like `List<string>` in backticks, as
  raw `<tags>` in plain text are treated as HTML.
