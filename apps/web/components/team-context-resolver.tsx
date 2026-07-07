"use client";

import { CreateOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import {
  TeamContextPanel,
  type TeamMembershipOption,
} from "@/components/team-context-panel";

type TeamContextResolverProps = {
  returnTo: string;
};

export function TeamContextResolver({
  returnTo,
}: TeamContextResolverProps) {
  const t = useTranslations("TeamContext");
  const router = useRouter();
  const hasAutoResolved = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });

  const memberships = useMemo<TeamMembershipOption[]>(
    () =>
      userMemberships.data?.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role ?? null,
        slug: membership.organization.slug ?? null,
      })) ?? [],
    [userMemberships.data],
  );

  useEffect(() => {
    if (
      !isLoaded ||
      !setActive ||
      memberships.length !== 1 ||
      hasAutoResolved.current
    ) {
      return;
    }

    hasAutoResolved.current = true;
    const onlyMembership = memberships[0];
    setPendingId(onlyMembership.id);

    startTransition(() => {
      void setActive({ organization: onlyMembership.id }).then(() => {
        router.replace(returnTo);
        router.refresh();
      });
    });
  }, [isLoaded, memberships, returnTo, router, setActive]);

  function handleSelect(organizationId: string) {
    if (!setActive) {
      return;
    }

    setPendingId(organizationId);

    startTransition(() => {
      void setActive({ organization: organizationId }).then(() => {
        router.replace(returnTo);
        router.refresh();
      });
    });
  }

  return (
    <TeamContextPanel
      actionLabel={t("selectCta")}
      description={t("description")}
      emptyDescription={t("emptyDescription")}
      emptyTitle={t("emptyTitle")}
      isAutoResolving={isLoaded && memberships.length === 1}
      isLoading={!isLoaded}
      managementSlot={
        memberships.length === 0 ? (
          <CreateOrganization
            afterCreateOrganizationUrl={returnTo}
            path="/team/select"
            routing="path"
            skipInvitationScreen
          />
        ) : null
      }
      memberships={memberships}
      onSelect={handleSelect}
      pendingId={pendingId}
      roleLabel={t("roleLabel")}
      title={t("title")}
    />
  );
}
