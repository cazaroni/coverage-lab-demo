import { brandThemeV1 } from "@projectedge/schemas";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const t = await getTranslations("Landing");

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(55,208,182,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(247,185,85,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,34,56,0.96),rgba(7,17,29,0.94))] p-6 shadow-[0_24px_60px_rgba(2,8,19,0.42)] sm:p-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <BrandMark surface="app" />
              <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.2em]">
                {t("eyebrow")}
              </Badge>
            </div>
            <div className="flex max-w-3xl flex-col gap-5">
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.06em] text-foreground sm:text-7xl">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t("description")}
              </p>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
                {t("featureOne")}
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
                {t("featureTwo")}
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
                {t("featureThree")}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                prefetch={false}
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
              >
                {t("primaryCta")}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link
                href="/sign-in"
                prefetch={false}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "rounded-full",
                )}
              >
                {t("secondaryCta")}
              </Link>
              <Link
                href="/sign-up"
                prefetch={false}
                className={cn(
                  buttonVariants({ size: "lg", variant: "ghost" }),
                  "rounded-full",
                )}
              >
                {t("signUpCta")}
              </Link>
            </div>
          </div>
        </section>

        <Card className="border-white/10 bg-card/90 shadow-[0_24px_60px_rgba(2,8,19,0.42)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-3xl uppercase tracking-[0.12em]">
              <ShieldCheckIcon />
              Phase 0
            </CardTitle>
            <CardDescription>
              {brandThemeV1.product.name} for product chrome. {brandThemeV1.company.name} for auth and account surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
              <span className="block text-sm uppercase tracking-[0.22em] text-primary">
                Product
              </span>
              <span className="mt-2 block font-heading text-3xl uppercase tracking-[0.12em] text-foreground">
                {brandThemeV1.product.name}
              </span>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
              <span className="block text-sm uppercase tracking-[0.22em] text-primary">
                Company
              </span>
              <span className="mt-2 block text-lg text-foreground">
                {brandThemeV1.company.name}
              </span>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-muted-foreground">
              The internal repository codename stays out of user-facing copy.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
