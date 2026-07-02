function normalizeSeriesName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function slugifySegment(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function sortPostsByDate(posts) {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const aFeatured = a.data.featured === true ? 0 : 1;
    const bFeatured = b.data.featured === true ? 0 : 1;
    if (aFeatured !== bFeatured) return aFeatured - bFeatured;

    const ao = a.data.order ?? 1000;
    const bo = b.data.order ?? 1000;
    if (ao !== bo) return ao - bo;

    return a.data.title.localeCompare(b.data.title);
  });
}

export function collectSeriesSummaries(posts) {
  const grouped = new Map();

  for (const post of sortPostsByDate(posts)) {
    const seriesName = post.data.series?.trim();
    if (!seriesName) continue;

    const title = normalizeSeriesName(seriesName);
    const slug = slugifySegment(title);
    const existing = grouped.get(slug);

    if (existing) {
      existing.posts.push(post);
      existing.count += 1;
      continue;
    }

    grouped.set(slug, {
      slug,
      title,
      description: post.data.summary ?? post.data.description,
      latestPost: post,
      posts: [post],
      count: 1,
    });
  }

  return [...grouped.values()]
    .map((summary) => ({
      ...summary,
      posts: sortPostsByDate(summary.posts),
    }))
    .sort((a, b) => b.latestPost.data.pubDate.valueOf() - a.latestPost.data.pubDate.valueOf());
}

export function pickHomepageSections({ posts, projects }) {
  const publishedPosts = sortPostsByDate(posts.filter((post) => post.data.draft !== true));

  return {
    latestPosts: publishedPosts.slice(0, 3),
    series: collectSeriesSummaries(publishedPosts).slice(0, 3),
    featuredProjects: sortProjects(projects).slice(0, 3),
  };
}

export function findRelatedPostsForProject(project, posts) {
  const explicitIds = new Set(project.data.relatedPosts ?? []);
  const inferredSeriesSlug = slugifySegment(project.id);

  return sortPostsByDate(
    posts.filter((post) => {
      if (explicitIds.has(post.id)) return true;
      if (!post.data.series) return false;
      return slugifySegment(post.data.series) === inferredSeriesSlug;
    }),
  );
}

export function findRelatedProjectsForPost(post, projects) {
  const inferredSeriesSlug = post.data.series ? slugifySegment(post.data.series) : null;

  return sortProjects(
    projects.filter((project) => {
      if ((project.data.relatedPosts ?? []).includes(post.id)) return true;
      if (!inferredSeriesSlug) return false;
      return project.id === inferredSeriesSlug || project.data.demoSlug === inferredSeriesSlug;
    }),
  );
}

export function describePublishingMeta(post) {
  const sourceMap = {
    obsidian: 'Obsidian draft flow',
    site: 'Site-native draft',
  };

  const statusMap = {
    draft: 'Draft',
    published: 'Published',
    syndicated: 'Syndicated',
  };

  return {
    sourceLabel: post.data.source ? sourceMap[post.data.source] ?? post.data.source : null,
    statusLabel: post.data.status ? statusMap[post.data.status] ?? post.data.status : null,
    canonical: post.data.canonical ?? null,
    platforms: post.data.platforms ?? [],
  };
}

export function getTocItems(headings = []) {
  return headings
    .filter((heading) => heading.depth === 2 || heading.depth === 3)
    .map((heading) => ({
      depth: heading.depth,
      slug: heading.slug,
      text: heading.text,
    }));
}
