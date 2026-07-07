import { brandThemeV1 } from "@projectedge/schemas";
import { getTranslations } from "next-intl/server";

import { AuthSurfaceFrame } from "@/components/auth-surface-frame";

export const metadata = {
  title: "Enter demo",
};

// Public portfolio demo: no real auth. The button hits the e2e sign-in route,
// which sets the bypass cookie and redirects into the app. Works whether or not
// showcase mode is on, and needs no Clerk keys.
function DemoAccessPanel() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[1.5rem] border border-white/8 bg-white/5 p-8 text-center">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
          Demo access
        </span>
        <h2 className="font-heading text-2xl uppercase tracking-[0.08em] text-foreground">
          No sign-up required
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This is a public portfolio demo. Click below to enter a live team
          workspace loaded with sample analytics — no account, no credentials.
        </p>
      </div>
      <a
        href="/api/e2e/sign-in?returnTo=/app"
        className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
      >
        Enter demo →
      </a>
    </div>
  );
}

export default async function SignInPage() {
  const t = await getTranslations("Auth");

  return (
    <AuthSurfaceFrame
      description={t("signInDescription")}
      eyebrow={brandThemeV1.product.name}
      footerNote="Coverage Lab — a football analytics demo. No credentials are collected."
      panelSlot={<DemoAccessPanel />}
      title={t("signInTitle")}
    />
  );
}
