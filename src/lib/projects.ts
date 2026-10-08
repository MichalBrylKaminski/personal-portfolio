import { getCollection, type CollectionEntry } from 'astro:content';
import { projects, type ProjectView } from './cv';

export interface CaseStudy {
  entry: CollectionEntry<'projects'>;
  project: ProjectView;
}

/** Published case studies joined to their cv.json project. Entries naming an unknown project are an error. */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  const entries = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.map((entry) => {
    const project = projects.find((candidate) => candidate.name === entry.data.project);
    if (!project) throw new Error(`${entry.id}: no project named "${entry.data.project}" in cv.json`);
    return { entry, project };
  });
}

/** Slugs of projects that have a published case study. */
export async function getCaseStudySlugs(): Promise<Set<string>> {
  return new Set((await getCaseStudies()).map(({ project }) => project.slug));
}
