/**
 * Canonical first-party routes. Use these in nav and internal links so URLs stay consistent.
 */
export const ROUTES = {
  home: '/',
  series: '/series',
  projects: '/projects',
  blog: '/blog',
  about: '/about',
  demos: '/demos',
  search: '/search',
  rss: '/rss.xml',
} as const;

export type RouteKey = keyof typeof ROUTES;
