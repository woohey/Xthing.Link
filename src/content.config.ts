import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    featured: z.boolean().optional(),
    hero: z.string().optional(),
    canonical: z.string().url().optional(),
    readingTime: z.number().int().positive().optional(),
    summary: z.string().optional(),
    cover: z.string().optional(),
    platforms: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
        }),
      )
      .optional(),
    source: z.enum(['obsidian', 'site']).optional(),
    status: z.enum(['draft', 'published', 'syndicated']).optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['idea', 'wip', 'shipped']).optional(),
    demoSlug: z.string().optional(),
    order: z.number().optional(),
    tags: z.array(z.string()).default([]),
    stack: z.array(z.string()).optional(),
    repoUrl: z.string().url().optional(),
    demoUrl: z.string().url().optional(),
    startedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    featured: z.boolean().optional(),
    relatedPosts: z.array(reference('blog')).default([]),
  }),
});

export const collections = { blog, projects };
