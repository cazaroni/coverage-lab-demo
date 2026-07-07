import { brandThemeV1 } from "@projectedge/schemas";
import { getTranslations } from "next-intl/server";

import { AppShellFrame } from "@/components/app-shell-frame";
import { Badge } from "@/components/ui/badge";
import { requireActiveTeamSession } from "@/lib/session";
import { isShowcaseMode } from "@/lib/e2e-auth";

export default async function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireActiveTeamSession();
  const t = await getTranslations("AppShell");
  const showcaseMode = isShowcaseMode();

  return (
    <AppShellFrame
      accountSlot={
        showcaseMode || session.isMock ? (
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 uppercase tracking-[0.2em]"
          >
            Showcase mode
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 uppercase tracking-[0.2em]"
          >
            Auth disabled
          </Badge>
        )
      }
      navItems={[
        { href: "/app", label: t("navDashboard") },
        { href: "/catalog", label: t("navCatalog") },
        { href: "/roster", label: t("navRoster") },
        { href: "/players", label: t("navPlayers") },
        { href: "/drives", label: t("navDrives") },
        { href: "/assistant", label: "Assistant" },
        { href: "/session", label: t("navSession") },
      ]}
      teamId={session.activeTeamId}
      teamName={session.organizationName ?? brandThemeV1.product.name}
    >
      {children}
    </AppShellFrame>
  );
}
