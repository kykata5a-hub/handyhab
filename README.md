# Handy Hab — website

Astro 7 + Tailwind 4. One landing page + privacy page in EN (`/`), ES (`/es/`), RU (`/ru/`).

## Commands
```
npm install
npm run dev        # http://localhost:4321
npm run build      # output in dist/
npm run preview
```

## Where things live
| What | File |
|---|---|
| Company data (name, phone, WhatsApp, email, hours, license, areas, socials) | `src/config/business.ts` |
| All texts | `src/i18n/en.json`, `es.json`, `ru.json` |
| Before/after photos | `src/assets/before-after/NN-before.jpg` + `NN-after.jpg` (placeholders now — just replace/add pairs) |
| Colors / fonts | `src/assets/styles/tailwind.css`, `astro.config.ts` (`fonts`) |
| OG image, touch icon | `public/og-image.jpg`, `public/apple-touch-icon.png` |

## Booking form — `FORM_MODE` (see `.env.example`)
- `api` (default): `src/pages/api/booking.ts` sends the request by SMTP (nodemailer). Needs `SMTP_*`, `MAIL_TO` in `.env`.
  Uses `@astrojs/node` (standalone) as a placeholder adapter → output in `dist/client` + `dist/server`, run `node dist/server/entry.mjs`.
  Swap the adapter in `astro.config.ts` once hosting is chosen.
- `netlify`: Netlify Forms, fully static `dist/`. Note: Netlify keeps only one file per file field.
- `php`: fully static `dist/` + `booking.php`. Edit `MAIL_TO` / `MAIL_FROM` at the top of `public/booking.php`.

Set `SITE_URL` to the real domain before the production build (canonical, hreflang, sitemap, OG).
