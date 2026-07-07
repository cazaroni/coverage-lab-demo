import { stressColor } from "@/lib/stress-colors";
import type { RosterTrendPoint } from "@/lib/roster-types";

type Props = {
  trend: RosterTrendPoint[];
  color: string;
  height?: number;
};

export function StressTrendSparkline({ trend, color, height = 100 }: Props) {
  if (trend.length < 2) return null;

  const pts = trend.map((p, i, a) => ({
    x: (i / (a.length - 1)) * 100,
    y: 100 - p.stress * 100,
    week: p.week,
    stress: p.stress,
  }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
        aria-hidden
      >
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0" y1={y} x2="100" y2={y}
            stroke="#27486f"
            strokeOpacity="0.3"
            strokeWidth="0.4"
            strokeDasharray="1 2"
          />
        ))}
        <polyline
          points={`${poly} 100,100 0,100`}
          fill={color}
          fillOpacity="0.15"
        />
        <polyline
          points={poly}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p) => (
          <circle
            key={p.week}
            cx={p.x}
            cy={p.y}
            r="1.4"
            fill={stressColor(p.stress)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
