import { MATCHABLE_PROFILES, PROFILES, SHOW_LIVING } from '@/lib/content';
import { diagnosePortrait, findPortraitCandidates } from '@/lib/portraits';
import { gradientFor, initials } from '@/lib/cardData';

// Looks things up live, so never build this page ahead of time.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photo check | Naija Axes', robots: { index: false, follow: false } };

const UA = `NaijaAxes/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://naija-axes.vercel.app'}; ${
  process.env.CONTACT_EMAIL ?? 'contact-not-set'
})`;

export default async function PhotoCheck() {
  // Everyone shown in the quiz is listed here. If living people are hidden from the quiz, they are hidden here too.
  const people = SHOW_LIVING ? PROFILES : PROFILES.filter((p) => p.status === 'deceased');
  const shown = new Set(MATCHABLE_PROFILES.map((p) => p.id));

  const rows = await Promise.all(
    people.map(async (p) => {
      const name = p.short ?? p.name;
      const d = await diagnosePortrait(p.id, name, 300, UA);
      // For people with no photo, suggest free files from Commons for a human to confirm.
      const candidates = d.found || d.notes.includes('Turned off in portraits.json') ? [] : await findPortraitCandidates(name, 300, UA);
      const axes = Object.values(p.axes).filter((v) => v !== null && v !== undefined).length;
      return { p, name, d, candidates, inQuiz: shown.has(p.id), axes };
    }),
  );
  const withPhoto = rows.filter((r) => r.d.found).length;

  return (
    <>
      <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>Photo check</h1>
      <p>
        <strong>{withPhoto} of {rows.length}</strong> people have a free photo right now. Everyone else shows coloured initials.
        This page is only for you. Search engines are asked to skip it.
      </p>
      <p className="small">
        People marked &quot;held back&quot; do not appear in quiz results yet (low confidence or too few scored axes), but their photo
        status is shown so you can get it ready.
      </p>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginTop: '1.5rem' }}>
        {rows.map(({ p, name, d, candidates, inQuiz, axes }) => {
          const [c1, c2] = gradientFor(p.id);
          return (
            <div key={p.id} className="panel" style={{ padding: '1rem' }}>
              {d.found ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.found.imageUrl} alt={name} width={300} style={{ width: '100%', height: 260, objectFit: 'cover', objectPosition: 'center top', borderRadius: 12 }} />
              ) : (
                <div
                  style={{
                    height: 260,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 64,
                    fontWeight: 800,
                    background: `linear-gradient(150deg, ${c1}, ${c2})`,
                  }}
                >
                  {initials(name)}
                </div>
              )}
              <h3 style={{ marginTop: '0.8rem', marginBottom: '0.2rem' }}>{name}</h3>
              <p style={{ margin: '0 0 0.5rem' }}>
                <span className="pill" style={{ background: d.found ? '#bfe9cf' : '#fbd5d5' }}>{d.found ? 'Photo found' : 'No photo'}</span>{' '}
                <span className="pill" style={{ background: inQuiz ? '#ffc61a' : '#e6eae1' }}>{inQuiz ? 'In quiz results' : 'Held back'}</span>
              </p>
              <p className="small" style={{ margin: '0 0 0.4rem' }}>
                id: <code>{p.id}</code> · {axes} scored axes · looked up as &quot;{d.title}&quot;
              </p>
              {d.found && (
                <p className="small" style={{ margin: '0 0 0.4rem' }}>
                  {d.found.license} · {d.found.credit.slice(0, 60)} ·{' '}
                  <a href={d.found.source} target="_blank" rel="noopener noreferrer">source</a>
                </p>
              )}
              {d.notes.length > 0 && (
                <ul className="small" style={{ paddingLeft: '1.1rem', margin: '0 0 0.4rem' }}>
                  {d.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              {!d.found && candidates.length > 0 && (
                <div style={{ margin: '0 0 0.6rem' }}>
                  <p className="small" style={{ margin: '0 0 0.3rem' }}>
                    <strong>Free photos found on Commons.</strong> Check that the person is really {name}. If one is right, paste its
                    line inside <code>&quot;portraits&quot;</code> in portraits.json.
                  </p>
                  {candidates.map((c) => (
                    <div key={c.file} style={{ marginBottom: '0.6rem' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.portrait.imageUrl} alt={`Possible photo of ${name}`} width={120} style={{ width: 120, height: 120, objectFit: 'cover', objectPosition: 'center top', borderRadius: 8 }} />
                      <pre className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.2rem 0 0' }}>
                        {`"${p.id}": ${JSON.stringify({ file: c.file, credit: c.portrait.credit.slice(0, 80), license: c.portrait.license, source: c.portrait.source })}`}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              {!d.found && (
                <p className="small" style={{ margin: 0 }}>
                  {candidates.length === 0 ? 'No free photo found. ' : 'None of these right? '}
                  Try another Wikipedia article name inside <code>&quot;portraits&quot;</code> in portraits.json:
                  <br />
                  <code>{`"${p.id}": {"wikipedia": "Exact Wikipedia Title"}`}</code>
                  <br />
                  Or keep the initials, which is fine when no free photo exists.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
