import type { ReactNode } from "react";

import { brandThemeV1 } from "@projectedge/schemas";

import { BrandMark } from "@/components/brand-mark";

type AuthSurfaceFrameProps = {
  description: string;
  eyebrow: string;
  footerNote: string;
  panelSlot: ReactNode;
  title: string;
};

export function AuthSurfaceFrame({
  description,
  eyebrow,
  footerNote,
  panelSlot,
  title,
}: AuthSurfaceFrameProps) {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(55,208,182,0.18),transparent_28%),radial-gradient(circle_at_85%_14%,rgba(247,185,85,0.12),transparent_24%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,56,0.96),rgba(9,18,31,0.94))] p-6 shadow-[0_24px_60px_rgba(2,8,19,0.42)]">
          <div className="flex flex-col gap-8">
            <BrandMark surface="auth" />
            <div className="flex flex-col gap-4">
              <span className="text-sm uppercase tracking-[0.22em] text-primary">
                {eyebrow}
              </span>
              <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-foreground">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/8 bg-white/5 px-4 py-4 text-sm text-muted-foreground">
            {footerNote}
          </div>
        </section>
        <section className="flex items-center justify-center rounded-[2rem] border border-white/10 bg-card/90 p-4 shadow-[0_24px_60px_rgba(2,8,19,0.42)]">
          {panelSlot}
        </section>
      </div>
      <div className="sr-only">{brandThemeV1.company.name}</div>
    </main>
  );
}
