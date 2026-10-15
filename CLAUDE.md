# Junk Removal LA — client site

Business-card / lead-gen site for a junk removal company in Los Angeles.
Built on **AstroWind** (Astro + Tailwind). Single main page + legal pages.
Goal of every page: get the visitor to call, WhatsApp, or send the booking form.

## Skills
- Use the `frontend-design` skill for all visual work. Use `ui-ux-pro-max` for UX checks.
- Commit to one direction: bold, industrial, trustworthy. Big trucks-and-muscle energy, not "startup SaaS".

## Brand & style
- Palette: black + orange. Suggested tokens: near-black `#0E0E0F`, charcoal `#1A1A1C`, orange `#FF7A00`, off-white `#F5F3F0`. Adjust if contrast fails.
- **Do not imitate any existing brand's logo, wordmark or layout.** Logo is an original text wordmark with an orange accent (placeholder until the client sends a real one).
- Light AND dark theme with a toggle; respect `prefers-color-scheme` by default. Orange must pass WCAG AA on both.
- Typography: a heavy condensed display face for headings (e.g. Bebas Neue / Oswald / Anton from Google Fonts), clean sans for body. Must support Cyrillic → check the font has `cyrillic` subset, otherwise use a fallback for RU.
- Mobile first. Most visitors come from phones.

## Config
All business data lives in ONE file `src/config/business.ts` (placeholders until client provides):
company name, phone, WhatsApp number, email, service area, hours, license/insurance line, social links.
- Phone: `(213) 264-8266` → `tel:+12132648266`
- WhatsApp: same number for now → `https://wa.me/12132648266` (confirm with client)
Never hardcode these in components.

## Languages (i18n)
- `en` (default), `es` (Mexican Spanish, `es-MX` tone: "usted", local wording), `ru`.
- Use Astro's built-in i18n routing: `/`, `/es/`, `/ru/`.
- **Auto-detect:** on first visit read `navigator.languages`; if es* → `/es/`, ru*/uk* → `/ru/`, else stay on EN. Store the choice in localStorage; a manual switcher in the header always overrides. No redirect loops, no detection for bots.
- All strings in `src/i18n/{en,es,ru}.json`. No text hardcoded in components.
- Set `hreflang` and `<html lang>` correctly per page.

## Page sections (in order)
1. **Header:** logo, nav anchors, language switcher, theme toggle, phone button (sticky on mobile).
2. **Hero:** "Junk Removal in Los Angeles" + Same-Day & Next-Day service, CTA "Get Free Estimate" + "WhatsApp Us".
3. **Trust bar:** Same-Day & Next-Day / Upfront Pricing / Full Service (from client text below).
4. **Services:** 6 cards, icons as SVG (NO emoji):
   - Furniture & Appliance Removal (couches, mattresses, fridges, washers)
   - Garage, Basement & Attic Cleanouts
   - Estate & Whole House Cleanouts
   - Yard Waste & Construction Debris Removal
   - Storage Unit Cleanouts
   - Commercial & Office Junk Hauling
5. **Before / After gallery:** draggable comparison slider (keyboard accessible), images from `src/assets/before-after/` as pairs `NN-before.jpg` / `NN-after.jpg`. Use Astro `<Image>` for optimization. Placeholders until real photos arrive.
6. **How it works:** 3 real steps (Book → We haul → Clean space).
7. **Service area:** list of LA areas (placeholder list, client to confirm).
8. **FAQ:** pricing, what we take / don't take (hazardous), timing, recycling/donation.
9. **Booking form** (see below).
10. **Footer:** contacts, hours, legal links.

Client's original selling points (keep meaning, polish wording):
- Same-Day & Next-Day Service — fast dispatch all across Los Angeles.
- Upfront Pricing — free estimate before we start. No hidden fees.
- Full Service — we do 100% of the loading, heavy lifting, and sweeping up.

## Functionality
- **WhatsApp:** floating button bottom-right on all pages, `https://wa.me/<number>?text=<prefilled message in current language>`.
- **Booking / contact form:** name, phone, email (optional), ZIP code, service type (select), preferred date + time window (morning/afternoon/evening), description, optional photo upload of the junk.
  - **No third-party form services** (no Formspree, Web3Forms etc.). Own handling or the host's built-in forms only.
  - Hosting is not decided → build one `BookingForm` component with a switchable submit mode via env `FORM_MODE`:
    - `api` (default): own Astro server endpoint `src/pages/api/booking.ts` (`prerender = false`), validates server-side and sends the request by email via SMTP (nodemailer, credentials in `.env`). Rest of the site stays static (hybrid output); adapter is added once hosting is chosen.
    - `netlify`: Netlify Forms (`data-netlify="true"`, hidden `form-name` field), no server code.
    - `php`: `public/booking.php` for classic shared hosting (PHP `mail()`/SMTP), for hosts without Node.
  - Same field names in all modes so switching is one env change.
  - Client- and server-side validation, honeypot spam field, simple rate limit in `api` mode, success/error states translated.
  - Photo upload: max 3 images, 5 MB each, attached to the email.
- Click-to-call `tel:` links everywhere a phone number appears.

## Remove from AstroWind
Blog, demo pages (`/homes/*`, `/landing/*`, pricing demos), RSS, unused widgets, demo images. Keep the build lean.

## SEO
- LocalBusiness JSON-LD (type `MovingCompany` or `HomeAndConstructionBusiness`), per-language meta title/description, OG image, sitemap with hreflang.
- Lighthouse 95+ on mobile. No layout shift from fonts/images.

## Legal
Privacy Policy page (form collects personal data). Placeholder text, client to approve.

## Open questions (ask client)
Company name, logo, phone/WhatsApp, service area list, real before/after photos, hosting, domain.
