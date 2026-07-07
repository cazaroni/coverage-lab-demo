export function stressColor(stress: number): string {
  if (stress >= 0.8) return "#f36f6f";
  if (stress >= 0.6) return "#f97316";
  if (stress >= 0.4) return "#f7b955";
  return "#37d0b6";
}

export function qualityColor(score: number): string {
  if (score >= 0.8) return "#37d0b6";
  if (score >= 0.65) return "#7dd3c0";
  if (score >= 0.5) return "#f7b955";
  return "#f97316";
}

export type OvrTier = { color: string; glow: string };

export function ovrTier(ovr: number): OvrTier {
  if (ovr >= 88) return { color: "#37d0b6", glow: "rgba(55, 208, 182, 0.35)" };
  if (ovr >= 80) return { color: "#f7b955", glow: "rgba(247, 185, 85, 0.30)" };
  if (ovr >= 70) return { color: "#aac0dd", glow: "rgba(170, 192, 221, 0.20)" };
  return { color: "#f97316", glow: "rgba(249, 115, 22, 0.25)" };
}

export function ovrFormula(
  avgNodeStress: number,
  resilienceScore: number,
  avgDis: number | null,
): number {
  const dis = avgDis ?? 0.5;
  const v = Math.round(((1 - avgNodeStress) * 0.45 + resilienceScore * 0.35 + dis * 0.2) * 99) + 1;
  return Math.min(v, 99);
}

type ArchetypePlayer = {
  position: string;
  slot: string;
  stress: number;
  dci: number;
  dis: number;
  resilience: number;
};

export function playerArchetype(p: ArchetypePlayer): string {
  const group = ["DE", "DT", "NT"].includes(p.position)
    ? "DL"
    : ["OLB", "MLB", "ILB", "LB"].includes(p.position)
      ? "LB"
      : ["CB", "SS", "FS", "S"].includes(p.position)
        ? "DB"
        : "OTHER";

  const composure = 1 - p.stress;

  if (group === "DL") {
    if (p.position === "DE") return composure > 0.68 ? "EDGE RUSHER" : "EDGE SETTER";
    return p.dis > 0.78 ? "RUN ANCHOR" : "INTERIOR DISRUPTOR";
  }
  if (group === "LB") {
    if (p.slot === "MIKE") return "FIELD GENERAL";
    if (p.slot === "SAM") return "STRONG-SIDE ENFORCER";
    if (p.slot === "WILL") return p.dci > 0.7 ? "PURSUIT BACKER" : "WEAK-SIDE BLITZER";
    return "LINEBACKER";
  }
  if (group === "DB") {
    if (p.position === "CB") return p.resilience > 0.78 ? "SHUTDOWN CORNER" : "ZONE CORNER";
    if (p.position === "SS") return p.dis > 0.8 ? "BOX SAFETY" : "ROVER";
    if (p.position === "FS") return composure > 0.7 ? "CENTER FIELDER" : "DEEP HALF";
    return "DEFENSIVE BACK";
  }
  return p.position;
}
