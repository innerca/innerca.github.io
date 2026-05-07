import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://innerca.github.io',
  integrations: [
    react(),
    tailwind(),
  ],
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
    fallback: {
      en: 'zh',
    },
  },
});
