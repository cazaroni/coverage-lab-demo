"use client";

import { useEffect, useRef, useState } from "react";

import { qualityColor, stressColor } from "@/lib/stress-colors";
import type { TeamSummary } from "@/lib/roster-reads";

type Props = {
  team: TeamSummary;
};

function Ticker({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);
  return <>{Math.round(display)}</>;
}

export function TeamHeader({ team }: Props) {
  const stats = [
    { label: "DCI",       v: team.avg_dci,        color: qualityColor(team.avg_dci) },
    { label: "DIS",       v: team.avg_dis,        color: qualityColor(team.avg_dis) },
    { label: "RESILIENCE",v: team.avg_resilience, color: qualityColor(team.avg_resilience) },
    { label: "AVG STRESS",v: team.avg_stress,     color: stressColor(team.avg_stress) },
  ];

  return (
    <header
      style={{
        position: "relative",
        padding: "28px 32px",
        borderRadius: 28,
        background: `
          radial-gradient(ellipse at 20% 0%, rgba(55, 208, 182, 0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 90% 100%, rgba(247, 185, 85, 0.08) 0%, transparent 55%),
          linear-gradient(180deg, #102238 0%, #07111d 100%)
        `,
        border: "1px solid rgba(255, 255, 255, 0.06)",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 4,
          background: "linear-gradient(90deg, #0f5d43 0%, #37d0b6 50%, #f7b955 100%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {/* Team avatar */}
        <div
          style={{
            position: "relative",
            width: 82,
            height: 82,
            borderRadius: 18,
            background: "linear-gradient(135deg, #0f5d43 0%, #07111d 100%)",
            border: "1px solid #37d0b655",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 0 30px rgba(15, 93, 67, 0.4), inset 0 0 20px rgba(55, 208, 182, 0.1)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: 44,
              color: "#f5f7fb",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              textShadow: "0 0 14px rgba(55, 208, 182, 0.4)",
              fontWeight: 900,
            }}
          >
            {team.abbr}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -1,
              left: 10, right: 10,
              height: 2,
              background: "linear-gradient(90deg, transparent, #37d0b6, transparent)",
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#aac0dd",
              }}
            >
              WK {team.week} · {team.record} · NEXT
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: "#f7b95522",
                border: "1px solid #f7b95555",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "#f7b955",
                textTransform: "uppercase",
              }}
            >
              VS {team.next_opponent}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: 42,
              lineHeight: 1,
              color: "#f5f7fb",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {team.name}
          </div>
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#aac0dd",
              marginTop: 6,
              display: "block",
            }}
          >
            {team.subname} · {team.plays_tracked.toLocaleString()} SNAPS TRACKED
          </span>
        </div>

        {/* Stat tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
            gap: 10,
            flex: "1 1 460px",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                padding: "12px 14px",
                background: "rgba(22, 50, 82, 0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontSize: 8,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#aac0dd",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 28,
                  lineHeight: 1,
                  color: s.color,
                  fontWeight: 700,
                }}
              >
                <Ticker value={s.v * 99} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
