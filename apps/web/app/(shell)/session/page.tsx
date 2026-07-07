import { getTranslations } from "next-intl/server";

import { SessionSurface } from "@/components/session-surface";
import { requireActiveTeamSession, toSessionContextEcho } from "@/lib/session";

export const metadata = {
  title: "Session",
};

export default async function SessionPage() {
  const session = await requireActiveTeamSession();
  const t = await getTranslations("Session");
  const contract = toSessionContextEcho(session);

  return (
    <SessionSurface
      contractRows={Object.entries(contract).map(([label, value]) => ({
        label,
        value: value ?? "null",
      }))}
      detailRows={[
        {
          label: "organization_name",
          value: session.organizationName ?? "null",
        },
        {
          label: "organization_slug",
          value: session.organizationSlug ?? "null",
        },
        {
          label: "source",
          value: session.isMock ? "frontend e2e fixture" : "Clerk auth() + active organization",
        },
      ]}
      notes={[
        "This surface renders the backend-owned SessionContext field names directly.",
        "Exactly one active team context is required before the shell or session route can render.",
        "The route is intentionally limited to auth and naming validation for Phase 0.",
      ]}
      subtitle={t("description")}
      title={t("title")}
    />
  );
}
