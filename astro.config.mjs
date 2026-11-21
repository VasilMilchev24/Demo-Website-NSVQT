// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Absolute site URL, used for canonical, Open Graph and sitemap URLs.
// Set SITE_URL in the Vercel project settings to the production domain.
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  output: 'static',
  // The original site uses directory URLs with a trailing slash (/uslugi/remont-na-banya/).
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Keep all CSS in files (no inline <style>) so the CSP can stay strict.
    inlineStylesheets: 'never',
  },
  integrations: [sitemap()],
  prefetch: false,
  devToolbar: { enabled: false },
});
