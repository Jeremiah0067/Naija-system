import { AXIS_BY_ID } from './content';
import type { AxisId } from './types';

export const SHORT_NAMES: Record<AxisId, string> = {
  economy: 'Economy',
  federalism: 'Federation',
  religion: 'Religion',
  identity: 'Identity',
  power: 'Power',
  security: 'Security',
  social: 'Social',
  democracy: 'Government',
  global: 'World',
  corruption: 'Corruption',
};

export function axisVerdict(id: AxisId, score: number): string {
  const axis = AXIS_BY_ID[id];
  const abs = Math.abs(score);
  if (abs < 15) return 'Balanced';
  const pole = score < 0 ? axis.poleA : axis.poleB;
  const strength = abs < 40 ? 'Leaning' : abs < 70 ? 'Clearly' : 'Strongly';
  return `${strength}: ${pole}`;
}
