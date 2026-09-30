import { AXES } from './content';
import { AXIS_IDS, type AxisId, type AxisScores } from './types';

export function compareScores(a: AxisScores, b: AxisScores) {
  const gaps = AXIS_IDS.map((id) => ({ id, gap: Math.abs(a[id] - b[id]) }));
  const mean = gaps.reduce((s, g) => s + g.gap, 0) / gaps.length;
  const sorted = [...gaps].sort((x, y) => x.gap - y.gap);
  return {
    agreement: Math.round(100 * (1 - mean / 200)),
    closest: sorted[0].id as AxisId,
    biggest: sorted[sorted.length - 1].id as AxisId,
    gaps,
  };
}

export function axisName(id: AxisId): string {
  return AXES.find((a) => a.id === id)?.name ?? id;
}
