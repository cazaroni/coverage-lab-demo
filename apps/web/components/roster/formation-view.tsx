"use client";

import { useState } from "react";

import { ovrTier, qualityColor, stressColor } from "@/lib/stress-colors";
import type { RosterPlayer } from "@/lib/roster-types";

const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  LDE:  { x: 0.18, y: 0.30 },
  LDT:  { x: 0.38, y: 0.28 },
  RDT:  { x: 0.58, y: 0.28 },
  RDE:  { x: 0.80, y: 0.30 },
  SAM:  { x: 0.22, y: 0.48 },
  MIKE: { x: 0.50, y: 0.50 },
  WILL: { x: 0.78, y: 0.48 },
  LCB:  { x: 0.10, y: 0.72 },
  RCB:  { x: 0.90, y: 0.72 },
  SS:   { x: 0.34, y: 0.82 },
  FS:   { x: 0.66, y: 0.88 },
};

type Props = {
  players: RosterPlayer[];
  onSelect: (player: RosterPlayer) => void;
};

export function FormationView({ players, onSelect }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #0a3828 0%, #0f5d43 45%, #0a3828 100%)",
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        aspectRatio: "16 / 9",
        width: "100%",
        maxHeight: "70vh",
      }}
    >
      {/* Field SVG */}
      <svg
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
          <line key={y} x1="2" y1={y * 0.56} x2="98" y2={y * 0.56} stroke="#f5f7fb" strokeOpacity="0.18" strokeWidth="0.18" />
        ))}
        <line x1="2" y1="28" x2="98" y2="28" stroke="#f5f7fb" strokeOpacity="0.35" strokeWidth="0.3" />
        {Array.from({ length: 30 }).map((_, i) => (
          <g key={i}>
            <line x1={3 + i * 3.2} y1="18" x2={3 + i * 3.2} y2="19" stroke="#f5f7fb" strokeOpacity="0.25" strokeWidth="0.15" />
            <line x1={3 + i * 3.2} y1="37" x2={3 + i * 3.2} y2="38" stroke="#f5f7fb" strokeOpacity="0.25" strokeWidth="0.15" />
          </g>
        ))}
        <rect x="0" y="0" width="100" height="6" fill="rgba(7,17,29,0.35)" />
        <text x="50" y="4.2" textAnchor="middle" style={{ fontSize: "2.2px", fill: "#f5f7fb", opacity: 0.4, fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)", letterSpacing: "0.3em" } as React.CSSProperties}>
          PHILADELPHIA
        </text>
        <line x1="2" y1="12" x2="98" y2="12" stroke="#f7b955" strokeOpacity="0.45" strokeWidth="0.2" strokeDasharray="1 1" />
      </svg>

      {/* LOS label */}
      <div
        style={{
          position: "absolute",
          top: "19.5%",
          left: 16,
          fontFamily: "ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "#f7b955",
          opacity: 0.7,
        }}
      >
        LOS ▸
      </div>

      {/* Players */}
      {players.map((p) => {
        const coords = SLOT_POSITIONS[p.slot.toUpperCase()];
        if (!coords) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[FormationView] Unknown slot: ${p.slot} for player ${p.display_name}`);
          }
          return null;
        }

        const x = coords.x * 100;
        const y = 10 + coords.y * 85;
        const size = 36 + p.resilience * 22;
        const color = stressColor(p.stress);
        const tier = ovrTier(p.ovr);
        const isHovered = hovered === p.nfl_id;

        return (
          <button
            key={p.nfl_id}
            onClick={() => onSelect(p)}
            onMouseEnter={() => setHovered(p.nfl_id)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${p.display_name}, ${p.slot}`}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) ${isHovered ? "scale(1.15)" : "scale(1)"}`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${color}ee 0%, ${color}99 70%)`,
              border: `2px solid ${isHovered ? "#f5f7fb" : tier.color}`,
              cursor: "pointer",
              transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms",
              boxShadow: isHovered
                ? `0 0 0 4px rgba(245, 247, 251, 0.15), 0 0 24px ${color}, 0 8px 20px rgba(0,0,0,0.4)`
                : `0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px ${color}55`,
              display: "grid",
              placeItems: "center",
              padding: 0,
              zIndex: isHovered ? 20 : 5,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                fontSize: size * 0.42,
                color: "#07111d",
                fontWeight: 900,
                lineHeight: 1,
                textShadow: "0 1px 0 rgba(245,247,251,0.3)",
              }}
            >
              {p.jersey}
            </span>

            {/* Slot label */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: 4,
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "ui-monospace, monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "#f5f7fb",
                opacity: isHovered ? 1 : 0.7,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {p.slot}
            </div>

            {/* Hover tooltip */}
            {isHovered && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 14px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 180,
                  background: "rgba(7, 17, 29, 0.96)",
                  border: `1px solid ${tier.color}66`,
                  borderRadius: 10,
                  padding: 10,
                  pointerEvents: "none",
                  boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${tier.color}33`,
                  zIndex: 50,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                      fontSize: 22,
                      color: tier.color,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    {p.ovr}
                  </span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, color: "#aac0dd", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    {p.slot}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                    fontSize: 13,
                    color: "#f5f7fb",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    fontWeight: 700,
                  }}
                >
                  {p.display_name}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 8,
                    color: "#aac0dd",
                    letterSpacing: "0.15em",
                  }}
                >
                  <span>STR <span style={{ color }}>{(p.stress * 100).toFixed(0)}</span></span>
                  <span>RES <span style={{ color: qualityColor(p.resilience) }}>{(p.resilience * 99).toFixed(0)}</span></span>
                </div>
              </div>
            )}
          </button>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          display: "flex",
          gap: 10,
          padding: "8px 12px",
          background: "rgba(7, 17, 29, 0.72)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 999,
          backdropFilter: "blur(6px)",
          alignItems: "center",
        }}
      >
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
          STRESS
        </span>
        {[
          { c: "#37d0b6", l: "<.4" },
          { c: "#f7b955", l: ".4" },
          { c: "#f97316", l: ".6" },
          { c: "#f36f6f", l: ".8+" },
        ].map((s) => (
          <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: s.c, display: "inline-block" }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, color: "#f5f7fb" }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Formation label */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 14,
          padding: "8px 14px",
          background: "rgba(7, 17, 29, 0.72)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 999,
          backdropFilter: "blur(6px)",
        }}
      >
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
          FORMATION{" "}
        </span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#37d0b6" }}>
          4-3 BASE
        </span>
      </div>
    </div>
  );
}
