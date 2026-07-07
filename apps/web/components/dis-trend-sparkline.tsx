import type { TeamDISTrendPoint } from "@projectedge/schemas";

type Props = {
  data: TeamDISTrendPoint[];
};

// DIS tier thresholds - higher DIS = worse structural integrity
const TIER_LINES = [
  { threshold: 0.5, color: "#f36f6f", label: "CRIT" },
  { threshold: 0.35, color: "#f97316", label: "WARN" },
  { threshold: 0.2, color: "#f7b955", label: "CAU" },
] as const;

export function DisTrendSparkline({ data }: Props) {
  if (data.length < 2) return null;

  const W = 500;
  const H = 100;
  const padX = 8;
  const padY = 10;

  const values = data.map((d) => d.dis_average);
  const minV = 0;
  const maxV = Math.max(Math.max(...values) * 1.1, 0.58);
  const rangeV = maxV - minV;

  function toX(i: number): number {
    return padX + (i / (data.length - 1)) * (W - padX * 2);
  }
  function toY(v: number): number {
    return H - padY - ((v - minV) / rangeV) * (H - padY * 2);
  }

  const linePts = data.map((d, i) => `${toX(i)},${toY(d.dis_average)}`).join(" ");

  const firstX = toX(0);
  const lastX = toX(data.length - 1);
  const baseline = H - padY;
  const areaD = `M ${firstX},${baseline} L ${data
    .map((d, i) => `${toX(i)},${toY(d.dis_average)}`)
    .join(" L ")} L ${lastX},${baseline} Z`;

  const lastVal = values[values.length - 1] ?? 0;
  const prevVal = values[values.length - 2] ?? lastVal;
  const rising = lastVal > prevVal;
  const lineColor = rising ? "#f36f6f" : "#37d0b6";

  const lastPtX = toX(data.length - 1);
  const lastPtY = toY(lastVal);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        aria-label={`DIS trend over ${data.length} data points`}
        role="img"
      >
        <defs>
          <linearGradient id="disAreaGrad" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {TIER_LINES.map(({ threshold, color, label }) => {
          const ly = toY(threshold);
          return (
            <g key={label}>
              <line
                x1={padX}
                y1={ly}
                x2={W - padX - 22}
                y2={ly}
                stroke={color}
                strokeWidth="0.6"
                strokeDasharray="4 3"
                opacity={0.35}
              />
              <text
                x={W - padX - 20}
                y={ly + 3}
                fontSize="7"
                fill={color}
                opacity={0.65}
                fontFamily="var(--font-plex-mono)"
                letterSpacing="0.06em"
              >
                {label}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#disAreaGrad)" />

        <polyline
          points={linePts}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />

        <circle cx={lastPtX} cy={lastPtY} r="5" fill={lineColor} opacity={0.18} />
        <circle cx={lastPtX} cy={lastPtY} r="3" fill={lineColor} />
      </svg>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
          WK {data[0]?.week}
        </span>

        <div
          className="flex items-center gap-2 rounded-md px-3 py-1.5"
          style={{
            backgroundColor: `${lineColor}15`,
            border: `1px solid ${lineColor}30`,
          }}
        >
          <span
            className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: lineColor }}
          >
            {rising ? "+" : "-"} {rising ? "RISING" : "IMPROVING"}
          </span>
          <span
            className="font-heading text-xl font-bold leading-none tabular-nums"
            style={{ color: lineColor }}
          >
            {lastVal.toFixed(2)}
          </span>
        </div>

        <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
          WK {data[data.length - 1]?.week}
        </span>
      </div>
    </div>
  );
}
