import { AXES, HISTORY, SCENARIOS, STATEMENTS } from './content';

export type Mode = 'quick' | 'standard' | 'deep';
export type Item = { kind: 'st' | 'sc'; i: number };

/** Quick: statements per axis. 2 = one agree-direction and one disagree-direction (20 questions). Use 1 for 10. */
export const QUICK_PER_AXIS: number = 2;
/** Standard: statements per axis in each direction (3 + 3 per axis = 60) and scenarios (8). */
export const STANDARD_PER_DIRECTION = 3;
export const STANDARD_SCENARIOS = 8;
export const HISTORY_PER_QUIZ = 20;

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pool(axisId: string, direction: 1 | -1) {
  return STATEMENTS.map((st, i) => ({ st, i })).filter((x) => x.st.axis === axisId && x.st.direction === direction);
}

function take(axisId: string, direction: 1 | -1, n: number, rand: () => number): Item[] {
  return shuffle(pool(axisId, direction), rand)
    .slice(0, n)
    .map((x) => ({ kind: 'st' as const, i: x.i }));
}

export function pickStatements(mode: Mode, rand: () => number = Math.random): Item[] {
  if (mode === 'deep') return STATEMENTS.map((_, i) => ({ kind: 'st' as const, i }));

  const chosen: Item[] = [];
  if (mode === 'standard') {
    for (const axis of AXES) for (const dir of [1, -1] as const) chosen.push(...take(axis.id, dir, STANDARD_PER_DIRECTION, rand));
    return chosen;
  }

  // quick
  if (QUICK_PER_AXIS === 1) {
    // One statement per axis: half the axes get an agree-direction one, half a disagree-direction one.
    const dirs = shuffle(AXES.map((_, i) => (i % 2 === 0 ? (1 as const) : (-1 as const))), rand);
    AXES.forEach((axis, idx) => chosen.push(...take(axis.id, dirs[idx], 1, rand)));
  } else {
    for (const axis of AXES) for (const dir of [1, -1] as const) chosen.push(...take(axis.id, dir, QUICK_PER_AXIS / 2, rand));
  }
  return chosen;
}

/** Scenarios are spread across topics: at most one per main axis. */
export function pickScenarios(mode: Mode, rand: () => number = Math.random): Item[] {
  if (mode === 'quick') return [];
  if (mode === 'deep') return SCENARIOS.map((_, i) => ({ kind: 'sc' as const, i }));
  const used = new Set<string>();
  const chosen: Item[] = [];
  for (const { sc, i } of shuffle(SCENARIOS.map((sc, i) => ({ sc, i })), rand)) {
    const key = sc.axis ?? sc.id;
    if (used.has(key)) continue;
    used.add(key);
    chosen.push({ kind: 'sc', i });
    if (chosen.length >= STANDARD_SCENARIOS) break;
  }
  return chosen;
}

export function pickHistory(rand: () => number = Math.random): number[] {
  return shuffle(HISTORY.map((_, i) => i), rand).slice(0, HISTORY_PER_QUIZ);
}

/** Everything the player sees on the "choose your length" screen. */
export function modeInfo() {
  return [
    {
      id: 'quick' as const,
      title: 'Quick',
      questions: pickStatements('quick').length,
      minutes: 5,
      blurb: 'A rough sketch. Two questions per axis, so treat the result as a first impression.',
    },
    {
      id: 'standard' as const,
      title: 'Standard',
      questions: pickStatements('standard').length + pickScenarios('standard').length,
      minutes: 12,
      blurb: 'The balanced choice. Good enough to trust your result and your matches.',
    },
    {
      id: 'deep' as const,
      title: 'Deep',
      questions: STATEMENTS.length + SCENARIOS.length,
      minutes: 30,
      blurb: 'Every question we have. The steadiest result, for people who want the full picture.',
    },
  ];
}

/** Which length a finished quiz was, judged from how many questions were answered. */
export function depthFromCount(answered: number): Mode {
  if (answered < 40) return 'quick';
  if (answered < 120) return 'standard';
  return 'deep';
}
