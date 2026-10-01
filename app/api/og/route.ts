import { ImageResponse } from 'next/og';
import { AXIS_IDS } from '@/lib/types';
import { SHORT_NAMES } from '@/lib/verdict';

export const runtime = 'edge';

function clean(v: string | null, max: number, fallback: string) {
  if (!v) return fallback;
  return v.replace(/[^\p{L}\p{N} '&\-.,!?]/gu, '').slice(0, max) || fallback;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const persona = clean(searchParams.get('n'), 40, 'Naija Axes');
  const family = clean(searchParams.get('f'), 40, 'Where do you stand?');
  const raw = (searchParams.get('s') ?? '').split(',').map((x) => Number(x));
  const scores = AXIS_IDS.map((_, i) => {
    const v = raw[i];
    return Number.isFinite(v) ? Math.max(-100, Math.min(100, v)) : 0;
  });

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f6f0', color: '#17201c' }}>
        <div style={{ display: 'flex', height: 26, background: '#ffc61a' }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', width: 25, height: 26, marginLeft: i === 0 ? 0 : 25, background: '#17201c' }} />
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1, padding: '36px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 560, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>Naija Axes</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, marginBottom: 12 }}>{family}</div>
              <div style={{ display: 'flex', fontSize: persona.length > 24 ? 62 : 76, fontWeight: 800, lineHeight: 1.02 }}>{persona}</div>
            </div>
            <div style={{ display: 'flex', fontSize: 26 }}>Where do you stand?</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingLeft: 40 }}>
            {AXIS_IDS.map((id, i) => {
              const s = scores[i];
              const w = Math.abs(s) * 1.6;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', height: 44 }}>
                  <div style={{ display: 'flex', width: 130, fontSize: 21 }}>{SHORT_NAMES[id]}</div>
                  <div style={{ display: 'flex', position: 'relative', width: 320, height: 20, background: '#e0e5da', borderRadius: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        top: 0,
                        height: 20,
                        width: w,
                        left: s >= 0 ? 160 : 160 - w,
                        background: '#0a7a43',
                        borderRadius: 10,
                      }}
                    />
                    <div style={{ display: 'flex', position: 'absolute', left: 159, top: -4, width: 3, height: 28, background: '#17201c' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
