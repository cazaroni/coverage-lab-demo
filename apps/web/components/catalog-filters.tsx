"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  games: string[];
  labels: {
    filterGame: string;
    filterSeason: string;
    filterWeek: string;
    filterMinDci: string;
    filterMaxDci: string;
    clearFilters: string;
  };
};

export function CatalogFilters({ games, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  const hasFilters = searchParams.toString() !== "";

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Catalog filters"
    >
      {/* Game filter */}
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {labels.filterGame}
        </span>
        <select
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={searchParams.get("game_id") ?? ""}
          onChange={(e) => setParam("game_id", e.target.value)}
        >
          <option value="">All games</option>
          {games.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      {/* Min DCI */}
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {labels.filterMinDci}
        </span>
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="0.00"
          value={searchParams.get("min_dci") ?? ""}
          onChange={(e) => setParam("min_dci", e.target.value)}
        />
      </label>

      {/* Max DCI */}
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {labels.filterMaxDci}
        </span>
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="1.00"
          value={searchParams.get("max_dci") ?? ""}
          onChange={(e) => setParam("max_dci", e.target.value)}
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "self-end text-muted-foreground hover:text-foreground",
          )}
        >
          {labels.clearFilters}
        </button>
      )}
    </form>
  );
}
