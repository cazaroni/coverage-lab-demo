import type { PlayForensics } from "@projectedge/schemas";
import { dciLabel, disLabel, dciAccentClass, disAccentClass } from "@/lib/scoreLabels";

function MetricBar({
  label,
  value,
  barClass,
  caption,
}: {
  label: string;
  value: number;
  barClass: string;
  caption: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.48rem] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className={`font-mono text-xs tabular-nums ${barClass}`}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all ${barClass.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[0.42rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        {caption}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[0.45rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-xs text-foreground/80">{value}</dd>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-3">
      <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
      <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
        {children}
      </span>
    </div>
  );
}

export function CoverageAnalysisPanel({ forensics }: { forensics: PlayForensics }) {
  const { dci, dis, archetype_label, has_motion, peak_stress_frame, peak_stress_entity_id,
    peak_stress_value, collapse_window, plain_text_summary, model_version } = forensics;

  return (
    <details className="group rounded-xl border border-white/10 bg-card/90">
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div className="h-4 w-[3px] shrink-0 rounded-full bg-primary" />
        <span className="font-heading text-[0.8rem] font-bold uppercase tracking-[0.22em] text-foreground">
          Coverage Analysis
        </span>
        <span className="ml-auto font-mono text-[0.48rem] uppercase tracking-[0.15em] text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-white/8 px-5 pb-6 pt-5">
        {/* DCI / DIS bars */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricBar
            label="DCI — Defensive Coverage Index"
            value={dci}
            barClass={dciAccentClass(dci)}
            caption={dciLabel(dci)}
          />
          <MetricBar
            label="DIS — Defensive Integrity Score"
            value={dis}
            barClass={disAccentClass(dis)}
            caption={disLabel(dis)}
          />
        </div>

        {/* Archetype + peak stress */}
        <div>
          <SectionHeader>Structure breakdown</SectionHeader>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoRow label="Archetype" value={archetype_label} />
            {has_motion ? (
              <>
                <InfoRow
                  label="Peak stress frame"
                  value={peak_stress_frame != null ? String(peak_stress_frame) : "—"}
                />
                <InfoRow label="Peak stress player" value={peak_stress_entity_id ?? "—"} />
                <InfoRow
                  label="Peak stress value"
                  value={peak_stress_value != null ? peak_stress_value.toFixed(3) : "—"}
                />
                {collapse_window ? (
                  <InfoRow
                    label="Collapse window"
                    value={`frames ${collapse_window.start_frame}–${collapse_window.end_frame}`}
                  />
                ) : (
                  <InfoRow label="Collapse window" value="None detected" />
                )}
              </>
            ) : (
              <InfoRow label="Per-frame film" value="No tracking sample for this play" />
            )}
            <InfoRow label="Model version" value={model_version} />
          </dl>
        </div>

        {/* Plain text summary */}
        <div>
          <SectionHeader>Summary</SectionHeader>
          <p className="text-sm leading-relaxed text-foreground/75">{plain_text_summary}</p>
        </div>
      </div>
    </details>
  );
}
