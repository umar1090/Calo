import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { formatShortDate, weekdayShort } from '@/engine/dates';

export interface Series {
  key: string;
  label: string;
  color: string;
}

const AXIS = { fontSize: 11, fill: 'var(--chart-axis)' };

function ChartTooltip({ active, payload, label, unit, series }: TooltipProps<number, string> & { unit: string; series: Series[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-cream-300 bg-cream-50 px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-forest-800">{label ? `${weekdayShort(String(label))} ${formatShortDate(String(label))}` : ''}</p>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <p key={String(p.dataKey)} className="num flex items-center gap-2 text-forest-700">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s?.color }} aria-hidden />
            {s?.label}: <span className="font-semibold">{typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}</span> {unit}
          </p>
        );
      })}
    </div>
  );
}

const tickDate = (n: number) => (d: string, i: number) => (n <= 7 ? weekdayShort(d).slice(0, 2) : i % Math.ceil(n / 6) === 0 ? formatShortDate(d) : '');

export function TrendChart({
  data,
  series,
  unit,
  kind = 'bar',
  reference,
  referenceLabel,
  height = 180,
  title,
  yDomain,
}: {
  data: Record<string, number | string | null>[];
  series: Series[];
  unit: string;
  kind?: 'bar' | 'line';
  reference?: number;
  referenceLabel?: string;
  height?: number;
  title: string;
  yDomain?: [number, number];
}) {
  const n = data.length;
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis dataKey="date" tickFormatter={tickDate(n)} tick={AXIS} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false} interval={0} />
      <YAxis tick={AXIS} axisLine={false} tickLine={false} width={42} allowDecimals={false} domain={yDomain} tickFormatter={(v: number) => v.toLocaleString('en-IN')} />
      <Tooltip content={<ChartTooltip unit={unit} series={series} />} cursor={{ fill: 'rgba(110,143,103,0.08)', stroke: 'var(--chart-grid)' }} />
      {reference !== undefined && (
        <ReferenceLine y={reference} stroke="var(--chart-axis)" strokeOpacity={0.45} label={{ value: referenceLabel, position: 'insideTopRight', fontSize: 10, fill: 'var(--chart-axis)' }} />
      )}
    </>
  );
  return (
    <figure className="m-0">
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-3 text-xs text-forest-600" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div style={{ height }} role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 4, left: -4, bottom: 0 }} barGap={2} barCategoryGap={n > 14 ? '20%' : '30%'}>
              {common}
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              {common}
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: s.color, stroke: '#FFFDF9', strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: '#FFFDF9', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label} ({unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row.date)}>
              <th scope="row">{String(row.date)}</th>
              {series.map((s) => (
                <td key={s.key}>{row[s.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
