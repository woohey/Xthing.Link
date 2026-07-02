import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  collectSeriesSummaries,
  describePublishingMeta,
  findRelatedPostsForProject,
  findRelatedProjectsForPost,
  getTocItems,
  pickHomepageSections,
} from '../src/lib/content-hub.js';
import { SITE } from '../src/lib/site.ts';
import { ROUTES } from '../src/lib/routes.ts';

const blogPosts = [
  {
    id: 'pet-necklace-01',
    data: {
      title: 'Pet Necklace 01',
      description: 'Intro to the project.',
      pubDate: new Date('2026-03-20'),
      draft: false,
      tags: ['iot', 'hardware'],
      series: 'Pet Necklace',
      featured: true,
    },
  },
  {
    id: 'pet-necklace-02',
    data: {
      title: 'Pet Necklace 02',
      description: 'Data pipeline notes.',
      pubDate: new Date('2026-03-24'),
      draft: false,
      tags: ['iot', 'viz'],
      series: 'Pet Necklace',
    },
  },
  {
    id: 'obsidian-workflow',
    data: {
      title: 'Obsidian Workflow',
      description: 'How I publish from Obsidian.',
      pubDate: new Date('2026-03-28'),
      draft: false,
      tags: ['writing', 'obsidian'],
      source: 'obsidian',
      status: 'syndicated',
      platforms: [
        { name: 'Zhihu', url: 'https://example.com/zhihu' },
        { name: 'Toutiao', url: 'https://example.com/toutiao' },
      ],
    },
  },
  {
    id: 'sensor-visuals-01',
    data: {
      title: 'Sensor Visuals 01',
      description: 'Charting sensor data.',
      pubDate: new Date('2026-03-26'),
      draft: false,
      tags: ['viz'],
      series: 'Sensor Visuals',
    },
  },
];

const projects = [
  {
    id: 'pet-necklace',
    data: {
      title: '宠物项圈控制台',
      description: 'Interactive visualization demo.',
      status: 'wip',
      featured: true,
      order: 10,
      demoSlug: 'pet-necklace',
    },
  },
  {
    id: 'tiny-tooling',
    data: {
      title: 'Tiny Tooling',
      description: 'Small productivity scripts.',
      status: 'idea',
      order: 20,
    },
  },
];

test('collectSeriesSummaries groups only posts with a series and sorts by freshness', () => {
  const summaries = collectSeriesSummaries(blogPosts);

  assert.equal(summaries.length, 2);
  assert.deepEqual(
    summaries.map((summary) => ({
      slug: summary.slug,
      count: summary.count,
      latestPostTitle: summary.latestPost.data.title,
    })),
    [
      {
        slug: 'sensor-visuals',
        count: 1,
        latestPostTitle: 'Sensor Visuals 01',
      },
      {
        slug: 'pet-necklace',
        count: 2,
        latestPostTitle: 'Pet Necklace 02',
      },
    ],
  );
});

test('pickHomepageSections prioritizes latest writing, caps series, and chooses featured project', () => {
  const homepage = pickHomepageSections({
    posts: blogPosts,
    projects,
  });

  assert.deepEqual(
    homepage.latestPosts.map((post) => post.data.title),
    ['Obsidian Workflow', 'Sensor Visuals 01', 'Pet Necklace 02'],
  );
  assert.equal(homepage.series.length, 2);
  assert.equal(homepage.featuredProject?.data.title, '宠物项圈控制台');
});

test('related content helpers connect projects and posts by explicit metadata', () => {
  const relatedPosts = findRelatedPostsForProject(projects[0], blogPosts);
  const relatedProjects = findRelatedProjectsForPost(blogPosts[0], projects);

  assert.deepEqual(
    relatedPosts.map((post) => post.id),
    ['pet-necklace-02', 'pet-necklace-01'],
  );
  assert.deepEqual(
    relatedProjects.map((project) => project.id),
    ['pet-necklace'],
  );
});

test('describePublishingMeta returns stable labels for source, status, and external platforms', () => {
  const meta = describePublishingMeta(blogPosts[2]);

  assert.equal(meta.sourceLabel, 'Obsidian draft flow');
  assert.equal(meta.statusLabel, 'Syndicated');
  assert.deepEqual(
    meta.platforms.map((item) => item.name),
    ['Zhihu', 'Toutiao'],
  );
});

test('canonical single-language routes point writing back to /blog', () => {
  assert.equal(ROUTES.home, '/');
  assert.equal(ROUTES.blog, '/blog');
  assert.equal(ROUTES.series, '/series');
  assert.equal(ROUTES.projects, '/projects');
});

test('writing index keeps directory headers as explicit label blocks', () => {
  const source = readFileSync(new URL('../src/pages/blog/index.astro', import.meta.url), 'utf8');

  assert.match(source, /writing-directory__head-label/);
});

test('article body images are constrained to the content width', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  assert.match(css, /\.article-body img/);
  assert.match(css, /max-width:\s*100%/);
});

test('slugifySegment keeps non-latin series names routable', async () => {
  const { slugifySegment } = await import('../src/lib/content-hub.js');

  assert.equal(slugifySegment('把心情说给风'), '把心情说给风');
  assert.equal(slugifySegment('AI 实战'), 'ai-实战');
});

test('getTocItems keeps only h2 and h3 headings for article toc', () => {
  const toc = getTocItems([
    { depth: 1, slug: 'intro', text: 'Intro' },
    { depth: 2, slug: 'why', text: 'Why this matters' },
    { depth: 3, slug: 'tradeoffs', text: 'Tradeoffs' },
    { depth: 4, slug: 'footnote', text: 'Footnote' },
  ]);

  assert.deepEqual(toc, [
    { depth: 2, slug: 'why', text: 'Why this matters' },
    { depth: 3, slug: 'tradeoffs', text: 'Tradeoffs' },
  ]);
});

test('site metadata matches the updated brand casing and footer copy', () => {
  const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const articlePage = readFileSync(new URL('../src/pages/blog/[id].astro', import.meta.url), 'utf8');

  assert.equal(SITE.name, 'xThing.Link');
  assert.match(layout, /<p class="site-footer__title">xThing\.Link <span class="site-footer__year">© 2026<\/span><\/p>/);
  assert.match(layout, /A quieter home for writing, projects, and long-running experiments\./);
  assert.match(articlePage, /article-toc-drawer/);
});
