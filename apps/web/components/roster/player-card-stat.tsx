"use client";

import { useEffect, useRef, useState } from "react";

import { ovrTier, playerArchetype, qualityColor, stressColor } from "@/lib/stress-colors";
import type { RosterPlayer } from "@/lib/roster-types";

type Density = "compact" | "comfy" | "showcase";

type Props = {
  player: RosterPlayer;
  onClick: (player: RosterPlayer) => void;
  density?: Density;
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
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <>{Math.round(display)}</>;
}

const SIZES = {
  compact:  { pad: 10, ovrSize: 38, nameSize: 12 },
  comfy:    { pad: 14, ovrSize: 52, nameSize: 14 },
  showcase: { pad: 18, ovrSize: 68, nameSize: 17 },
};

export function PlayerCardStat({ player, onClick, density = "comfy" }: Props) {
  const tier = ovrTier(player.ovr);
  const archetype = playerArchetype(player);
  const stressC = stressColor(player.stress);
  const [hover, setHover] = useState(false);
  const sizes = SIZES[density];

  const sparkPoints = player.trend
    .map((p, i, a) => {
      const x = (i / (a.length - 1)) * 100;
      const y = 100 - p.stress * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const statItems = [
    { label: "DCI", v: player.dci },
    { label: "DIS", v: player.dis },
    { label: "RES", v: player.resilience },
  ];

  return (
    <button
      onClick={() => onClick(player)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        textAlign: "left",
        background: "#0a1828",
        border: `1px solid ${hover ? tier.color + "55" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12,
        padding: 0,
        cursor: "pointer",
        transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms, box-shadow 220ms",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? `0 14px 34px -18px ${tier.glow}` : "0 2px 8px -4px rgba(0,0,0,0.4)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left accent rail */}
      <div
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${tier.color}, ${stressC})`,
        }}
      />
      <div style={{ padding: sizes.pad, paddingLeft: sizes.pad + 6 }}>
        {/* Row 1: OVR + name */}
        <div style={{ display: "flex", alignItems: "center", gap: sizes.pad }}>
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: sizes.ovrSize,
              lineHeight: 0.85,
              color: tier.color,
              fontWeight: 700,
              minWidth: sizes.ovrSize * 0.9,
              textShadow: `0 0 14px ${tier.glow}`,
            }}
          >
            <Ticker value={player.ovr} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
                #{player.jersey}
              </span>
              <span style={{ color: "#27486f", fontSize: 9 }}>·</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: tier.color }}>
                {player.slot}
              </span>
              <span style={{ color: "#27486f", fontSize: 9 }}>·</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {archetype}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                fontSize: sizes.nameSize + 3,
                lineHeight: 1.05,
                color: "#f5f7fb",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                fontWeight: 700,
              }}
            >
              {player.display_name}
            </div>
          </div>
        </div>

        {/* Row 2: sparkline */}
        <div style={{ marginTop: sizes.pad - 2, marginBottom: sizes.pad - 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
              STRESS · 12W
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: stressC }}>
              {(player.stress * 100).toFixed(0)}
            </span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 28 }} aria-hidden>
            <polyline
              points={sparkPoints}
              fill="none"
              stroke={stressC}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={`${sparkPoints} 100,100 0,100`}
              fill={stressC}
              fillOpacity="0.12"
            />
          </svg>
        </div>

        {/* Row 3: stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: sizes.pad - 4 }}>
          {statItems.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd", display: "block", marginBottom: 2 }}>
                {s.label}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 18,
                  color: qualityColor(s.v),
                  fontWeight: 700,
                }}
              >
                <Ticker value={s.v * 99} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}
