/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PET_API_MODE?: 'mock' | 'live';
  /** Live API origin, no trailing slash (e.g. https://pet-api.xthing.link) */
  readonly PUBLIC_PET_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
