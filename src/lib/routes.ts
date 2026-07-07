/**
 * Canonical first-party routes. Use these in nav and internal links so URLs stay consistent.
 */
export const ROUTES = {
  home: '/',
  series: '/series',
  works: '/works',
  projects: '/projects',  // legacy → redirects to /works
  blog: '/blog',
  about: '/about',
  demos: '/demos',        // legacy → redirects to /works
  rss: '/rss.xml',
} as const;

export type RouteKey = keyof typeof ROUTES;
