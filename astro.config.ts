import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';
import type { AstroIntegration } from 'astro';

import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import compress from 'astro-compress';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// Booking form submit mode: 'api' (own endpoint + SMTP), 'netlify' (Netlify Forms) or 'php' (public/booking.php).
const FORM_MODE = (env.FORM_MODE || 'api') as 'api' | 'netlify' | 'php';
// Netlify sets URL to the site's primary address (custom domain once added).
const SITE_URL = env.SITE_URL || env.URL || 'https://example.com';

// Hosts allowed to arrive via a reverse proxy (X-Forwarded-Host/Proto), e.g. a
// preview tunnel. Needed so the booking endpoint's same-origin check passes there.
const TRUSTED_HOSTS = [new URL(SITE_URL).hostname, ...(env.TRUSTED_HOSTS || '').split(',')]
  .map((h) => h.trim())
  .filter(Boolean);

// In 'netlify' / 'php' mode the site is 100 % static: the SMTP endpoint is not
// needed, so it is excluded from the build instead of requiring an adapter.
// The /est admin reads requests from Netlify Forms, so it only exists in 'netlify' mode.
const bookingEndpointToggle = (): AstroIntegration => {
  let building = false;
  return {
    name: 'booking-endpoint-toggle',
    hooks: {
      'astro:config:setup': ({ command }) => {
        building = command === 'build';
      },
      'astro:route:setup': ({ route }) => {
        if (FORM_MODE !== 'api' && route.component.endsWith('src/pages/api/booking.ts')) {
          route.prerender = true;
        }
        if (building && FORM_MODE !== 'netlify' && route.component.startsWith('src/pages/est/')) {
          route.prerender = true;
        }
      },
      // booking.php is only useful on PHP hosting; elsewhere it would be served as plain text.
      'astro:build:done': ({ dir }) => {
        if (FORM_MODE !== 'php') fs.rmSync(new URL('booking.php', dir), { force: true });
        // The prerendered stub of the API route is useless on a static host.
        if (FORM_MODE !== 'api') fs.rmSync(new URL('api', dir), { recursive: true, force: true });
        if (FORM_MODE !== 'netlify') fs.rmSync(new URL('est', dir), { recursive: true, force: true });
      },
    },
  };
};

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'ignore',

  security: {
    allowedDomains: TRUSTED_HOSTS.map((hostname) => ({ hostname, protocol: 'https' })),
  },

  // On-demand routes: the booking endpoint ('api' mode, Node standalone) and the
  // /est admin ('netlify' mode, Netlify Functions). Everything else is static.
  adapter:
    FORM_MODE === 'api'
      ? node({ mode: 'standalone' })
      : FORM_MODE === 'netlify'
        ? netlify({ imageCDN: false }) /* images stay build-time optimized; the image CDN costs credits */
        : undefined,

  i18n: {
    locales: ['en', 'es', 'ru'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Oswald',
      cssVariable: '--font-oswald',
      weights: ['500', '700'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['Arial Narrow', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Golos Text',
      cssVariable: '--font-golos',
      weights: ['400', '600'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['sans-serif'],
    },
  ],

  integrations: [
    bookingEndpointToggle(),
    sitemap({
      filter: (page) => !page.includes('/api/'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', es: 'es-MX', ru: 'ru' },
      },
    }),
    icon({
      include: {
        tabler: [
          'sofa',
          'home-2',
          'building-warehouse',
          'shovel',
          'packages',
          'building-skyscraper',
          'phone',
          'brand-whatsapp',
          'brand-google',
          'brand-facebook',
          'star-filled',
          'sun',
          'moon',
          'menu-2',
          'x',
          'map-pin',
          'clock',
          'mail',
          'arrows-horizontal',
          'upload',
          'circle-check',
          'alert-triangle',
          'truck-delivery',
          'receipt',
          'barbell',
        ],
      },
    }),
    compress({
      CSS: { csso: false, lightningcss: { minify: true } },
      HTML: { 'html-minifier-terser': { removeAttributeQuotes: false } },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.FORM_MODE': JSON.stringify(FORM_MODE),
    },
    resolve: {
      alias: { '~': path.resolve(__dirname, './src') },
    },
  },
});
