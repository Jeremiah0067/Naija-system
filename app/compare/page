import Link from 'next/link';
import { AXES, CENTRIST } from '@/lib/content';
import { decodeAnswers } from '@/lib/encode';
import { compareScores } from '@/lib/compare';
import { rankFamilies } from '@/lib/matching';
import { isCentrist, scoreAxes } from '@/lib/scoring';
import { axisVerdict } from '@/lib/verdict';
import { first, type SearchParams } from '@/lib/result';

export const metadata = { title: 'Compare | Naija Axes' };

function load(code: string | undefined) {
  const d = decodeAnswers(code);
  if (!d) return null;
  const scores = scoreAxes(d.statements, d.scenarios);
  const persona = isCentrist(scores) ? CENTRIST : rankFamilies(scores)[0].family.persona;
  return { scores, persona };
}

export default function Compare({ searchParams }: { searchParams: SearchParams }) {
  const me = load(first(searchParams.me));
  const friend = load(first(searchParams.friend));

  if (!me || !friend) {
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: '2rem' }}>We could not read one of the results</h1>
        <p>Go back to your result and paste your friend&apos;s full link again.</p>
        <Link className="btn" href="/quiz">Take the quiz</Link>
      </div>
    );
  }

  const cmp = compareScores(me.scores, friend.scores);
  const byId = Object.fromEntries(AXES.map((a) => [a.id, a]));
  const debate = byId[cmp.biggest];
  const common = byId[cmp.closest];

  return (
    <>
      <section className="result-head">
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3.2rem)' }}>{cmp.agreement}% in agreement</h1>
        <p style={{ fontSize: '1.15rem' }}>
          You are <strong>{me.persona.name}</strong>. Your friend is <strong>{friend.persona.name}</strong>.
        </p>
        <div className="legend" aria-hidden="true">
          <span><i style={{ background: '#ffc61a' }} />You</span>
          <span><i style={{ background: '#23307a' }} />Your friend</span>
        </div>
      </section>

      <section className="section">
        <h2>Bus stop debate</h2>
        <p>
          You are furthest apart on <strong>{debate.name}</strong>: you are {axisVerdict(debate.id, me.scores[debate.id]).toLowerCase()},
          your friend is {axisVerdict(debate.id, friend.scores[debate.id]).toLowerCase()}.
        </p>
        <p>
          You agree most on <strong>{common.name}</strong>. Start there.
        </p>
      </section>

      <section className="section">
        <h2>Axis by axis</h2>
        {AXES.map((a) => (
          <div className="axis-row" key={a.id}>
            <div className="axis-top">
              <span className="axis-name">{a.name}</span>
              <span className="axis-verdict">Gap: {Math.abs(me.scores[a.id] - friend.scores[a.id])}</span>
            </div>
            <div className="duo" role="img" aria-label={`${a.name}: you ${me.scores[a.id]}, friend ${friend.scores[a.id]}`}>
              <span className="dot me" style={{ left: `${(me.scores[a.id] + 100) / 2}%` }} />
              <span className="dot friend" style={{ left: `${(friend.scores[a.id] + 100) / 2}%` }} />
            </div>
            <div className="poles" aria-hidden="true">
              <span>{a.poleA}</span>
              <span>{a.poleB}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="row">
        <Link className="btn quiet" href="/quiz">Take the quiz</Link>
      </div>
    </>
  );
}
