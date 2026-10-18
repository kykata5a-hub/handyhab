// Server-only helpers for the /est admin page: login, booking requests from
// Netlify Forms, and the status/price/note the admin keeps for each request.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AstroCookies } from 'astro';

export const STATUSES = ['new', 'quoted', 'scheduled', 'done', 'cancelled'] as const;
export type Status = (typeof STATUSES)[number];

export interface Photo {
  url: string;
  name: string;
}

export interface Submission {
  id: string;
  number?: number;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  zip: string;
  service: string;
  date: string;
  time: string;
  description: string;
  lang: string;
  photos: Photo[];
}

export interface Meta {
  status: Status;
  price: string;
  note: string;
  updatedAt?: string;
}

export const emptyMeta: Meta = { status: 'new', price: '', note: '' };

const env = (key: string): string | undefined => (import.meta.env[key] as string | undefined) || process.env[key];

// --- Auth ---------------------------------------------------------------------
// One shared password (ADMIN_PASSWORD env var). The session cookie holds an
// expiry time signed with a key derived from that password, so changing the
// password logs everyone out.

const COOKIE = 'est_session';
const SESSION_DAYS = 30;

const adminPassword = () => env('ADMIN_PASSWORD') ?? '';
export const authConfigured = () => adminPassword().length >= 8;

const signingKey = () => createHash('sha256').update(`est-session:${adminPassword()}`).digest();
const sign = (value: string) => createHmac('sha256', signingKey()).update(value).digest('base64url');

const safeEqual = (a: string, b: string) => {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
};

export function checkPassword(input: string): boolean {
  return authConfigured() && safeEqual(input, adminPassword());
}

export function isAuthed(cookies: AstroCookies): boolean {
  if (!authConfigured()) return false;
  const raw = cookies.get(COOKIE)?.value ?? '';
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export function startSession(cookies: AstroCookies, secure: boolean) {
  const exp = String(Date.now() + SESSION_DAYS * 864e5);
  cookies.set(COOKIE, `${exp}.${sign(exp)}`, {
    path: '/est',
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 86400,
  });
}

export function endSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/est' });
}

// Slow down password guessing (per function instance; good enough for one admin).
const failures = new Map<string, { count: number; until: number }>();
export function loginBlocked(ip: string): boolean {
  const f = failures.get(ip);
  return !!f && f.count >= 5 && f.until > Date.now();
}
export function recordLoginFailure(ip: string) {
  const f = failures.get(ip);
  const count = f && f.until > Date.now() ? f.count + 1 : 1;
  failures.set(ip, { count, until: Date.now() + 15 * 60 * 1000 });
}

// --- Booking requests (Netlify Forms API) --------------------------------------

const API = 'https://api.netlify.com/api/v1';
const FORM_NAME = 'booking';

