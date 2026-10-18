import type { APIRoute } from 'astro';

import { isAuthed, parseMeta, saveMeta } from '~/lib/est';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  if (!isAuthed(cookies)) return json(401, { error: 'unauthorized' });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json(400, { error: 'bad json' });
  }
  const id = typeof (input as { id?: unknown })?.id === 'string' ? (input as { id: string }).id : '';
  const meta = parseMeta(input);
  if (!/^[\w-]{1,64}$/.test(id) || !meta) return json(400, { error: 'bad input' });
  const onNetlify = !!(locals as { netlify?: { context?: unknown } }).netlify?.context;
  await saveMeta(onNetlify, id, meta);
  return json(200, { ok: true });
};
