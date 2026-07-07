import {
  brandThemeV1,
  getBrandNameForSurface,
  type BrandSurface,
} from "@projectedge/schemas";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  surface: Extract<BrandSurface, "app" | "auth">;
};

export function BrandMark({ className, surface }: BrandMarkProps) {
  const primaryName = getBrandNameForSurface(surface);
  const secondaryName =
    surface === "app" ? brandThemeV1.company.name : brandThemeV1.product.name;
  const monogram = surface === "app" ? "EI" : "LS";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(55,208,182,0.9),rgba(247,185,85,0.85))] font-heading text-lg font-bold uppercase tracking-[0.24em] text-slate-950 shadow-[0_20px_60px_rgba(55,208,182,0.28)]">
        {monogram}
      </div>
      <div className="flex flex-col">
        <span className="font-heading text-lg font-semibold uppercase tracking-[0.2em] text-foreground">
          {primaryName}
        </span>
        <span className="text-sm text-muted-foreground">{secondaryName}</span>
      </div>
    </div>
  );
}
