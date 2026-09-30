import type { AxisId } from './types';

type Shape =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number };

/** Simple 24x24 line icons, one per axis. */
export const ICONS: Record<AxisId, Shape[]> = {
  economy: [{ t: 'path', d: 'M5 20V11M12 20V4M19 20V14M3 20h18' }],
  federalism: [
    { t: 'circle', cx: 12, cy: 12, r: 3 },
    { t: 'circle', cx: 4.5, cy: 5, r: 2 },
    { t: 'circle', cx: 19.5, cy: 5, r: 2 },
    { t: 'circle', cx: 12, cy: 20, r: 2 },
    { t: 'path', d: 'M10 10L6 6.5M14 10L18 6.5M12 15v3' },
  ],
  religion: [{ t: 'path', d: 'M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z' }],
  identity: [{ t: 'path', d: 'M5 21V4M5 4h12l-2.5 4L17 12H5' }],
  power: [{ t: 'path', d: 'M12 4v16M7 20h10M5 8h14M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z' }],
  security: [{ t: 'path', d: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z' }],
  social: [{ t: 'path', d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' }],
  democracy: [{ t: 'path', d: 'M4 4h16v16H4zM8 12l3 3 5-6' }],
  global: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'path', d: 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
  ],
  corruption: [
    { t: 'circle', cx: 10.5, cy: 10.5, r: 6.5 },
    { t: 'path', d: 'M15.5 15.5L21 21' },
  ],
};

export function AxisIcon({ id, size, color = '#ffffff' }: { id: AxisId; size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[id].map((s, i) =>
        s.t === 'path' ? <path key={i} d={s.d} /> : <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />,
      )}
    </svg>
  );
}
