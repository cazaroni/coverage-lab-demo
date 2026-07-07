import { cn } from "@/lib/utils";

type Props = {
  apiBase: string;
  body: string;
  className?: string;
  title: string;
};

export function BackendUnavailableCallout({
  apiBase,
  body,
  className,
  title,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-50/90",
        className,
      )}
    >
      <p className="font-heading text-base font-semibold uppercase tracking-[0.08em] text-amber-100">
        {title}
      </p>
      <p className="mt-1 leading-6 text-amber-50/75">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-amber-100/75">
        <span className="rounded-md border border-amber-400/20 bg-black/10 px-2 py-1 font-mono">
          API base {apiBase}
        </span>
        <span className="rounded-md border border-amber-400/20 bg-black/10 px-2 py-1 font-mono">
          Root start pnpm dev
        </span>
        <span className="rounded-md border border-amber-400/20 bg-black/10 px-2 py-1 font-mono">
          Alt dev.bat / ./dev.sh
        </span>
      </div>
    </div>
  );
}
