import { NextResponse } from 'next/server';
import { HISTORY, SCENARIOS, STATEMENTS, DEMOGRAPHICS } from '@/lib/content';
import { decodeAnswers, decodeHistory } from '@/lib/encode';
import { AXIS_IDS } from '@/lib/types';

export const runtime = 'nodejs';

function config() {
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_KEY ?? '').trim();
  return url && key ? { url, key } : null;
}

/** Says what kind of key was pasted, without ever showing it. */
function describeKey(key: string): string {
  if (key.startsWith('sb_secret_')) return 'secret key (correct)';
  if (key.startsWith('sb_publishable_')) return 'publishable key (WRONG: use the secret key)';
  if (key.startsWith('eyJ')) {
    try {
      const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role;
      if (role === 'service_role') return 'service_role key (correct)';
      if (role === 'anon') return 'anon key (WRONG: use service_role)';
      return `JWT key with role "${role}"`;
    } catch {
      return 'JWT key (could not read it)';
    }
  }
  return 'unrecognised key format';
}

function authHeaders(key: string): Record<string, string> {
  // New-style secret keys (sb_secret_...) are not JWTs and must only go in the apikey header.
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/**
 * Open /api/submit in a browser to check the server settings. No secrets are shown.
 * Open /api/submit?check=1 to also test the connection and the responses table (read-only, nothing is written).
 */
export async function GET(req: Request) {
  const c = config();
  const base = {
    configured: Boolean(c),
    urlLooksRight: c ? /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url) : null,
    key: c ? describeKey(c.key) : null,
  };
  if (!c || new URL(req.url).searchParams.get('check') !== '1') return NextResponse.json(base);
  try {
    const res = await fetch(`${c.url}/rest/v1/responses?select=id&limit=1`, { headers: authHeaders(c.key), cache: 'no-store' });
    const message = res.ok ? 'ok: the responses table can be read' : (await res.text()).slice(0, 200);
    return NextResponse.json({ ...base, tableCheck: { ok: res.ok, status: res.status, message } });
  } catch (err) {
    return NextResponse.json({ ...base, tableCheck: { ok: false, status: 0, message: `could not reach Supabase: ${(err as Error).message}` } });
  }
}

/**
 * Stores every finished quiz as an anonymous response.
 * No IP address, user agent, name, email or account is stored with it.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answers = decodeAnswers(body?.a);
  const history = decodeHistory(body?.h);
  if (!answers || !history) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });

  // Keep only known demographic fields with known option values.
  const demographics: Record<string, string> = {};
  for (const d of DEMOGRAPHICS) {
    const v = body?.demographics?.[d.id];
    if (typeof v === 'string' && d.options.includes(v)) demographics[d.id] = v;
  }

  const scores: Record<string, number> = {};
  for (const id of AXIS_IDS) {
    const v = body?.scores?.[id];
    if (typeof v === 'number' && v >= -100 && v <= 100) scores[id] = Math.round(v);
  }

  const c = config();
  if (!c) {
    console.error('submit: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in the server settings');
    return NextResponse.json({ error: 'Storage is not configured' }, { status: 501 });
  }

  const headers: Record<string, string> = { ...authHeaders(c.key), Prefer: 'return=minimal' };

  const res = await fetch(`${c.url}/rest/v1/responses`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers_code: body.a,
      history_code: body.h,
      demographics,
      scores,
      version: `${STATEMENTS.length}-${SCENARIOS.length}-${HISTORY.length}`,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error('submit: Supabase refused the insert', res.status, detail);
    return NextResponse.json({ error: 'Could not save', status: res.status }, { status: 502 });
  }
  return new NextResponse(null, { status: 204 });
}
