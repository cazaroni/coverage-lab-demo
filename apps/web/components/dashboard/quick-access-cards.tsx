"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  labels: {
    rosterLabel: string;
    rosterSub: string;
    replayLabel: string;
    replaySub: string;
  };
};

export function QuickAccessCards({ labels }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cards = [
    { k: "roster", href: "/roster", color: "#37d0b6", icon: "⬡", label: labels.rosterLabel, sub: labels.rosterSub },
    { k: "replay", href: "/drives", color: "#f7b955", icon: "▶", label: labels.replayLabel, sub: labels.replaySub },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
      }}
    >
      {cards.map((card) => {
        const isHov = hovered === card.k;
        return (
          <Link
            key={card.k}
            href={card.href}
            prefetch={false}
            onMouseEnter={() => setHovered(card.k)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "block",
              textDecoration: "none",
              padding: 22,
              borderRadius: 18,
              background: "linear-gradient(135deg, #102238 0%, #07111d 100%)",
              border: `1px solid ${isHov ? card.color + "55" : "rgba(255,255,255,0.06)"}`,
              transform: isHov ? "translateY(-3px)" : "none",
              transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: isHov ? `0 14px 34px -14px ${card.color}44` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${card.color}22`,
                  border: `1px solid ${card.color}44`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 22,
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-rajdhani, 'Bebas Neue', Impact, sans-serif)",
                    fontSize: 20,
                    color: "#f5f7fb",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    lineHeight: 1.2,
                  }}
                >
                  {card.label}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-plex-mono, monospace)",
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#aac0dd",
                  }}
                >
                  {card.sub}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
