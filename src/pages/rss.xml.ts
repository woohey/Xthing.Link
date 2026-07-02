import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ROUTES } from '../lib/routes';
import { SITE } from '../lib/site';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('blog', ({ data }) => data.draft !== true)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const items =
    posts.length > 0
      ? posts.map((post) => ({
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.pubDate,
          link: `${ROUTES.blog}/${post.id}/`,
        }))
      : [
          {
            title: SITE.name,
            description: SITE.description,
            pubDate: new Date(),
            link: ROUTES.home,
          },
        ];

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
  });
};
