import { FAMILIES, MATCHABLE_PROFILES } from './content';
import { AXIS_IDS, type AxisId, type AxisScores, type Family, type PartialAxes, type Profile, type Weights } from './types';

export interface Similarity {
  score: number; // 0-100
  axesUsed: number;
}

/**
 * Weighted mean absolute gap turned into a 0-100 similarity.
 * Axes where the profile has no evidence (null) are skipped.
 * Distance (not cosine) is used so intensity matters: a mild centrist and a hard partisan
 * pointing the same way are not the same.
 */
export function similarity(user: AxisScores, vec: PartialAxes, weights: Weights = {}): Similarity | null {
  let sum = 0;
  let wsum = 0;
  let used = 0;
  for (const id of AXIS_IDS) {
    const v = vec[id];
    if (v === null || v === undefined) continue;
    const w = weights[id] ?? 1;
    sum += w * Math.abs(user[id] - v);
    wsum += w;
    used += 1;
  }
  if (used === 0) return null;
  const avgGap = sum / wsum; // 0 to 200
  return { score: Math.round(100 * (1 - avgGap / 200)), axesUsed: used };
}

export function prioritiesToWeights(priorities: AxisId[]): Weights {
  const w: Weights = {};
  for (const id of priorities) w[id] = 2;
  return w;
}

/** With fewer than 3 axes of evidence, never claim more than 'Close'. */
export function closenessLabel(score: number, axesUsed = 10): string {
  if (score >= 85 && axesUsed >= 3) return 'Very close';
  if (score >= 72 && axesUsed < 3) return 'Close';
  if (score >= 72) return 'Close';
  if (score >= 58) return 'Some overlap';
  return 'Far apart';
}

export function confidenceLabel(axesUsed: number): 'Low' | 'Medium' | 'Higher' {
  if (axesUsed >= 5) return 'Higher';
  if (axesUsed >= 3) return 'Medium';
  return 'Low';
}

export interface ProfileMatch {
  profile: Profile;
  score: number;
  axesUsed: number;
  /** Score used for ordering: thinly-evidenced profiles are pushed down. */
  adjusted: number;
}

export function coveragePenalty(axesUsed: number): number {
  return Math.max(0, 5 - axesUsed) * 4;
}

export function rankProfiles(
  user: AxisScores,
  weights: Weights = {},
  minAxes = 1,
  pool: Profile[] = MATCHABLE_PROFILES,
): ProfileMatch[] {
  return pool
    .map((profile) => {
      const s = similarity(user, profile.axes, weights);
      return s && s.axesUsed >= minAxes
        ? { profile, score: s.score, axesUsed: s.axesUsed, adjusted: s.score - coveragePenalty(s.axesUsed) }
        : null;
    })
    .filter((x): x is ProfileMatch => x !== null)
    .sort((a, b) => b.adjusted - a.adjusted);
}

export interface FamilyMatch {
  family: Family;
  score: number;
}

export function rankFamilies(user: AxisScores, weights: Weights = {}): FamilyMatch[] {
  return FAMILIES.map((family) => {
    const s = similarity(user, family.axes, weights) as Similarity;
    return { family, score: s.score };
  }).sort((a, b) => b.score - a.score);
}
