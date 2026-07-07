export function dciAccentClass(dci: number | null): string {
  if (dci === null) return "text-muted-foreground";
  if (dci >= 0.8) return "text-primary";
  if (dci >= 0.6) return "text-chart-2";
  if (dci >= 0.4) return "text-foreground";
  return "text-muted-foreground";
}

export function disAccentClass(dis: number | null): string {
  if (dis === null) return "text-muted-foreground";
  if (dis >= 0.5) return "text-destructive";
  if (dis >= 0.35) return "text-orange-400";
  if (dis >= 0.2) return "text-chart-2";
  return "text-primary";
}

export function dciLabel(dci: number | null): string {
  if (dci === null) return "—";
  if (dci >= 0.85) return "Tight coverage";
  if (dci >= 0.7) return "Above archetype";
  if (dci >= 0.5) return "Moderate coverage";
  if (dci >= 0.3) return "Coverage stress";
  return "Coverage breakdown";
}

export function disLabel(dis: number | null): string {
  if (dis === null) return "—";
  if (dis < 0.2) return "Structurally intact";
  if (dis < 0.4) return "Moderate drift";
  if (dis < 0.6) return "Structural stress";
  return "Collapse detected";
}
