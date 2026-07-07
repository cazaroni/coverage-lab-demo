import type { TeamDCIDistributionPoint } from "@projectedge/schemas";

type Props = {
  data: TeamDCIDistributionPoint[];
};

function getBucketMidpoint(bucket: string): number {
  const rawParts = bucket.split("-").map(Number);
  const lo = rawParts[0] ?? NaN;
  const hi = rawParts[1] ?? NaN;
  return !isNaN(lo) && !isNaN(hi) ? (lo + hi) / 2 : 0.5;
}

type Tier = { label: string; color: string };

function getBucketTier(mid: number): Tier {
  if (mid >= 0.7) return { label: "TIGHT", color: "#37d0b6" };
  if (mid >= 0.5) return { label: "MOD", color: "#f7b955" };
  if (mid >= 0.3) return { label: "LOOSE", color: "#f97316" };
  return { label: "CRIT", color: "#f36f6f" };
}

const LEGEND_TIERS: Tier[] = [
  { label: "TIGHT", color: "#37d0b6" },
  { label: "MOD", color: "#f7b955" },
  { label: "LOOSE", color: "#f97316" },
  { label: "CRIT", color: "#f36f6f" },
];

export function DciDistributionChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Total plays count */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.52rem] uppercase tracking-[0.25em] text-muted-foreground">
          plays analyzed
        </span>
        <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
          {total.toLocaleString()}
        </span>
      </div>

      {/* Bars */}
      <div
        className="flex h-28 items-end gap-1"
        role="img"
        aria-label="DCI distribution bar chart"
      >
        {data.map((point) => {
          const pct = Math.max((point.count / max) * 100, 2);
          const mid = getBucketMidpoint(point.bucket);
          const { color } = getBucketTier(mid);
          return (
            <div
              key={point.bucket}
              className="flex flex-1 flex-col items-center gap-1"
              title={`DCI ${point.bucket}: ${point.count} plays`}
            >
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${pct}%`,
                  backgroundColor: color,
                  opacity: 0.82,
                  boxShadow: `0 -3px 10px ${color}45`,
                }}
              />
              <span
                className="font-mono text-[0.48rem] leading-none"
                style={{ color, opacity: 0.75 }}
              >
                {point.bucket}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tier legend */}
      <div className="flex items-center justify-center gap-5 border-t border-white/8 pt-3">
        {LEGEND_TIERS.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-3 rounded-full"
              style={{ backgroundColor: color, opacity: 0.8 }}
            />
            <span
              className="font-mono text-[0.5rem] uppercase tracking-[0.18em]"
              style={{ color, opacity: 0.7 }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
