import { SCENARIOS, STATEMENTS } from './content';
import { AXIS_IDS, type AxisId, type AxisScores } from './types';

/**
 * value = (answer - 3) * direction for statements, effect value for scenarios.
 * Axis score = mean(values) * 50, clamped to [-100, 100].
 */
export function scoreAxes(statementAnswers: number[], scenarioAnswers: number[]): AxisScores {
  const buckets: Record<AxisId, number[]> = Object.fromEntries(
    AXIS_IDS.map((id) => [id, [] as number[]]),
  ) as Record<AxisId, number[]>;

  STATEMENTS.forEach((s, i) => {
    const a = statementAnswers[i] ?? 0;
    if (a >= 1 && a <= 5) buckets[s.axis].push((a - 3) * s.direction);
  });

  SCENARIOS.forEach((sc, i) => {
    const a = scenarioAnswers[i] ?? 0;
    if (a >= 1 && a <= sc.options.length) {
      const effects = sc.options[a - 1].effects;
      for (const id of Object.keys(effects) as AxisId[]) {
        buckets[id].push(effects[id] as number);
      }
    }
  });

  const out = {} as AxisScores;
  for (const id of AXIS_IDS) {
    const vals = buckets[id];
    const mean = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
    out[id] = Math.max(-100, Math.min(100, Math.round(mean * 50)));
  }
  return out;
}

/** Average absolute score. Low values mean centrist or mixed answers. */
export function intensity(scores: AxisScores): number {
  return AXIS_IDS.reduce((sum, id) => sum + Math.abs(scores[id]), 0) / AXIS_IDS.length;
}

export const CENTRIST_THRESHOLD = 15;

export function isCentrist(scores: AxisScores): boolean {
  return intensity(scores) < CENTRIST_THRESHOLD;
}
