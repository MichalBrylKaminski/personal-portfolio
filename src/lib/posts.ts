import { getCollection } from 'astro:content';
import { cv } from './cv';

export interface PostSummary {
  id: string;
  title: string;
  summary: string;
  date: Date;
  topic: string;
  href: string;
  /** Set for articles published elsewhere (from cv.json publications). */
  publisher?: string;
}

export interface Topic {
  name: string;
  slug: string;
  count: number;
}

/** Publications carry no tags in JSON Resume, so unless cv.json sets `topic` it is inferred from the title. */
const TOPIC_RULES: [RegExp, string][] = [
  [/rebus|nservicebus|masstransit|rabbitmq|saga|kafka|sqs/i, 'Messaging'],
  [/mock|unit test|testing/i, 'Testing'],
  [/aws|lambda|dynamodb|athena/i, 'AWS'],
  [/asp\.?net core/i, 'ASP.NET Core'],
];

function inferTopic(title: string): string {
  return TOPIC_RULES.find(([pattern]) => pattern.test(title))?.[1] ?? 'C#';
}

export function topicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/#/g, '-sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getLocalPosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Blog posts from the repo plus articles published elsewhere, newest first. */
export async function getAllPosts(): Promise<PostSummary[]> {
  const local: PostSummary[] = (await getLocalPosts()).map((post) => ({
    id: post.id,
    title: post.data.title,
    summary: post.data.description,
    date: post.data.pubDate,
    topic: post.data.topic,
    href: `/blog/${post.id}/`,
  }));
  const external: PostSummary[] = cv.publications
    .filter((publication) => publication.url)
    .map((publication) => ({
      id: publication.url!,
      title: publication.name,
      summary: publication.summary ?? '',
      date: new Date(`${publication.releaseDate}T00:00:00Z`),
      topic: publication.topic ?? inferTopic(publication.name),
      href: publication.url!,
      publisher: publication.publisher,
    }));
  return [...local, ...external].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

/** Topics by post count, most used first. */
export function getTopics(posts: PostSummary[]): Topic[] {
  const counts = new Map<string, number>();
  for (const post of posts) counts.set(post.topic, (counts.get(post.topic) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: topicSlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
