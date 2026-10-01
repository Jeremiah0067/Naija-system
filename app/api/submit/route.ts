import { NextResponse } from 'next/server';
import { HISTORY, SCENARIOS, STATEMENTS, DEMOGRAPHICS } from '@/lib/content';
import { decodeAnswers, decodeHistory } from '@/lib/encode';
import { AXIS_IDS } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Stores an anonymous response ONLY when the person ticked the consent box.
 * No IP address, user agent, name, email or account is stored.
 * If SUPABASE_URL and SUPABASE_SERVICE_KEY are not set, this is a no-op (204).
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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return new NextResponse(null, { status: 204 });

  const res = await fetch(`${url}/rest/v1/responses`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      answers_code: body.a,
      history_code: body.h,
      demographics,
      scores,
      version: `${STATEMENTS.length}-${SCENARIOS.length}-${HISTORY.length}`,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: 'Could not save' }, { status: 502 });
  return new NextResponse(null, { status: 204 });
}