type NetlifyFile = { url?: string; filename?: string };
type NetlifySubmission = {
  id: string;
  number?: number;
  created_at: string;
  data: Record<string, unknown>;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function photosFrom(data: Record<string, unknown>): Photo[] {
  // The form sends photos as "photos", "photo2", "photo3" (one file per field).
  const raw = ['photos', 'photo2', 'photo3'].flatMap((k) => {
    const v = data[k];
    return Array.isArray(v) ? v : v ? [v] : [];
  }) as NetlifyFile[];
  return raw
    .filter((f) => f && typeof f === 'object' && f.url)
    .map((f, i) => ({ url: f.url!, name: f.filename || `photo-${i + 1}` }));
}

function fromNetlify(s: NetlifySubmission): Submission {
  const d = s.data ?? {};
  return {
    id: s.id,
    number: s.number,
    createdAt: s.created_at,
    name: str(d.name),
    phone: str(d.phone),
    email: str(d.email),
    zip: str(d.zip),
    service: str(d.service),
    date: str(d.date),
    time: str(d.time),
    description: str(d.description),
    lang: str(d.lang) || 'en',
    photos: photosFrom(d),
  };
}

export class SetupError extends Error {}

export async function fetchSubmissions(siteId: string | undefined): Promise<Submission[]> {
  const token = env('NETLIFY_API_TOKEN');
  if (!token) throw new SetupError('NETLIFY_API_TOKEN is not set');
  if (!siteId) throw new SetupError('Netlify site id is unknown');
  const get = async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Netlify API ${res.status} for ${url.replace(API, '')}`);
    return res.json() as Promise<T>;
  };
  const forms = await get<{ id: string; name: string }[]>(`${API}/sites/${siteId}/forms`);
  const form = forms.find((f) => f.name === FORM_NAME);
  if (!form) return [];
  const all: NetlifySubmission[] = [];
  // Newest first; 3 pages × 100 is plenty for this admin.
  for (let page = 1; page <= 3; page++) {
    const batch = await get<NetlifySubmission[]>(`${API}/forms/${form.id}/submissions?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.map(fromNetlify);
}

// --- Admin data: status / price / note per request ------------------------------
// Netlify Blobs on Netlify; a local JSON file in `npm run dev`.

type MetaMap = Record<string, Meta>;
const BLOB_STORE = 'est';
const BLOB_KEY = 'meta';
const LOCAL_FILE = path.join(process.cwd(), '.data', 'est-meta.json');

export async function loadMeta(onNetlify: boolean): Promise<MetaMap> {
  if (onNetlify) {
    const { getStore } = await import('@netlify/blobs');
    return ((await getStore(BLOB_STORE).get(BLOB_KEY, { type: 'json' })) as MetaMap | null) ?? {};
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8')) as MetaMap;
  } catch {
    return {};
  }
}

export async function saveMeta(onNetlify: boolean, id: string, meta: Meta): Promise<void> {
  const all = await loadMeta(onNetlify);
  all[id] = { ...meta, updatedAt: new Date().toISOString() };
  if (onNetlify) {
    const { getStore } = await import('@netlify/blobs');
    await getStore(BLOB_STORE).setJSON(BLOB_KEY, all);
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(all, null, 2));
}

export function parseMeta(input: unknown): Meta | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const status = STATUSES.includes(o.status as Status) ? (o.status as Status) : null;
  const price = str(o.price)
    .replace(/[^\d.,]/g, '')
    .slice(0, 12);
  const note = str(o.note).slice(0, 2000);
  return status ? { status, price, note } : null;
}

// Layout preview for `npm run dev` without a Netlify token; never used in production.
export const sampleSubmissions: Submission[] = [
  {
    id: 'sample-1',
    number: 3,
    createdAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
    name: 'SAMPLE — Test Customer',
    phone: '(213) 555-0101',
    email: 'test.customer@example.com',
    zip: '91601',
    service: 'garage',
    date: '',
    time: 'morning',
    description: 'SAMPLE request. Old couch, two mattresses and about 10 boxes in the garage.',
    lang: 'en',
    photos: [],
  },
  {
    id: 'sample-2',
    number: 2,
    createdAt: new Date(Date.now() - 26 * 3600e3).toISOString(),
    name: 'SAMPLE — Cliente de prueba',
    phone: '(323) 555-0102',
    email: '',
    zip: '90026',
    service: 'furniture',
    date: '2026-10-22',
    time: 'afternoon',
    description: 'SAMPLE. Refrigerador viejo y una lavadora.',
    lang: 'es',
    photos: [],
  },
  {
    id: 'sample-3',
    number: 1,
    createdAt: new Date(Date.now() - 4 * 86400e3).toISOString(),
    name: 'SAMPLE — Тестовый клиент',
    phone: '(818) 555-0103',
    email: 'test.ru@example.com',
    zip: '91403',
    service: 'estate',
    date: '2026-10-20',
    time: 'evening',
    description: 'SAMPLE. Освободить квартиру после переезда.',
    lang: 'ru',
    photos: [],
  },
];
