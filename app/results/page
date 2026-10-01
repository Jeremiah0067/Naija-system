import type { Metadata } from 'next';
import Link from 'next/link';
import AxisBars from '@/components/AxisBars';
import Radar from '@/components/Radar';
import ShareBar from '@/components/ShareBar';
import CompareForm from '@/components/CompareForm';
import { AXIS_BY_ID, CENTRIST } from '@/lib/content';
import { closenessLabel, confidenceLabel } from '@/lib/matching';
import { buildResult, first, type SearchParams } from '@/lib/result';
import { AXIS_IDS } from '@/lib/types';

type Props = { searchParams: SearchParams };

export function generateMetadata({ searchParams }: Props): Metadata {
  const r = buildResult(searchParams);
  if (!r) return { title: 'Result | Naija Axes' };
  const q = new URLSearchParams({
    n: r.persona.name,
    f: r.topFamily ? r.topFamily.family.name : 'Centrist',
    s: AXIS_IDS.map((id) => r.scores[id]).join(','),
  });
  const img = `/api/og?${q.toString()}`;
  const title = `I got "${r.persona.name}" on Naija Axes`;
  return {
    title: `${r.persona.name} | Naija Axes`,
    openGraph: { title, description: r.persona.roast, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: r.persona.roast, images: [img] },
  };
}

export default function Results({ searchParams }: Props) {
  const r = buildResult(searchParams);
  const qs = new URLSearchParams();
  const hParam = first(searchParams.h);
  const pParam = first(searchParams.p);
  if (r) qs.set('a', r.code);
  if (hParam) qs.set('h', hParam);
  if (pParam) qs.set('p', pParam);
  const cardSrc = `/api/card?${qs.toString()}`;
  const cardHd = `/api/card?${qs.toString()}&download=1`;

  if (!r) {
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: '2rem' }}>This result link is not valid</h1>
        <p>The link may be cut off or incomplete. Take the quiz again and you will get a fresh one.</p>
        <Link className="btn" href="/quiz">Start the quiz</Link>
      </div>
    );
  }

  return (
    <>
      <section className="result-hero">
        <div className="card-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card-img"
            src={cardSrc}
            width={1080}
            height={1920}
            decoding="async"
            alt={`Your Naija Axes result card: ${r.persona.name}. ${
              r.topFamily ? r.topFamily.family.name : 'Centrist or mixed answers'
            }.`}
          />
          <a className="btn" href={cardHd} download="naija-axes-result.png">
            Download HD card
          </a>
        </div>
        <div className="text-col">
          <p className="family-line">{r.topFamily ? r.topFamily.family.name : 'Centrist or mixed answers'}</p>
          <h1 className="persona">{r.persona.name}</h1>
          <p style={{ fontSize: '1.2rem' }}>{r.persona.roast}</p>
          <p>{r.topFamily ? r.topFamily.family.description : CENTRIST.description}</p>
          <ShareBar persona={r.persona.name} />
          <p className="small" style={{ marginTop: '1rem' }}>
            The card is made for WhatsApp status and Instagram stories. Save it, post it, and see who in your circle matches.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Your ten axes</h2>
        <div className="two-col">
          <Radar scores={r.scores} />
          <p className="small">
            The dashed ring is the middle. The further your shape reaches toward an edge, the more strongly you lean toward the
            second option on that axis. The bars below show both ends by name.
          </p>
        </div>
        <AxisBars scores={r.scores} />
      </section>

      {r.contradictions.length > 0 && (
        <section className="section">
          <h2>Where your answers pull apart</h2>
          <p>Nobody is fully consistent. Here is where you might want a second look.</p>
          {r.contradictions.map((c) => (
            <div className="contradiction" key={c}>{c}</div>
          ))}
        </section>
      )}

      <section className="section">
        <h2>Closest ways of thinking</h2>
        {r.familyMatches.map((m) => (
          <div className="match" key={m.family.id}>
            <div className="match-top">
              <h3>{m.family.name}</h3>
              <span className="pill">{closenessLabel(m.score)}, {m.score}%</span>
            </div>
            <p>{m.family.description}</p>
          </div>
        ))}
        <p className="small">
          Furthest from you: <strong>{r.oppositeFamily.family.name}</strong> ({r.oppositeFamily.score}%). {r.oppositeFamily.family.description}
        </p>
      </section>

      <section className="section">
        <h2>People from history whose public records are closest to yours</h2>
        {r.profileMatches.length === 0 && <p>Not enough profile data to match you yet.</p>}
        {r.profileMatches.map((m) => (
          <div className="match" key={m.profile.id}>
            <div className="match-top">
              <h3>{m.profile.name}</h3>
              <span className="pill">{closenessLabel(m.score, m.axesUsed)}, {m.score}%</span>
            </div>
            <p className="small">{m.profile.category}</p>
            <p>{m.profile.summary}</p>
            <p className="small">
              Compared on {m.axesUsed} of 10 axes ({confidenceLabel(m.axesUsed)} confidence).{' '}
              {m.profile.evidence_level === 'sourced'
                ? 'Position backed by sources we retrieved.'
                : 'Draft from general knowledge that has not yet been verified.'}
            </p>
            {m.profile.sources.length > 0 && (
              <p className="small">
                Sources:{' '}
                {m.profile.sources.map((s, i) => (
                  <span key={s}>
                    <a href={s} target="_blank" rel="noopener noreferrer">{new URL(s).hostname.replace('www.', '')}</a>
                    {i < m.profile.sources.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}
          </div>
        ))}
        {r.oppositeProfile && (
          <p className="small">
            Furthest from you: <strong>{r.oppositeProfile.profile.name}</strong> ({r.oppositeProfile.score}%, compared on{' '}
            {r.oppositeProfile.axesUsed} axes).
          </p>
        )}
        <p className="small">
          A match means your answers are similar to what the public record suggests, on the axes we have evidence for. It is not an
          endorsement, and these profiles are still being verified.
        </p>
      </section>

      {r.history && (
        <section className="section">
          <h2>Your history rank</h2>
          <h3 style={{ fontSize: '1.8rem' }}>{r.history.rank.title}</h3>
          <p>
            {r.history.correct} out of {r.history.total} correct. {r.history.rank.blurb}
          </p>
        </section>
      )}

      <section className="section">
        <h2>Compare with a friend</h2>
        <p>Ask a friend to take the quiz, then paste their result link here to see where you agree and where the debate starts.</p>
        <CompareForm myCode={r.code} />
      </section>

      <section className="section">
        <div className="row">
          <Link className="btn quiet" href="/quiz">Retake the quiz</Link>
        </div>
      </section>
    </>
  );
}
