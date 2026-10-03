'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AXES, DEMOGRAPHICS, HISTORY, SCENARIOS, STATEMENTS } from '@/lib/content';
import { encodeAnswers, encodeHistory } from '@/lib/encode';
import { scoreAxes } from '@/lib/scoring';
import type { AxisId } from '@/lib/types';

type Step = 'demo' | 'quiz' | 'history' | 'priorities' | 'sending';
type Item = { kind: 'st' | 'sc'; i: number };

const LIKERT = ['Strongly disagree', 'Disagree', 'Not sure', 'Agree', 'Strongly agree'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PER_DIRECTION = 3; // statements per axis in each direction (so 6 per axis, 60 in all)
const SCENARIOS_PER_QUIZ = 8;
const HISTORY_PER_QUIZ = 20;

/** Random draw: 3 agree-direction and 3 disagree-direction statements per axis. */
function pickStatements(): Item[] {
  const chosen: Item[] = [];
  for (const axis of AXES) {
    for (const dir of [1, -1] as const) {
      const pool = STATEMENTS.map((st, i) => ({ st, i })).filter((x) => x.st.axis === axis.id && x.st.direction === dir);
      shuffle(pool)
        .slice(0, PER_DIRECTION)
        .forEach((x) => chosen.push({ kind: 'st', i: x.i }));
    }
  }
  return chosen;
}

/** Random draw of scenarios, at most one per main axis so topics are spread out. */
function pickScenarios(): Item[] {
  const usedAxes = new Set<string>();
  const chosen: Item[] = [];
  for (const { sc, i } of shuffle(SCENARIOS.map((sc, i) => ({ sc, i })))) {
    const key = sc.axis ?? sc.id;
    if (usedAxes.has(key)) continue;
    usedAxes.add(key);
    chosen.push({ kind: 'sc', i });
    if (chosen.length >= SCENARIOS_PER_QUIZ) break;
  }
  return chosen;
}

function pickHistory(): number[] {
  return shuffle(HISTORY.map((_, i) => i)).slice(0, HISTORY_PER_QUIZ);
}

export default function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('demo');
  const [order, setOrder] = useState<Item[] | null>(null);
  const [pos, setPos] = useState(0);
  const [stmt, setStmt] = useState<number[]>(() => STATEMENTS.map(() => 0));
  const [scen, setScen] = useState<number[]>(() => SCENARIOS.map(() => 0));
  const [hist, setHist] = useState<number[]>(() => HISTORY.map(() => -1));
  const [hpos, setHpos] = useState(0);
  const [histOrder, setHistOrder] = useState<number[]>([]);
  const [demo, setDemo] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [priorities, setPriorities] = useState<AxisId[]>([]);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Every visitor gets a different random draw from the question bank.
    setOrder(shuffle([...pickStatements(), ...pickScenarios()]));
    setHistOrder(pickHistory());
    return () => {
      if (advance.current) clearTimeout(advance.current);
    };
  }, []);

  const total = order?.length ?? 0;
  const current = order ? order[pos] : null;

  const answerItem = useCallback(
    (value: number) => {
      if (!current) return;
      if (current.kind === 'st') setStmt((p) => p.map((v, k) => (k === current.i ? value : v)));
      else setScen((p) => p.map((v, k) => (k === current.i ? value : v)));
      if (advance.current) clearTimeout(advance.current);
      const next = pos + 1;
      advance.current = setTimeout(() => {
        if (next >= total) setStep('history');
        else setPos(next);
      }, 220);
    },
    [current, total, pos],
  );

  const answerHistory = useCallback(
    (idx: number) => {
      const bank = histOrder[hpos];
      if (bank === undefined) return;
      setHist((p) => (p[bank] === -1 ? p.map((v, k) => (k === bank ? idx : v)) : p));
    },
    [hpos, histOrder],
  );

  // Keyboard shortcuts: number keys pick an answer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && ['SELECT', 'INPUT', 'TEXTAREA'].includes(t.tagName)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      if (step === 'quiz' && current) {
        const max = current.kind === 'st' ? 5 : SCENARIOS[current.i].options.length;
        if (n <= max) answerItem(n);
      } else if (step === 'history') {
        if (histOrder[hpos] !== undefined && n <= HISTORY[histOrder[hpos]].options.length) answerHistory(n - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, current, hpos, histOrder, answerItem, answerHistory]);

  const finish = useCallback(
    async (chosen: AxisId[]) => {
      setStep('sending');
      const a = encodeAnswers(stmt, scen);
      const h = encodeHistory(hist);
      if (consent) {
        try {
          await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ a, h, demographics: demo, scores: scoreAxes(stmt, scen) }),
            keepalive: true,
          });
        } catch {
          /* results still work without submission */
        }
      }
      const p = chosen.length ? `&p=${chosen.join(',')}` : '';
      router.push(`/results?a=${a}&h=${h}${p}`);
    },
    [stmt, scen, hist, consent, demo, router],
  );

  /* ---------- Demographics ---------- */
  if (step === 'demo') {
    const requiredDone = DEMOGRAPHICS.filter((d) => !d.optional).every((d) => demo[d.id]);
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>A little about you</h1>
        <p>
          These answers help us show how views differ by age and zone once enough people have taken the quiz. Only age and zone are
          needed. Everything else is optional, and none of it is tied to your name.
        </p>
        <div className="form-grid">
          {DEMOGRAPHICS.map((d) => (
            <label className="field" key={d.id} htmlFor={`d-${d.id}`}>
              {d.label}
              {d.optional ? ' (optional)' : ''}
              <select id={`d-${d.id}`} value={demo[d.id] ?? ''} onChange={(e) => setDemo((p) => ({ ...p, [d.id]: e.target.value }))}>
                <option value="">{d.optional ? 'Skip' : 'Choose one'}</option>
                {d.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            <strong>Add my answers to the anonymous group stats.</strong>
            <br />
            <span className="small">
              Off by default. Political views are sensitive, so nothing is saved unless you tick this. If you leave it off, your
              result still works and is only in the link.
            </span>
          </span>
        </label>
        <div className="row">
          <button className="btn" disabled={!requiredDone || !order} onClick={() => setStep('quiz')}>
            Start the quiz
          </button>
          <span className="small">Tip: you can press the number keys to answer.</span>
        </div>
      </div>
    );
  }

  /* ---------- Main quiz ---------- */
  if (step === 'quiz') {
    if (!current) return <div className="panel">Loading your questions...</div>;
    const isSt = current.kind === 'st';
    const chosen = isSt ? stmt[current.i] : scen[current.i];
    return (
      <div className="panel">
        <div className="progress-label" aria-live="polite">Question {pos + 1} of {total}</div>
        <div className="road" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={pos + 1} aria-label="Quiz progress">
          <div className="road-fill" style={{ width: `${((pos + 1) / total) * 100}%` }} />
        </div>
        {isSt ? (
          <>
            <p className="small" style={{ marginBottom: 0 }}>How much do you agree?</p>
            <h2 className="question wide">{STATEMENTS[current.i].text}</h2>
            <div className="choices likert" role="radiogroup" aria-label="Your answer">
              {LIKERT.map((label, k) => (
                <button key={label} role="radio" aria-checked={chosen === k + 1} className="choice" onClick={() => answerItem(k + 1)}>
                  <span className="key" aria-hidden="true">{k + 1}</span>
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="small" style={{ marginBottom: 0 }}>What would you do?</p>
            <h2 className="question wide">{SCENARIOS[current.i].prompt}</h2>
            <div className="choices" role="radiogroup" aria-label="Your answer">
              {SCENARIOS[current.i].options.map((o, k) => (
                <button key={o.label} role="radio" aria-checked={chosen === k + 1} className="choice" onClick={() => answerItem(k + 1)}>
                  <span className="key" aria-hidden="true">{k + 1}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: '1.2rem' }}>
          <button
            className="btn quiet"
            disabled={pos === 0}
            onClick={() => {
              if (advance.current) clearTimeout(advance.current);
              setPos((p) => Math.max(0, p - 1));
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  /* ---------- History round ---------- */
  if (step === 'history') {
    const bank = histOrder[hpos];
    if (bank === undefined) return <div className="panel">Loading...</div>;
    const q = HISTORY[bank];
    const picked = hist[bank];
    const answered = picked !== -1;
    const last = hpos === histOrder.length - 1;
    return (
      <div className="panel">
        <div className="progress-label">History round: question {hpos + 1} of {histOrder.length}</div>
        <div className="road" aria-hidden="true">
          <div className="road-fill" style={{ width: `${((hpos + 1) / histOrder.length) * 100}%` }} />
        </div>
        <h2 className="question wide">{q.question}</h2>
        <div className="choices" role="group" aria-label="Answer options">
          {q.options.map((o, k) => {
            let cls = 'choice';
            if (answered && k === q.answer) cls += ' right';
            else if (answered && k === picked) cls += ' wrong';
            return (
              <button key={o} className={cls} disabled={answered && k !== picked && k !== q.answer} onClick={() => answerHistory(k)}>
                <span className="key" aria-hidden="true">{k + 1}</span>
                {o}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="note" role="status">
            <strong>{picked === q.answer ? 'Correct.' : `Not quite. The answer is ${q.options[q.answer]}.`}</strong> {q.explanation}
          </div>
        )}
        <div className="row" style={{ marginTop: '1.2rem' }}>
          <button
            className="btn"
            disabled={!answered}
            onClick={() => (last ? setStep('priorities') : setHpos((p) => p + 1))}
          >
            {last ? 'Continue' : 'Next question'}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Priorities ---------- */
  if (step === 'priorities') {
    const toggle = (id: AxisId) =>
      setPriorities((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>Last step: what matters most?</h1>
        <p>Pick up to three issues that matter most to you. We count these double when we work out who you are closest to. You can skip this.</p>
        <div className="choices">
          {AXES.map((a) => (
            <label className="check" key={a.id}>
              <input type="checkbox" checked={priorities.includes(a.id)} onChange={() => toggle(a.id)} disabled={!priorities.includes(a.id) && priorities.length >= 3} />
              <span>
                <strong>{a.name}</strong>
                <br />
                <span className="small">{a.poleA} or {a.poleB}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="row">
          <button className="btn" onClick={() => finish(priorities)}>See my result</button>
          <button className="btn quiet" onClick={() => finish([])}>Skip</button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" role="status">
      Working out your result...
    </div>
  );
}
