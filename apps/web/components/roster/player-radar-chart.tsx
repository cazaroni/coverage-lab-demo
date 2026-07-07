"use client";

import { useEffect, useId, useState } from "react";

import type { RosterPlayer } from "@/lib/roster-types";

type Props = {
  player: RosterPlayer;
  size?: number;
};

const AXES = [
  { key: "RES", label: "RESILIENCE", getValue: (p: RosterPlayer) => p.resilience },
  { key: "COH", label: "COHESION",   getValue: (p: RosterPlayer) => p.dci },
  { key: "INT", label: "INTEGRITY",  getValue: (p: RosterPlayer) => p.dis },
  { key: "COM", label: "COMPOSURE",  getValue: (p: RosterPlayer) => 1 - p.stress },
  { key: "EXP", label: "EXPERIENCE", getValue: (p: RosterPlayer) => Math.min(1, p.experience / 10) },
  { key: "IMP", label: "IMPACT",     getValue: (p: RosterPlayer) => Math.min(1, p.plays / 700) },
];

function angleFor(i: number): number {
  return (Math.PI * 2 * i) / 6 - Math.PI / 2;
}

export function PlayerRadarChart({ player, size = 260 }: Props) {
  const gradId = useId();
  const [t, setT] = useState(0);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;

  useEffect(() => {
    setT(0);
    const start = performance.now();
    const dur = 900;
    let raf: number;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setT(eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [player.nfl_id]);

  const polygonAt = (scale: number) =>
    AXES.map((_, i) => {
      const a = angleFor(i);
      return `${cx + Math.cos(a) * r * scale},${cy + Math.sin(a) * r * scale}`;
    }).join(" ");

  const dataPts = AXES.map((ax, i) => {
    const a = angleFor(i);
    const v = ax.getValue(player) * t;
    return `${cx + Math.cos(a) * r * v},${cy + Math.sin(a) * r * v}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${gradId}-fill`}>
          <stop offset="0%" stopColor="#37d0b6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#37d0b6" stopOpacity="0.12" />
        </radialGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={polygonAt(s)}
          fill="none"
          stroke="#27486f"
          strokeOpacity={s === 1 ? 0.6 : 0.25}
          strokeWidth={s === 1 ? 1.2 : 0.8}
        />
      ))}

      {AXES.map((_, i) => {
        const a = angleFor(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="#27486f"
            strokeOpacity="0.3"
            strokeWidth="0.8"
          />
        );
      })}

      <polygon
        points={dataPts}
        fill={`url(#${gradId}-fill)`}
        stroke="#37d0b6"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 8px rgba(55, 208, 182, 0.4))" }}
      />

      {AXES.map((ax, i) => {
        const a = angleFor(i);
        const v = ax.getValue(player) * t;
        const x = cx + Math.cos(a) * r * v;
        const y = cy + Math.sin(a) * r * v;
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#37d0b6" stroke="#07111d" strokeWidth="1.5" />;
      })}

      {AXES.map((ax, i) => {
        const a = angleFor(i);
        const lx = cx + Math.cos(a) * (r + 22);
        const ly = cy + Math.sin(a) * (r + 22);
        return (
          <g key={ax.key}>
            <text
              x={lx}
              y={ly - 4}
              textAnchor="middle"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 8,
                letterSpacing: "0.2em",
                fill: "#aac0dd",
                textTransform: "uppercase",
              } as React.CSSProperties}
            >
              {ax.label}
            </text>
            <text
              x={lx}
              y={ly + 8}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                fontSize: 14,
                fill: "#f5f7fb",
                fontWeight: 700,
              } as React.CSSProperties}
            >
              {Math.round(ax.getValue(player) * 99)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
