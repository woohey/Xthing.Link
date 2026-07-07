import { getCollection } from 'astro:content';
import { collectSeriesSummaries } from './content-hub.js';
import { ROUTES } from './routes';

/** Entry for the on-site search page (static client filter). */
export type SearchIndexEntry = {
  title: string;
  href: string;
  description: string;
  /** Space-separated or loose keywords for matching. */
  keywords?: string;
};

function basePages(): SearchIndexEntry[] {
  return [
    {
      title: 'Home',
      href: ROUTES.home,
      description: 'Landing page and site overview.',
      keywords: 'home index',
    },
    {
      title: 'Projects',
      href: ROUTES.projects,
      description: 'Project list and portfolio.',
      keywords: 'projects work demos',
    },
    {
      title: 'Writing',
      href: ROUTES.blog,
      description: 'Articles, notes, and technical writing.',
      keywords: 'blog writing posts notes',
    },
    {
      title: 'Series',
      href: ROUTES.series,
      description: 'Topic-based collections of related writing.',
      keywords: 'series topics collections',
    },
    {
      title: 'Demos',
      href: ROUTES.demos,
      description: 'Interactive demo routes.',
      keywords: 'demos charts dashboard visualization',
    },
    {
      title: 'About',
      href: ROUTES.about,
      description: 'About this site and contact context.',
      keywords: 'about contact',
    },
  ];
}

/**
 * Full search corpus: section pages plus published blog posts and projects.
 */
export async function getAllSearchEntries(): Promise<SearchIndexEntry[]> {
  const blog = await getCollection('blog', ({ data }) => data.draft !== true);
  const projects = await getCollection('projects');

  const blogEntries: SearchIndexEntry[] = blog.map((post) => ({
    title: post.data.title,
    href: `${ROUTES.blog}/${post.id}/`,
    description: post.data.description,
    keywords: ['blog post', ...(post.data.tags ?? []), post.data.series ?? ''].filter(Boolean).join(' '),
  }));

  const projectEntries: SearchIndexEntry[] = projects.map((p) => ({
    title: p.data.title,
    href: `${ROUTES.works}/${p.id}/`,
    description: p.data.description,
    keywords: ['project', p.data.demoSlug ? `demo ${p.data.demoSlug}` : '', p.data.status ?? '']
      .filter(Boolean)
      .join(' '),
  }));

  const demoExtras: SearchIndexEntry[] = projects
    .filter((p) => Boolean(p.data.demoSlug))
    .map((p) => ({
      title: `${p.data.title} (demo)`,
      href: `${ROUTES.demos}/${p.data.demoSlug}/`,
      description: `Interactive demo: ${p.data.description}`,
      keywords: 'demo dashboard',
    }));

  const seriesEntries: SearchIndexEntry[] = collectSeriesSummaries(blog).map((series) => ({
    title: series.title,
    href: `${ROUTES.series}/${series.slug}/`,
    description: series.description,
    keywords: ['series', series.title, ...series.posts.flatMap((post) => post.data.tags ?? [])].join(' '),
  }));

  return [...basePages(), ...seriesEntries, ...blogEntries, ...projectEntries, ...demoExtras];
}
