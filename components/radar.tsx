import { AXIS_IDS, type AxisScores } from '@/lib/types';
import { SHORT_NAMES } from '@/lib/verdict';

export default function Radar({ scores }: { scores: AxisScores }) {
  const size = 380;
  const c = size / 2;
  const R = 120;
  const n = AXIS_IDS.length;
  const point = (i: number, frac: number): [number, number] => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(ang) * R * frac, c + Math.sin(ang) * R * frac];
  };
  const poly = (fracs: number[]) => fracs.map((f, i) => point(i, f).join(',')).join(' ');
  const data = AXIS_IDS.map((id) => (scores[id] + 100) / 200);
  const ring = (f: number) => poly(AXIS_IDS.map(() => f));

  return (
    <svg viewBox={`-50 0 ${size + 100} ${size}`} role="img" aria-label="Radar chart of your ten axis scores" style={{ width: '100%', maxWidth: 420, height: 'auto' }}>
      <polygon points={ring(1)} fill="none" stroke="#d5dbd0" strokeWidth="1.5" />
      <polygon points={ring(0.5)} fill="none" stroke="#17201c" strokeWidth="1.5" strokeDasharray="5 4" />
      <polygon points={ring(0)} fill="none" />
      {AXIS_IDS.map((id, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.2);
        const cos = Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n);
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g key={id}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="#d5dbd0" strokeWidth="1" />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="12.5" fill="#17201c" fontFamily="var(--font-body)">
              {SHORT_NAMES[id]}
            </text>
          </g>
        );
      })}
      <polygon points={poly(data)} fill="#ffc61a" fillOpacity="0.55" stroke="#17201c" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((f, i) => {
        const [x, y] = point(i, f);
        return <circle key={i} cx={x} cy={y} r="4" fill="#17201c" />;
      })}
    </svg>
  );
}
