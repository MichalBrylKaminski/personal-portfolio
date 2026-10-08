import { basics, experience, labelParts, type ProjectView } from './cv';

type Schema = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

/** Absolute URL for a site path. */
const abs = (site: URL, path: string) => new URL(path, site).href;

export function personSchema(site: URL, image?: string): Schema {
  const current = experience.find((group) => group.end === null);
  const skills = [...new Set(experience.flatMap((group) => group.roles.flatMap((role) => role.keywords)))];
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': abs(site, '/#person'),
    name: basics.name,
    jobTitle: labelParts[0],
    url: abs(site, '/'),
    ...(image && { image }),
    ...(basics.location?.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: basics.location.city,
        addressCountry: basics.location.countryCode,
      },
    }),
    ...(current && { worksFor: { '@type': 'Organization', name: current.company, ...(current.url && { url: current.url }) } }),
    ...(basics.profiles?.length && { sameAs: basics.profiles.map((profile) => profile.url) }),
    ...(skills.length && { knowsAbout: skills }),
  };
}

export function websiteSchema(site: URL, name: string): Schema {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name,
    url: abs(site, '/'),
    publisher: { '@id': abs(site, '/#person') },
  };
}

export function breadcrumbSchema(site: URL, items: { name: string; path: string }[]): Schema {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: abs(site, item.path),
    })),
  };
}

export function blogPostingSchema(
  site: URL,
  post: { title: string; description: string; path: string; pubDate: Date; updatedDate?: Date },
): Schema {
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.pubDate.toISOString(),
    dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
    mainEntityOfPage: abs(site, post.path),
    author: { '@id': abs(site, '/#person') },
  };
}

export function softwareSchema(site: URL, project: ProjectView, description: string): Schema {
  return {
    '@context': CONTEXT,
    '@type': 'WebApplication',
    name: project.name,
    description,
    ...(project.url && { url: project.url }),
    applicationCategory: 'WebApplication',
    operatingSystem: 'Any',
    datePublished: `${project.start.year}-${String(project.start.month).padStart(2, '0')}-01`,
    author: { '@id': abs(site, '/#person') },
  };
}
