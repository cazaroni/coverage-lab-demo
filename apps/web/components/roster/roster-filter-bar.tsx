"use client";

import { useMemo, useState } from "react";

import { FormationView } from "@/components/roster/formation-view";
import { PlayerCardPortrait } from "@/components/roster/player-card-portrait";
import { PlayerCardStat } from "@/components/roster/player-card-stat";
import { PlayerProfileDrawer } from "@/components/roster/player-profile-drawer";
import type { RosterPlayer } from "@/lib/roster-types";

type View = "grid" | "formation";
type Group = "ALL" | "DL" | "LB" | "DB";
type Sort = "ovr" | "stress" | "resilience" | "position";
type CardStyle = "portrait" | "stat";
type Density = "compact" | "comfy" | "showcase";

type Props = {
  players: RosterPlayer[];
  labels: {
    noPlayers: string;
  };
};

function groupOf(pos: string): string {
  if (["DE", "DT", "NT"].includes(pos)) return "DL";
  if (["OLB", "MLB", "ILB", "LB"].includes(pos)) return "LB";
  if (["CB", "SS", "FS", "S"].includes(pos)) return "DB";
  return "OTHER";
}

function PillBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: active ? "#37d0b6" : "rgba(22, 50, 82, 0.5)",
        color: active ? "#07111d" : "#aac0dd",
        border: `1px solid ${active ? "#37d0b6" : "rgba(255,255,255,0.06)"}`,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 9,
        letterSpacing: "0.2em",
        textTransform: "uppercase" as const,
        cursor: "pointer",
        transition: "all 180ms ease",
        fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  );
}

const GRID_COLS: Record<Density, string> = {
  compact:  "repeat(auto-fill, minmax(180px, 1fr))",
  comfy:    "repeat(auto-fill, minmax(230px, 1fr))",
  showcase: "repeat(auto-fill, minmax(290px, 1fr))",
};

export function RosterFilterBar({ players, labels }: Props) {
  const [view, setView] = useState<View>("grid");
  const [group, setGroup] = useState<Group>("ALL");
  const [sort, setSort] = useState<Sort>("ovr");
  const [cardStyle, setCardStyle] = useState<CardStyle>("portrait");
  const [density] = useState<Density>("comfy");
  const [selected, setSelected] = useState<RosterPlayer | null>(null);

  const filtered = useMemo(() => {
    let list = [...players];
    if (group !== "ALL") list = list.filter((p) => groupOf(p.position) === group);
    const sortFns: Record<Sort, (a: RosterPlayer, b: RosterPlayer) => number> = {
      ovr:        (a, b) => b.ovr - a.ovr,
      stress:     (a, b) => a.stress - b.stress,
      resilience: (a, b) => b.resilience - a.resilience,
      position:   (a, b) => a.position.localeCompare(b.position) || b.ovr - a.ovr,
    };
    return list.sort(sortFns[sort]);
  }, [players, group, sort]);

  const filterKey = `${cardStyle}-${density}-${group}-${sort}`;

  const views: { k: View; l: string }[] = [
    { k: "grid", l: "GRID" },
    { k: "formation", l: "FORMATION" },
  ];
  const groups: { k: Group; l: string }[] = [
    { k: "ALL", l: "ALL" },
    { k: "DL",  l: "DL" },
    { k: "LB",  l: "LB" },
    { k: "DB",  l: "DB" },
  ];
  const sorts: { k: Sort; l: string }[] = [
    { k: "ovr",        l: "OVR" },
    { k: "stress",     l: "STRESS" },
    { k: "resilience", l: "RES" },
    { k: "position",   l: "POS" },
  ];

  return (
    <>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "14px 20px",
          background: "rgba(16, 34, 56, 0.4)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
        }}
      >
        {/* View toggle */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "rgba(7, 17, 29, 0.6)",
            padding: 3,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {views.map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                background: view === v.k ? "#163252" : "transparent",
                color: view === v.k ? "#f5f7fb" : "#aac0dd",
                border: "none",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 180ms ease",
                fontWeight: view === v.k ? 600 : 400,
              }}
            >
              {v.l}
            </button>
          ))}
        </div>

        {view === "grid" && (
          <>
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
                UNIT
              </span>
              {groups.map((g) => (
                <PillBtn key={g.k} active={group === g.k} onClick={() => setGroup(g.k)}>
                  {g.l}
                </PillBtn>
              ))}
            </div>

            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
                SORT
              </span>
              {sorts.map((s) => (
                <PillBtn key={s.k} active={sort === s.k} onClick={() => setSort(s.k)}>
                  {s.l}
                </PillBtn>
              ))}
            </div>

            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
                STYLE
              </span>
              <PillBtn active={cardStyle === "portrait"} onClick={() => setCardStyle("portrait")}>
                PORTRAIT
              </PillBtn>
              <PillBtn active={cardStyle === "stat"} onClick={() => setCardStyle("stat")}>
                STAT
              </PillBtn>
            </div>
          </>
        )}

        <div style={{ marginLeft: "auto" }}>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aac0dd" }}>
            {filtered.length} ACTIVE
          </span>
        </div>
      </div>

      {/* Grid or Formation */}
      {view === "grid" ? (
        <div
          key={filterKey}
          style={{
            display: "grid",
            gridTemplateColumns: GRID_COLS[density],
            gap: 14,
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#aac0dd", fontFamily: "ui-monospace, monospace", fontSize: 12, padding: "40px 0" }}>
              {labels.noPlayers}
            </p>
          ) : (
            filtered.map((p, i) => (
              <div
                key={p.nfl_id}
                style={{
                  animation: `cardIn 500ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(i, 15) * 40}ms both`,
                }}
              >
                {cardStyle === "portrait" ? (
                  <PlayerCardPortrait player={p} onClick={setSelected} density={density} />
                ) : (
                  <PlayerCardStat player={p} onClick={setSelected} density={density} />
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <FormationView players={players} onSelect={setSelected} />
      )}

      {selected && (
        <PlayerProfileDrawer player={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
