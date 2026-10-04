import { ImageResponse } from 'next/og';
import { buildResult } from '@/lib/result';
import { buildCardData, gradientFor, initials } from '@/lib/cardData';
import { AxisIcon } from '@/lib/icons';
import { resolvePortrait } from '@/lib/portraits';

export const runtime = 'edge';

const W = 1080;
const H = 1920;

const FONT_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-';
const FONT_FILES: [number, string][] = [
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
  [800, 'ExtraBold'],
];

// Fetched once per runtime instance. If the fetch fails the card still renders in the default font.
let fontsPromise: Promise<any[]> | null = null;
function loadFonts(): Promise<any[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async ([weight, file]) => {
        const res = await fetch(`${FONT_BASE}${file}.ttf`);
        if (!res.ok) throw new Error(`font ${file} ${res.status}`);
        return { name: 'Poppins', data: await res.arrayBuffer(), weight, style: 'normal' as const };
      }),
    ).catch(() => {
      fontsPromise = null;
      return [];
    });
  }
  return fontsPromise;
}

// Wikimedia asks API clients to identify themselves. Set CONTACT_EMAIL in Vercel to a real address.
const UA = `NaijaAxes/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://naija-axes.vercel.app'}; ${
  process.env.CONTACT_EMAIL ?? 'contact-not-set'
})`;

type Photo = { src: string; credit: string };

// Finds a freely licensed portrait, downloads it and inlines it. Any failure returns null,
// and the card falls back to the person's initials.
async function loadPhoto(id: string, name: string, origin: string, width: number): Promise<Photo | null> {
  try {
    const found = await resolvePortrait(id, name, width, UA);
    if (!found) return null;
    const target = new URL(found.imageUrl, origin).toString();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(target, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      next: { revalidate: 86400 },
    } as RequestInit);
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (type !== 'image/jpeg' && type !== 'image/png') return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 2_500_000) return null;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { src: `data:${type};base64,${btoa(bin)}`, credit: found.credit };
  } catch {
    return null;
  }
}

function titleSize(name: string) {
  const n = name.length;
  if (n <= 16) return 118;
  if (n <= 24) return 96;
  return 80;
}

const panel = {
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'rgba(255,255,255,0.09)',
  borderRadius: 36,
};

const kicker = {
  display: 'flex',
  fontSize: 27,
  fontWeight: 700,
  letterSpacing: 5,
  color: 'rgba(255,255,255,0.78)',
  textTransform: 'uppercase' as const,
};

