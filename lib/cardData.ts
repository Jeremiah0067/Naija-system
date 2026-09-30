import { AXIS_IDS, type AxisId } from './types';
import type { buildResult } from './result';
import { SHORT_NAMES } from './verdict';

export const AXIS_COLORS: Record<AxisId, string> = {
  economy: '#f59e42',
  federalism: '#ec5c8a',
  religion: '#a78bfa',
  identity: '#f0623f',
  power: '#5aa9f5',
  security: '#2dd4bf',
  social: '#fbbf24',
  democracy: '#4ade80',
  global: '#38bdf8',
  corruption: '#d4a276',
};

/** Short pole names used on the share card: [poleA, poleB]. */
export const POLE_SHORT: Record<AxisId, [string, string]> = {
  economy: ['State-led', 'Market-led'],
  federalism: ['Strong centre', 'Devolution'],
  religion: ['Secular', 'Faith-led'],
  identity: ['Regional', 'National'],
  power: ['Rotation', 'Merit'],
  security: ['Force-first', 'Dialogue'],
  social: ['Traditional', 'Liberal'],
  democracy: ['Order', 'Institutions'],
  global: ['Protectionist', 'Open'],
  corruption: ['Punitive', 'Reformist'],
};

export const GRADIENTS: [string, string][] = [
  ['#f2a01f', '#b83227'],
  ['#22b07d', '#0b5d43'],
  ['#4f8ff7', '#1e3a8a'],
  ['#a35cf0', '#4c1d95'],
  ['#f472b6', '#9d174d'],
  ['#14b8a6', '#134e4a'],
];

export function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function gradientFor(id: string): [string, string] {
  return GRADIENTS[hashIndex(id, GRADIENTS.length)];
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type Result = NonNullable<ReturnType<typeof buildResult>>;

export function buildCardData(r: Result) {
  const rows = AXIS_IDS.map((id) => {
    const s = r.scores[id];
    const pct = Math.round((Math.abs(s) + 100) / 2); // 50 = balanced, 100 = extreme
    return {
      id,
      // Near the middle, show the axis name instead of implying a lean toward one pole.
      label: pct < 55 ? SHORT_NAMES[id] : POLE_SHORT[id][s >= 0 ? 1 : 0],
      pct,
      color: AXIS_COLORS[id],
    };
  });

  // The card only uses profiles with at least 3 axes of evidence, so a headline percentage is
  // never based on one or two axes. Only if no profile qualifies do we fall back to everything.
  const strong = r.profileMatchesAll.filter((m) => m.axesUsed >= 3);
  const pool = strong.length >= 1 ? strong : r.profileMatchesAll;
  const top = pool[0] ?? null;
  const others = pool
    .slice(1, 4)
    .map((m) => ({
      id: m.profile.id,
      name: m.profile.short ?? m.profile.name,
      pct: m.score,
    }))
    .sort((a, b) => b.pct - a.pct);

  // The persona already names the top family, so the "close families" panel skips it.
  const fams = (r.centrist ? r.familyMatchesTop4.slice(0, 3) : r.familyMatchesTop4.slice(1, 4)).map((m) => ({
    id: m.family.id,
    name: m.family.name,
    pct: m.score,
  }));

  return {
    familyLabel: r.topFamily ? r.topFamily.family.name : 'Centrist or mixed',
    persona: r.persona.name,
    rows,
    top: top
      ? {
          id: top.profile.id,
          name: top.profile.short ?? top.profile.name,
          role: titleCase(top.profile.category.split(',')[0].trim()),
          pct: top.score,
          axesUsed: top.axesUsed,
        }
      : null,
    others,
    fams,
  };
}
