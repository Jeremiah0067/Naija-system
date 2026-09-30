import { AXIS_IDS, type AxisId, type AxisScores } from './types';
import { CENTRIST, FAMILIES } from './content';
import { decodeAnswers, decodeHistory } from './encode';
import { rankFamilies, prioritiesToWeights, rankProfiles } from './matching';
import { findContradictions } from './contradictions';
import { isCentrist, scoreAxes } from './scoring';
import { scoreHistory } from './history';

export type SearchParams = { [key: string]: string | string[] | undefined };

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parsePriorities(p: string | undefined): AxisId[] {
  if (!p) return [];
  return p
    .split(',')
    .filter((x): x is AxisId => (AXIS_IDS as string[]).includes(x))
    .slice(0, 3);
}

export function buildResult(params: SearchParams) {
  const code = first(params.a);
  const decoded = decodeAnswers(code);
  if (!decoded || !code) return null;

  const history = decodeHistory(first(params.h));
  const priorities = parsePriorities(first(params.p));
  const weights = prioritiesToWeights(priorities);
  const scores: AxisScores = scoreAxes(decoded.statements, decoded.scenarios);
  const centrist = isCentrist(scores);
  const families = rankFamilies(scores, weights);
  const persona = centrist ? CENTRIST : families[0].family.persona;
  const profileMatches = rankProfiles(scores, weights);
  const farProfiles = rankProfiles(scores, weights, 3).slice().reverse();

  return {
    code,
    scores,
    priorities,
    centrist,
    persona,
    topFamily: centrist ? null : families[0],
    familyMatches: families.slice(0, 3),
    oppositeFamily: families[families.length - 1],
    profileMatches: profileMatches.slice(0, 3),
    profileMatchesAll: profileMatches,
    familyMatchesTop4: families.slice(0, 4),
    oppositeProfile: farProfiles[0] ?? null,
    contradictions: findContradictions(decoded.statements),
    history: history ? scoreHistory(history) : null,
  };
}

export { FAMILIES };
