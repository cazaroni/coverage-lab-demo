"use client";

import { useEffect, useRef, useState } from "react";

function Ticker({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * value);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}

function tileQualityColor(v: number): string {
  if (v >= 0.8) return "#37d0b6";
  if (v >= 0.65) return "#7dd3c0";
  if (v >= 0.5) return "#f7b955";
  return "#f97316";
}

type Props = {
  teamName: string;
  teamAbbr: string;
  season: number | null;
  record: string;
  totalGames: number;
  totalPlays: number;
  avgDci: number | null;
  avgDis: number | null;
  labels: {
    avgDci: string;
    avgDis: string;
    games: string;
    passPlays: string;
    defensiveUnit: string;
  };
};

export function TeamCommandHeader({
  teamName,
  teamAbbr,
  season,
  record,
  totalGames,
  totalPlays,
  avgDci,
  avgDis,
  labels,
}: Props) {
  const metrics = [
    {
      label: labels.avgDci,
      value: avgDci ?? 0,
      color: tileQualityColor(avgDci ?? 0),
      format: (v: number) => v.toFixed(2),
    },
    {
      label: labels.avgDis,
      value: avgDis ?? 0,
      color: tileQualityColor(avgDis ?? 0),
      format: (v: number) => v.toFixed(2),
    },
    {
      label: labels.games,
      value: totalGames,
      color: "#37d0b6",
      format: (v: number) => Math.round(v).toString(),
    },
    {
      label: labels.passPlays,
      value: totalPlays,
      color: "#37d0b6",
      format: (v: number) => Math.round(v).toLocaleString(),
    },
  ];

  const seasonMeta = [
    season ? `${season} SEASON` : null,
    record || null,
    `${totalGames} GAMES`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header
      style={{
        position: "relative",
        padding: "28px 32px",
        borderRadius: 24,
        background: `
          radial-gradient(ellipse at 20% 0%, #37d0b61a 0%, transparent 55%),
          radial-gradient(ellipse at 90% 100%, #f7b95512 0%, transparent 55%),
          linear-gradient(180deg, #102238 0%, #07111d 100%)`,
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #0f5d43 0%, #37d0b6 50%, #f7b955 100%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div
          style={{
            position: "relative",
            width: 88,
            height: 88,
            borderRadius: 18,
            background: "linear-gradient(135deg, #0f5d43 0%, #07111d 100%)",
            border: "1px solid #37d0b655",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 0 30px rgba(15, 93, 67, 0.4), inset 0 0 20px #37d0b61a",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: 44,
              color: "#f5f7fb",
              lineHeight: 1,
              textShadow: "0 0 14px #37d0b666",
              letterSpacing: "0.01em",
            }}
          >
            {teamAbbr}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -1,
              left: 10,
              right: 10,
              height: 2,
              background: "linear-gradient(90deg, transparent, #37d0b6, transparent)",
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-plex-mono, monospace)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#aac0dd",
              }}
            >
              {seasonMeta}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: 44,
              lineHeight: 1,
              color: "#f5f7fb",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            {teamName}
          </div>
          <span
            style={{
              display: "block",
              marginTop: 6,
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#aac0dd",
            }}
          >
            {labels.defensiveUnit} · {totalPlays.toLocaleString()} PASS PLAYS TRACKED
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
            gap: 10,
            flex: "1 1 440px",
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                padding: "14px 16px",
                background: "rgba(22, 50, 82, 0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
              }}
            >
              <span
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontFamily: "var(--font-plex-mono, monospace)",
                  fontSize: 8,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#aac0dd",
                }}
              >
                {m.label}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 30,
                  lineHeight: 1,
                  color: m.color,
                }}
              >
                <Ticker value={m.value} format={m.format} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
