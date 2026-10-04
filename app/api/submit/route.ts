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

/** Open /api/submit in a browser to check the server settings. No secrets are shown. */
export async function GET() {
  const c = config();
  return NextResponse.json({
    configured: Boolean(c),
    urlLooksRight: c ? /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url) : null,
    key: c ? describeKey(c.key) : null,
  });
}

/**
 * Stores an anonymous response ONLY when the person ticked the consent box.
 * No IP address, user agent, name, email or account is stored.
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

  // New-style secret keys (sb_secret_...) are not JWTs and must only go in the apikey header.
  const headers: Record<string, string> = {
    apikey: c.key,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
  if (c.key.startsWith('eyJ')) headers.Authorization = `Bearer ${c.key}`;

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
