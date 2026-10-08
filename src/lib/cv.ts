import raw from '../../cv.json';
import {
  NOW,
  compareYearMonth,
  formatDuration,
  formatYearMonth,
  monthsBetween,
  parseYearMonth,
  type YearMonth,
} from './dates';

// Subset of the JSON Resume schema (https://jsonresume.org/schema) that the site renders.
export interface Profile {
  network: string;
  username: string;
  url: string;
}

export interface Work {
  name: string;
  position: string;
  url?: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  summary?: string;
  highlights?: string[];
  /** Not in the base schema: technologies used in the role, rendered as tags. */
  keywords?: string[];
}

export interface Education {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  activities?: string;
}

export interface Certificate {
  name: string;
  date?: string;
  issuer?: string;
  url?: string;
}

export interface Skill {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface Language {
  language: string;
  fluency?: string;
}

export interface Publication {
  name: string;
  publisher?: string;
  releaseDate: string;
  url?: string;
  summary?: string;
  /** Extension to JSON Resume: overrides the topic inferred from the title. */
  topic?: string;
}

export interface Project {
  name: string;
  startDate: string;
  endDate?: string | null;
  url?: string;
  description?: string;
  highlights?: string[];
}

export interface Resume {
  basics: {
    name: string;
    label?: string;
    image?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; region?: string; countryCode?: string };
    profiles?: Profile[];
  };
  work: Work[];
  education: Education[];
  certificates: Certificate[];
  skills: Skill[];
  languages: Language[];
  projects: Project[];
  publications: Publication[];
  meta?: { version?: string; lastModified?: string };
}

export const cv = raw as Resume;

const COUNTRY_NAMES: Record<string, string> = { PL: 'Poland' };

export const basics = cv.basics;
export const location = {
  city: basics.location?.city ?? '',
  country: COUNTRY_NAMES[basics.location?.countryCode ?? ''] ?? basics.location?.countryCode ?? '',
  countryCode: basics.location?.countryCode ?? '',
};

/** "Senior .NET Developer | AWS Enthusiast" → ["Senior .NET Developer", "AWS Enthusiast"] */
export const labelParts = (basics.label ?? '').split('|').map((part) => part.trim()).filter(Boolean);

// ---------------------------------------------------------------- experience

export interface Role {
  position: string;
  start: YearMonth;
  end: YearMonth | null;
  summary?: string;
  highlights: string[];
  keywords: string[];
  location?: string;
}

export interface ExperienceGroup {
  company: string;
  url?: string;
  location?: string;
  start: YearMonth;
  end: YearMonth | null;
  roles: Role[];
}

const endOrNow = (end: YearMonth | null) => end ?? NOW;

function toRole(work: Work): Role {
  return {
    position: work.position,
    start: parseYearMonth(work.startDate),
    end: work.endDate ? parseYearMonth(work.endDate) : null,
    summary: work.summary,
    highlights: work.highlights ?? [],
    keywords: work.keywords ?? [],
    location: work.location,
  };
}

/** Work entries grouped by company, most recent first; current roles lead within a company. */
export const experience: ExperienceGroup[] = (() => {
  const groups = new Map<string, ExperienceGroup>();
  for (const work of cv.work) {
    const role = toRole(work);
    const group = groups.get(work.name);
    if (!group) {
      groups.set(work.name, {
        company: work.name,
        url: work.url,
        location: work.location,
        start: role.start,
        end: role.end,
        roles: [role],
      });
      continue;
    }
    group.roles.push(role);
    if (compareYearMonth(role.start, group.start) < 0) group.start = role.start;
    if (group.end && (!role.end || compareYearMonth(role.end, group.end) > 0)) group.end = role.end;
  }
  const byRecency = <T extends { start: YearMonth; end: YearMonth | null }>(a: T, b: T) =>
    compareYearMonth(endOrNow(b.end), endOrNow(a.end)) || compareYearMonth(b.start, a.start);
  const list = [...groups.values()];
  for (const group of list) group.roles.sort(byRecency);
  return list.sort(byRecency);
})();

export interface ProjectView {
  name: string;
  /** URL segment of the project's case-study page. */
  slug: string;
  url?: string;
  start: YearMonth;
  end: YearMonth | null;
  description?: string;
  highlights: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Projects, most recent first. */
export const projects: ProjectView[] = cv.projects
  .map((project) => ({
    name: project.name,
    slug: slugify(project.name),
    url: project.url,
    start: parseYearMonth(project.startDate),
    end: project.endDate ? parseYearMonth(project.endDate) : null,
    description: project.description,
    highlights: project.highlights ?? [],
  }))
  .sort((a, b) => compareYearMonth(endOrNow(b.end), endOrNow(a.end)) || compareYearMonth(b.start, a.start));

export function isCurrent(item: { end: YearMonth | null }): boolean {
  return item.end === null;
}

export function durationOf(item: { start: YearMonth; end: YearMonth | null }): string {
  return formatDuration(monthsBetween(item.start, endOrNow(item.end)));
}

/** "Mar 2016 — Present" */
export function monthRange(item: { start: YearMonth; end: YearMonth | null }): string {
  return `${formatYearMonth(item.start)} — ${item.end ? formatYearMonth(item.end) : 'Present'}`;
}

/** "2016 — Now", "2014" */
export function yearRange(item: { start: YearMonth; end: YearMonth | null }): string {
  if (!item.end) return `${item.start.year} — Now`;
  if (item.end.year === item.start.year) return String(item.start.year);
  return `${item.start.year} — ${item.end.year}`;
}

const cloudKeywords = new Set(
  cv.skills.filter((skill) => /aws|cloud/i.test(skill.name)).flatMap((skill) => skill.keywords ?? []),
);

/** Cloud services get the accent treatment in tag lists. */
export function isCloudKeyword(keyword: string): boolean {
  return /^aws\b/i.test(keyword) || cloudKeywords.has(keyword.replace(/^aws\s+/i, ''));
}

// ---------------------------------------------------------------- at a glance

const firstStart = cv.work.map((work) => parseYearMonth(work.startDate)).sort(compareYearMonth)[0];
const leadMonths = experience
  .flatMap((group) => group.roles)
  .filter((role) => /lead|manager|head/i.test(role.position))
  .reduce((sum, role) => sum + monthsBetween(role.start, endOrNow(role.end)), 0);

export const careerStartYear = firstStart?.year ?? NOW.year;
export const careerYears = firstStart ? Math.floor(monthsBetween(firstStart, NOW) / 12) : 0;
export const leadYears = { whole: Math.floor(leadMonths / 12), plus: leadMonths % 12 > 0 };

// ---------------------------------------------------------------- skills, links

const SKILL_LEVELS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  senior: 4,
  expert: 4,
  master: 4,
};

/** Level on a 0–4 scale, drawn as tally bars. */
export function skillLevel(level?: string): number {
  return SKILL_LEVELS[level?.toLowerCase() ?? ''] ?? 0;
}

export const primaryProfile = basics.profiles?.[0];

/** "https://www.linkedin.com/in/someone" → "/in/someone" */
export function profilePath(profile: Profile): string {
  try {
    return decodeURI(new URL(profile.url).pathname).replace(/\/$/, '') || profile.username;
  } catch {
    return profile.username;
  }
}

export const lastModified = cv.meta?.lastModified ? new Date(`${cv.meta.lastModified}T00:00:00Z`) : undefined;
