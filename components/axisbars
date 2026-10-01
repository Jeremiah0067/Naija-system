import { AXES } from '@/lib/content';
import { axisVerdict } from '@/lib/verdict';
import type { AxisScores } from '@/lib/types';

export default function AxisBars({ scores }: { scores: AxisScores }) {
  return (
    <div>
      {AXES.map((axis) => {
        const s = scores[axis.id];
        const width = Math.abs(s) / 2; // percent of full track (half each side)
        const style = s >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` };
        return (
          <div className="axis-row" key={axis.id}>
            <div className="axis-top">
              <span className="axis-name">{axis.name}</span>
              <span className="axis-verdict">{axisVerdict(axis.id, s)}</span>
            </div>
            <div className="track" role="img" aria-label={`${axis.name}: ${s} on a scale from -100 (${axis.poleA}) to +100 (${axis.poleB})`}>
              <div className="fill" style={style} />
            </div>
            <div className="poles" aria-hidden="true">
              <span>{axis.poleA}</span>
              <span>{axis.poleB}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
