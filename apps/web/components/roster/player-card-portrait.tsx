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

function StatBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${w * 100}%`,
          background: color,
          transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </div>
  );
}

function FieldStripes({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 240"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, opacity }}
      aria-hidden
    >
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#f5f7fb" strokeWidth="1" strokeDasharray="2 6" />
      ))}
    </svg>
  );
}

const SIZES = {
  compact:  { pad: 10, heroH: 86,  ovrSize: 34, nameSize: 13, statSize: 10, gap: 6 },
  comfy:    { pad: 14, heroH: 120, ovrSize: 44, nameSize: 15, statSize: 11, gap: 8 },
  showcase: { pad: 18, heroH: 160, ovrSize: 56, nameSize: 18, statSize: 12, gap: 10 },
};

export function PlayerCardPortrait({ player, onClick, density = "comfy" }: Props) {
  const tier = ovrTier(player.ovr);
  const archetype = playerArchetype(player);
  const stressC = stressColor(player.stress);
  const [hover, setHover] = useState(false);
  const sizes = SIZES[density];

  const statItems = [
    { label: "COMP", v: 1 - player.stress, color: qualityColor(1 - player.stress) },
    { label: "COH",  v: player.dci,         color: qualityColor(player.dci) },
    { label: "RES",  v: player.resilience,  color: qualityColor(player.resilience) },
  ];

  return (
    <button
      onClick={() => onClick(player)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        textAlign: "left",
        background: "linear-gradient(180deg, #102238 0%, #0a1828 100%)",
        border: `1px solid ${hover ? tier.color + "55" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16,
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms, box-shadow 220ms",
        transform: hover ? "translateY(-4px) scale(1.015)" : "none",
        boxShadow: hover
          ? `0 18px 40px -16px ${tier.glow}, 0 0 0 1px ${tier.color}33`
          : "0 4px 14px -8px rgba(0,0,0,0.6)",
        width: "100%",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${tier.color}, ${stressC})` }} />

      {/* Hero section */}
      <div
        style={{
          position: "relative",
          height: sizes.heroH,
          background: `radial-gradient(ellipse at 30% 40%, ${tier.color}1a 0%, transparent 60%), linear-gradient(135deg, #163252 0%, #07111d 100%)`,
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <FieldStripes opacity={0.1} />
        {/* Huge jersey number */}
        <div
          style={{
            position: "absolute",
            right: -8,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
            fontSize: sizes.heroH * 1.15,
            lineHeight: 0.85,
            fontWeight: 900,
            color: "#f5f7fb",
            opacity: 0.92,
            letterSpacing: "-0.02em",
            textShadow: `0 2px 24px ${tier.glow}`,
            pointerEvents: "none",
          }}
        >
          {player.jersey}
        </div>
        {/* OVR badge */}
        <div
          style={{
            position: "absolute",
            top: sizes.pad,
            left: sizes.pad,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
              fontSize: sizes.ovrSize,
              lineHeight: 0.9,
              color: tier.color,
              fontWeight: 700,
              textShadow: `0 0 16px ${tier.glow}`,
            }}
          >
            <Ticker value={player.ovr} />
          </div>
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: 8,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: tier.color,
              marginTop: 2,
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {archetype}
          </span>
        </div>
        {/* Position chip */}
        <div
          style={{
            position: "absolute",
            top: sizes.pad,
            right: sizes.pad,
            padding: "4px 8px",
            borderRadius: 999,
            background: "rgba(7, 17, 29, 0.7)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#f5f7fb",
            }}
          >
            {player.slot}
          </span>
        </div>
      </div>

      {/* Name + stats */}
      <div style={{ padding: sizes.pad }}>
        <div
          style={{
            fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
            fontSize: sizes.nameSize + 4,
            lineHeight: 1.05,
            color: "#f5f7fb",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {player.display_name}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: sizes.gap, marginTop: sizes.gap + 4 }}>
          {statItems.map((s, i) => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: sizes.statSize - 2,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#aac0dd",
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                    fontSize: sizes.statSize + 3,
                    color: s.color,
                    fontWeight: 700,
                  }}
                >
                  <Ticker value={s.v * 99} />
                </span>
              </div>
              <StatBar value={s.v} color={s.color} delay={80 + i * 90} />
            </div>
          ))}
        </div>

        {/* Footer strip */}
        <div
          style={{
            marginTop: sizes.gap + 6,
            paddingTop: sizes.gap + 2,
            borderTop: "1px dashed rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                fontSize: 11,
                color: "#aac0dd",
                padding: "2px 6px",
                background: "rgba(22, 50, 82, 0.8)",
                borderRadius: 4,
                letterSpacing: "0.05em",
                fontWeight: 700,
              }}
            >
              {player.team_id}
            </span>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 8,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#aac0dd",
              }}
            >
              {player.plays} SNAPS
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: stressC,
                boxShadow: `0 0 6px ${stressC}`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 8,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#aac0dd",
              }}
            >
              STRESS {(player.stress * 100).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
