'use client';

import Link from 'next/link';

import type { TeamIntegrityPoint } from '@projectedge/schemas';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dciLabel, disLabel } from '@/lib/scoreLabels';

type Props = {
  points: TeamIntegrityPoint[];
};

export function IntegrityTrendCard({ points }: Props) {
  const bottomFive = [...points]
    .sort((left, right) => left.avg_dci - right.avg_dci)
    .slice(0, 5);

  return (
    <div className="min-w-[320px] flex-[2] rounded-xl border border-white/10 bg-card/90 p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-3">
        <div className="h-4 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: '#37d0b6' }} />
        <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
          Integrity Trend
        </span>
        <span className="ml-auto font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
          WEEKLY DCI
        </span>
      </div>

      {points.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-muted-foreground">
          No integrity trend data available.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(7, 11, 18, 0.95)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.72)' }}
                  formatter={(value) => {
                    const formatted = typeof value === 'number' ? value.toFixed(2) : String(value ?? '—');
                    return [formatted, 'Avg DCI'];
                  }}
                  labelFormatter={(week) => `Week ${week}`}
                />
                <Line
                  type="monotone"
                  dataKey="avg_dci"
                  stroke="#37d0b6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.22em] text-muted-foreground">
              Bottom 5 by DCI
            </div>
            <ul className="space-y-2">
              {bottomFive.map((point) => (
                <li key={`wk-${point.week}`}>
                  <Link
                    href={`/catalog?week=${point.week}`}
                    className="flex items-start justify-between rounded-md border border-transparent px-2 py-1.5 transition hover:border-white/12 hover:bg-white/[0.03]"
                  >
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Week {point.week}
                    </span>
                    <span className="text-right">
                      <div className="font-heading text-sm font-bold text-foreground">
                        {point.avg_dci.toFixed(2)}
                      </div>
                      <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {dciLabel(point.avg_dci)} / {disLabel(point.avg_dis)}
                      </div>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