function Avatar({ id, label, size, photo }: { id: string; label: string; size: number; photo?: Photo | null }) {
  const [c1, c2] = gradientFor(id);
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.src}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.7)' }}
      />
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        background: `linear-gradient(150deg, ${c1}, ${c2})`,
        border: '3px solid rgba(255,255,255,0.55)',
        color: '#fff',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
      }}
    >
      {initials(label)}
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = buildResult(params);
  if (!result) return new Response('Invalid result code', { status: 400 });

  const d = buildCardData(result);
  const host = url.host.toUpperCase();
  const fonts = await loadFonts();
  const topGrad = d.top ? gradientFor(d.top.id) : gradientFor(d.familyLabel);
  const topLabel = d.top ? d.top.name : d.familyLabel;
  // Second line of the heading: the strongest lean, so two people with the same type still look different.
  const strongest = [...d.rows].sort((a, b) => b.pct - a.pct)[0];
  const kickerText = strongest.pct >= 60 ? `${d.familyLabel} · ${strongest.label}` : d.familyLabel;
  const [topPhoto, ...otherPhotos] = await Promise.all([
    d.top ? loadPhoto(d.top.id, d.top.name, url.origin, 700) : Promise.resolve(null),
    ...d.others.map((o) => loadPhoto(o.id, o.name, url.origin, 160)),
  ]);

  const image = new ImageResponse(
    (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: W,
            height: H,
            background: 'linear-gradient(180deg, #0d4433 0%, #093024 100%)',
            color: '#fff',
            fontFamily: fonts.length ? 'Poppins' : 'sans-serif',
          }}
        >
          {/* decorative circle, top right */}
          <div style={{ display: 'flex', position: 'absolute', top: -330, right: -300, width: 900, height: 900, borderRadius: 450, background: 'rgba(255,255,255,0.07)' }} />

          {/* danfo stripe */}
          <div style={{ display: 'flex', height: 22, width: W, background: '#ffc61a' }}>
            {Array.from({ length: 27 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', width: 14, height: 22, marginLeft: i === 0 ? 20 : 26, background: '#101a15' }} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px 64px 54px' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 64, letterSpacing: -1 }}>
                <span style={{ fontWeight: 800 }}>Naija</span>
                <span style={{ fontWeight: 400, color: '#ffc61a', marginLeft: 14 }}>axes</span>
              </div>
              <div style={{ display: 'flex', flex: 1, height: 2, background: 'rgba(255,255,255,0.35)', margin: '0 30px' }} />
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 6, color: 'rgba(255,255,255,0.85)' }}>MY RESULT</div>
            </div>

            {/* title */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44, height: 250 }}>
              <div style={{ ...kicker, color: '#ffc61a', fontSize: kickerText.length > 36 ? 23 : 27 }}>{kickerText}</div>
              <div style={{ display: 'flex', marginTop: 14, fontSize: titleSize(d.persona), fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
                {d.persona}
              </div>
            </div>

            {/* middle row */}
            <div style={{ display: 'flex', marginTop: 40, flex: 1 }}>
              {/* portrait card */}
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  width: 400,
                  borderRadius: 40,
                  overflow: 'hidden',
                  background: `linear-gradient(160deg, ${topGrad[0]}, ${topGrad[1]})`,
                }}
              >
                {topPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={topPhoto.src}
                      width={400}
                      height={900}
                      style={{ position: 'absolute', top: 0, left: 0, width: 400, height: 900, objectFit: 'cover', objectPosition: 'center top' }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        top: 22,
                        left: 22,
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        fontSize: 19,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.92)',
                      }}
                    >
                      {`Photo: ${topPhoto.credit.slice(0, 30)}`}
                    </div>
                  </>
                ) : (
                  <>
                <div style={{ display: 'flex', position: 'absolute', top: -140, left: -120, width: 560, height: 560, borderRadius: 280, border: '3px solid rgba(255,255,255,0.16)' }} />
                <div style={{ display: 'flex', position: 'absolute', top: -40, left: -20, width: 360, height: 360, borderRadius: 180, border: '3px solid rgba(255,255,255,0.14)' }} />
                <div style={{ display: 'flex', position: 'absolute', top: 60, left: 80, width: 160, height: 160, borderRadius: 80, border: '3px solid rgba(255,255,255,0.12)' }} />
                <div style={{ display: 'flex', position: 'absolute', top: 260, right: -90, width: 260, height: 260, transform: 'rotate(45deg)', border: '3px solid rgba(255,255,255,0.12)' }} />
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: 150,
                    left: 80,
                    width: 240,
                    height: 240,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 120,
                    background: 'rgba(255,255,255,0.2)',
                    border: '5px solid rgba(255,255,255,0.6)',
                    fontSize: 104,
                    fontWeight: 800,
                  }}
                >
                  {initials(topLabel)}
                </div>
                  </>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: 400,
                    padding: '150px 34px 38px',
                    background: 'linear-gradient(180deg, rgba(5,28,20,0) 0%, rgba(5,28,20,0.94) 62%)',
                  }}
                >
                  {d.top ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: 332 }}>
                      <div style={{ display: 'flex', fontSize: 108, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>{d.top.pct}%</div>
                      <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, letterSpacing: 4, marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>MOST COMPATIBLE</div>
                      <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{d.top.name}</div>
                      <div style={{ display: 'flex', fontSize: 29, fontWeight: 400, marginTop: 8, color: 'rgba(255,255,255,0.78)' }}>{d.top.role}</div>
                      <div style={{ display: 'flex', fontSize: 23, fontWeight: 500, marginTop: 14, color: 'rgba(255,255,255,0.6)' }}>
                        {`Compared on ${d.top.axesUsed} of 10 axes`}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', width: 332 }}>
                      <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,0.85)' }}>CLOSEST WAY OF THINKING</div>
                      <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{d.familyLabel}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* axes panel */}
              <div style={{ ...panel, flex: 1, marginLeft: 32, padding: '34px 32px' }}>
                <div style={kicker}>YOUR 10 AXES</div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', marginTop: 20 }}>
                  {d.rows.map((row) => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          background: row.color,
                        }}
                      >
                        <AxisIcon id={row.id} size={32} color="#0a2a20" />
                      </div>
                      <div style={{ display: 'flex', flex: 1, marginLeft: 16, fontSize: 28, fontWeight: 500 }}>{row.label}</div>
                      <div style={{ display: 'flex', width: 64, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.22)', marginRight: 14 }}>
                        <div style={{ display: 'flex', width: `${(row.pct - 50) * 2}%`, minWidth: 8, height: 8, borderRadius: 4, background: row.color }} />
                      </div>
                      <div style={{ display: 'flex', width: 84, justifyContent: 'flex-end', fontSize: 32, fontWeight: 700, color: row.color }}>{row.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* bottom panels */}
            <div style={{ display: 'flex', marginTop: 32 }}>
              <div style={{ ...panel, width: 460, height: 318, padding: '28px 32px' }}>
                <div style={kicker}>OTHER PERSONALITIES</div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', marginTop: 10 }}>
                  {d.others.map((o, i) => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar id={o.id} label={o.name} size={62} photo={otherPhotos[i]} />
                      <div style={{ display: 'flex', flex: 1, marginLeft: 16, fontSize: 27, fontWeight: 500, lineHeight: 1.12 }}>{o.name}</div>
                      <div style={{ display: 'flex', fontSize: 31, fontWeight: 700, marginLeft: 8 }}>{o.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...panel, flex: 1, marginLeft: 32, height: 318, padding: '28px 32px' }}>
                <div style={kicker}>NEARBY THINKING</div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-around', marginTop: 10 }}>
                  {d.fams.map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar id={f.id} label={f.name} size={62} />
                      <div style={{ display: 'flex', flex: 1, marginLeft: 16, fontSize: 27, fontWeight: 500, lineHeight: 1.12 }}>{f.name}</div>
                      <div style={{ display: 'flex', fontSize: 31, fontWeight: 700, marginLeft: 8 }}>{f.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, paddingTop: 30, borderTop: '2px solid rgba(255,255,255,0.28)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: 30, fontWeight: 700, letterSpacing: 5, lineHeight: 1.3 }}>
                <span>DISCOVER YOUR</span>
                <span>PROFILE</span>
              </div>
              <div style={{ display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: 2, color: '#ffc61a' }}>{host}</div>
            </div>
          </div>
        </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
    },
  );

  // If any photo is missing it may be a slow lookup, so do not let this card be cached for a year.
  const photoMissing = (d.top && !topPhoto) || otherPhotos.some((p) => !p);
  const headers = new Headers(image.headers);
  headers.set(
    'Cache-Control',
    fonts.length && !photoMissing ? 'public, max-age=31536000, immutable' : 'public, max-age=600',
  );
  if (params.download === '1') headers.set('Content-Disposition', 'attachment; filename="naija-axes-result.png"');
  return new Response(image.body, { status: 200, headers });
}
