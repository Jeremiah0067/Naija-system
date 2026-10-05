'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AXES, DEMOGRAPHICS, HISTORY, SCENARIOS, STATEMENTS } from '@/lib/content';
import { encodeAnswers, encodeHistory } from '@/lib/encode';
import { scoreAxes } from '@/lib/scoring';
import type { AxisId } from '@/lib/types';
import { modeInfo, pickHistory, pickScenarios, pickStatements, shuffle, type Item, type Mode } from '@/lib/selection';

type Step = 'mode' | 'demo' | 'quiz' | 'history' | 'priorities' | 'sending';

const LIKERT = ['Strongly disagree', 'Disagree', 'Not sure', 'Agree', 'Strongly agree'];

/** Saves the finished quiz. Tries twice, never blocks the result for long, and logs any failure in the browser console. */
async function saveResponse(payload: unknown): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return;
      console.error('Naija Axes: the response was not saved', res.status, await res.text().catch(() => ''));
      if (res.status === 400 || res.status === 501) return; // retrying cannot fix these
    } catch (err) {
      clearTimeout(timer);
      console.error('Naija Axes: could not reach /api/submit', err);
    }
  }
}

export default function QuizFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mode');
  const [order, setOrder] = useState<Item[] | null>(null);
  const [pos, setPos] = useState(0);
  const [stmt, setStmt] = useState<number[]>(() => STATEMENTS.map(() => 0));
  const [scen, setScen] = useState<number[]>(() => SCENARIOS.map(() => 0));
  const [hist, setHist] = useState<number[]>(() => HISTORY.map(() => -1));
  const [hpos, setHpos] = useState(0);
  const [histOrder, setHistOrder] = useState<number[]>([]);
  const [demo, setDemo] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<AxisId[]>([]);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advance.current) clearTimeout(advance.current);
    };
  }, []);

  // Each visitor gets their own random draw from the question bank, sized by the length they pick.
  function chooseMode(m: Mode) {
    setOrder(shuffle([...pickStatements(m), ...pickScenarios(m)]));
    setHistOrder(pickHistory());
    setPos(0);
    setHpos(0);
    setStmt(STATEMENTS.map(() => 0));
    setScen(SCENARIOS.map(() => 0));
    setHist(HISTORY.map(() => -1));
    setStep('demo');
  }

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
      await saveResponse({ a, h, demographics: demo, scores: scoreAxes(stmt, scen) });
      const p = chosen.length ? `&p=${chosen.join(',')}` : '';
      router.push(`/results?a=${a}&h=${h}${p}`);
    },
    [stmt, scen, hist, demo, router],
  );

  /* ---------- Choose length ---------- */
  if (step === 'mode') {
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>How long do you want to go?</h1>
        <p>
          All three end with the same 20-question history round and the same kind of result. Longer quizzes give a steadier picture of
          where you stand.
        </p>
        <div className="choices">
          {modeInfo().map((m) => (
            <button key={m.id} className="choice" onClick={() => chooseMode(m.id)}>
              <span>
                <strong>{m.title}</strong> · {m.questions} questions · about {m.minutes} minutes
                <br />
                <span className="small">{m.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Demographics ---------- */
  if (step === 'demo') {
    const requiredDone = DEMOGRAPHICS.filter((d) => !d.optional).every((d) => demo[d.id]);
    return (
      <div className="panel spaced">
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.6rem)' }}>A little about you</h1>
        <p>
          These answers help us show how views differ by age and zone. Only age and zone are needed. Everything else is optional,
          and none of it is tied to your name.
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
        <p className="note">
          <strong>How your answers are used.</strong> When you finish, your answers, age group, zone and any optional details you chose are
          saved anonymously to build group statistics. No name, email or phone number is asked for or stored with them.
        </p>
        <div className="row">
          <button className="btn" disabled={!requiredDone || !order} onClick={() => setStep('quiz')}>
            Start the quiz
          </button>
          <button className="btn quiet" onClick={() => setStep('mode')}>Change length</button>
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
