import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

import { business } from '~/config/business';
import { HONEYPOT, validateBooking, type BookingData } from '~/lib/booking';
import { localePath, getLang } from '~/i18n';
import en from '~/i18n/en.json';

// FORM_MODE=api: rendered on demand. In 'netlify' / 'php' mode astro.config.ts
// switches this route to prerendered and it only emits a stub.
export const prerender = false;

// --- Simple in-memory rate limit: 5 requests per IP per 10 minutes. ---------
// Good enough for a single Node process; resets on restart.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, list] of hits) if (list.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
  return recent.length > LIMIT;
}

const env = (key: string) => (import.meta.env[key] as string | undefined) ?? process.env[key];

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;
function getTransporter() {
  if (!transporter) {
    const port = Number(env('SMTP_PORT') || 587);
    transporter = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port,
      secure: env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465,
      auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
    });
  }
  return transporter;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  let lang = getLang(undefined);

  const reply = (status: number, body: Record<string, unknown>, anchor: string) =>
    wantsJson
      ? new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
      : // No-JS fallback: back to the page, the #anchor shows a CSS :target message.
        new Response(null, { status: 303, headers: { Location: `${localePath(lang)}#${anchor}` } });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: 'bad_request' }, 'booking-error');
  }

  lang = getLang(String(form.get('lang') || ''));

  // Honeypot filled → pretend success, send nothing.
  if (String(form.get(HONEYPOT) || '').trim()) return reply(200, { ok: true }, 'booking-sent');

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'rate_limited' }, 'booking-error');

  const str = (k: string) => String(form.get(k) ?? '').trim();
  const data: BookingData = {
    name: str('name').slice(0, 120),
    phone: str('phone').slice(0, 40),
    email: str('email').slice(0, 200),
    zip: str('zip').slice(0, 10),
    service: str('service'),
    date: str('date'),
    time: str('time'),
    description: str('description').slice(0, 2000),
    lang,
  };
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

  const errors = validateBooking(data, files);
  if (Object.keys(errors).length) return reply(422, { ok: false, errors }, 'booking-error');

  const to = env('MAIL_TO');
  if (!env('SMTP_HOST') || !to) {
    console.error('[booking] SMTP_HOST / MAIL_TO not configured');
    return reply(500, { ok: false, error: 'not_configured' }, 'booking-error');
  }

  // Email is written in English for the business owner, whatever the site language.
  const f = en.form;
  const rows: [string, string][] = [
    [f.name, data.name],
    [f.phone, data.phone],
    [f.email, data.email || '—'],
    [f.zip, data.zip],
    [f.service, f.serviceOptions[data.service as keyof typeof f.serviceOptions] ?? data.service],
    [f.date, data.date || '—'],
    [f.time, data.time ? f.timeOptions[data.time as keyof typeof f.timeOptions] : '—'],
    ['Site language', lang.toUpperCase()],
    [f.description, data.description || '—'],
  ];

  try {
    await getTransporter().sendMail({
      from: env('MAIL_FROM') || `"${business.name} website" <${env('SMTP_USER')}>`,
      to,
      replyTo: data.email || undefined,
      subject: `New pickup request: ${data.name}, ${data.zip}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">${rows
        .map(
          ([k, v]) =>
            `<tr><th align="left" style="border-bottom:1px solid #ddd">${escapeHtml(k)}</th><td style="border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
        )
        .join('')}</table>`,
      attachments: await Promise.all(
        files.map(async (file) => ({
          filename: file.name.replace(/[^\w.\- ]/g, '_').slice(0, 100) || 'photo.jpg',
          content: Buffer.from(await file.arrayBuffer()),
          contentType: file.type,
        }))
      ),
    });
  } catch (err) {
    console.error('[booking] send failed', err);
    return reply(502, { ok: false, error: 'send_failed' }, 'booking-error');
  }

  return reply(200, { ok: true }, 'booking-sent');
};
