/**
 * Public site metadata used by layouts, RSS, and discovery tags.
 *
 * Keep `url` aligned with `site` in `astro.config.mjs`.
 */
export const SITE = {
  name: 'xthing.link',
  description:
    'X 是未知，物是万物。链接，是我们选择的方式。Things worth linking.',
  url: 'https://xthing.link',
} as const;
