import { brandThemeV1 } from "@projectedge/schemas";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { TeamContextResolver } from "@/components/team-context-resolver";
import { requireSignedInSession } from "@/lib/session";

export const metadata = {
  title: "Select Team",
};

export default async function TeamSelectionPage() {
  const session = await requireSignedInSession();
  const t = await getTranslations("TeamContext");

  if (session.activeTeamId) {
    redirect("/app");
  }

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(55,208,182,0.16),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(247,185,85,0.14),transparent_22%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,56,0.96),rgba(9,18,31,0.94))] p-6 shadow-[0_24px_60px_rgba(2,8,19,0.42)]">
          <div className="flex flex-col gap-8">
            <BrandMark surface="auth" />
            <div className="flex flex-col gap-4">
              <span className="text-sm uppercase tracking-[0.22em] text-primary">
                {brandThemeV1.company.name}
              </span>
              <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-foreground">
                {t("title")}
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {t("description")}
              </p>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/8 bg-white/5 px-4 py-4 text-sm text-muted-foreground">
            This handoff is where a signed-in user moves from account access into exactly one active team_id context.
          </div>
        </section>
        <TeamContextResolver returnTo="/app" />
      </div>
    </main>
  );
}
