import { useState } from 'react';
import { weekdayShort } from '@/engine/dates';

/**
 * Small single-series column chart for the dashboard (no chart library needed).
 * Thin rounded columns from one baseline, an optional reference line, a hover
 * readout, and a visually hidden table for screen readers.
 */
export function MiniBars({
  data,
  label,
  unit,
  reference,
  referenceLabel,
  color = 'var(--chart-single)',
  format = (n: number) => String(Math.round(n)),
  highlightDate,
}: {
  data: { date: string; value: number }[];
  label: string;
  unit: string;
  reference?: number;
  referenceLabel?: string;
  color?: string;
  format?: (n: number) => string;
  /** Bar to emphasise when nothing is hovered (defaults to the last one). */
  highlightDate?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 280;
  const H = 96;
  const top = 16;
  const bottom = 18;
  const max = Math.max(1, reference ?? 0, ...data.map((d) => d.value)) * 1.1;
  const slot = W / data.length;
  const bw = Math.min(22, slot * 0.55);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const highlighted = highlightDate ? data.findIndex((d) => d.date === highlightDate) : -1;
  const active = hover ?? (highlighted >= 0 ? highlighted : data.length - 1);

  return (
    <figure className="m-0">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-forest-600">{label}</span>
        <span className="num text-forest-500">
          {hover !== null || (highlightDate && highlighted < 0) ? weekdayShort(data[active].date) : 'Today'}: <span className="font-semibold text-forest-800">{format(data[active].value)} {unit}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full overflow-visible" role="img" aria-label={`${label}, last ${data.length} days`} onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--chart-grid)" strokeWidth={1} />
        {reference !== undefined && (
          <g>
            <line x1={0} x2={W} y1={y(reference)} y2={y(reference)} stroke="var(--chart-axis)" strokeWidth={1} strokeOpacity={0.35} />
            {referenceLabel && (
              <text x={0} y={y(reference) - 4} textAnchor="start" fontSize={9} fill="var(--chart-axis)">
                {referenceLabel}
              </text>
            )}
          </g>
        )}
        {data.map((d, i) => {
          const x = slot * i + (slot - bw) / 2;
          const h = Math.max(0, H - bottom - y(d.value));
          const r = Math.min(4, h / 2, bw / 2);
          const yy = H - bottom - h;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${weekdayShort(d.date)}: ${format(d.value)} ${unit}`}>
              <rect x={slot * i} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${H - bottom} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - bottom} Z`}
                  fill={color}
                  opacity={i === active ? 1 : 0.55}
                />
              )}
              <text x={slot * i + slot / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--chart-axis)" fontWeight={i === active ? 700 : 400}>
                {weekdayShort(d.date).slice(0, 2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="sr-only">
        <table>
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>
                {format(d.value)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
