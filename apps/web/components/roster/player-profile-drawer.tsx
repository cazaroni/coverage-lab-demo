"use client";

import { useEffect, useRef, useState } from "react";

import { PlayerRadarChart } from "@/components/roster/player-radar-chart";
import { StressTrendSparkline } from "@/components/roster/stress-trend-sparkline";
import { ovrTier, playerArchetype, stressColor } from "@/lib/stress-colors";
import type { RosterPlayer } from "@/lib/roster-types";

type Props = {
  player: RosterPlayer;
  onClose: () => void;
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

function FieldStripes({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 240"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}
      aria-hidden
    >
      {[40, 80, 120, 160, 200].map((y) => (
        <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#f5f7fb" strokeWidth="1" strokeDasharray="2 6" />
      ))}
    </svg>
  );
}

export function PlayerProfileDrawer({ player, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 240);
  };

  const tier = ovrTier(player.ovr);
  const stressC = stressColor(player.stress);
  const archetype = playerArchetype(player);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(7, 17, 29, 0.72)",
          backdropFilter: "blur(6px)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 240ms ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "relative",
          width: "min(560px, 100vw)",
          height: "100%",
          background: "linear-gradient(180deg, #0f2138 0%, #07111d 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px -20px rgba(0,0,0,0.8)",
          overflowY: "auto",
          transform: mounted ? "translateX(0)" : "translateX(40px)",
          opacity: mounted ? 1 : 0,
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "relative",
            padding: "22px 24px 28px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: `
              radial-gradient(ellipse at 90% 10%, ${tier.color}14 0%, transparent 50%),
              linear-gradient(180deg, #163252 0%, transparent 100%)
            `,
            overflow: "hidden",
          }}
        >
          <FieldStripes />
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(7, 17, 29, 0.7)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f5f7fb",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            ✕
          </button>

          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
            {player.team_id} · {player.slot} · #{player.jersey} · {archetype}
          </span>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 12 }}>
            {/* Jersey tile */}
            <div
              style={{
                position: "relative",
                width: 96,
                height: 96,
                borderRadius: 16,
                background: `
                  radial-gradient(circle at 30% 30%, ${tier.color}2a, transparent 60%),
                  linear-gradient(135deg, #163252, #07111d)
                `,
                border: `1px solid ${tier.color}44`,
                overflow: "hidden",
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 72,
                  color: "#f5f7fb",
                  textShadow: `0 0 18px ${tier.glow}`,
                  lineHeight: 1,
                  fontWeight: 900,
                }}
              >
                {player.jersey}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 36,
                  lineHeight: 1,
                  color: "#f5f7fb",
                  textTransform: "uppercase",
                  letterSpacing: "0.01em",
                  fontWeight: 700,
                }}
              >
                {player.display_name}
              </div>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd", marginTop: 6, display: "block" }}>
                {player.position} · {player.games} GAMES · {player.plays} SNAPS
              </span>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                  fontSize: 64,
                  lineHeight: 0.85,
                  color: tier.color,
                  fontWeight: 700,
                  textShadow: `0 0 18px ${tier.glow}`,
                }}
              >
                <Ticker value={player.ovr} />
              </div>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: tier.color, marginTop: 4, display: "block" }}>
                OVR · COMPOSITE
              </span>
            </div>
          </div>
        </div>

        {/* Attribute Radar */}
        <section style={{ padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 3, height: 16, background: "#37d0b6", borderRadius: 2, display: "inline-block" }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f5f7fb" }}>
              ATTRIBUTE PROFILE
            </span>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <PlayerRadarChart player={player} size={340} />
          </div>
        </section>

        {/* Stress Trend */}
        <section style={{ padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 3, height: 16, background: "#37d0b6", borderRadius: 2, display: "inline-block" }} />
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f5f7fb" }}>
                NODE STRESS · WEEKLY
              </span>
            </div>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: stressC }}>
              AVG {(player.stress * 100).toFixed(1)}
            </span>
          </div>
          <StressTrendSparkline trend={player.trend} color={stressC} height={100} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>W1</span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>W12</span>
          </div>
        </section>

        {/* Top Stress Events */}
        <section style={{ padding: "22px 24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 3, height: 16, background: "#f7b955", borderRadius: 2, display: "inline-block" }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f5f7fb" }}>
              TOP STRESS EVENTS
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {player.events.map((ev, i) => {
              const rankColor = i === 0 ? "#f7b955" : "#aac0dd";
              const evStressColor = stressColor(ev.peak_stress);
              return (
                <div
                  key={ev.play_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: "rgba(22, 50, 82, 0.35)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                      fontSize: 22,
                      color: rankColor,
                      textAlign: "center",
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)", fontSize: 14, color: "#f5f7fb", letterSpacing: "0.02em", fontWeight: 700 }}>
                      VS {ev.opponent} · Q{ev.quarter}
                    </div>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd", marginTop: 2, display: "block" }}>
                      {ev.play_id}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd", display: "block" }}>GAIN</span>
                    <div style={{ fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)", fontSize: 16, color: "#f5f7fb", fontWeight: 700 }}>
                      {ev.yards_allowed}y
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: evStressColor + "22",
                      border: `1px solid ${evStressColor}55`,
                    }}
                  >
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: evStressColor }}>
                      {(ev.peak_stress * 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
