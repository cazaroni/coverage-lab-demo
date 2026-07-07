'use client';

type LowerThirdProps = {
  headline?: string;
  subline?: string;
  visible?: boolean;
};

export function LowerThird({ headline, subline, visible = true }: LowerThirdProps) {
  if (!visible || !headline) return null;

  return (
    <div className="absolute bottom-10 left-3 z-20 flex flex-col gap-0.5">
      <div className="rounded bg-primary px-3 py-1">
        <span className="font-heading text-[0.75rem] font-bold uppercase tracking-wide text-primary-foreground">
          {headline}
        </span>
      </div>
      {subline && (
        <div className="rounded bg-[#07111d]/80 px-3 py-0.5">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.15em] text-foreground/70">
            {subline}
          </span>
        </div>
      )}
    </div>
  );
}
