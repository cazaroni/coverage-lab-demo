import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  E2E_AUTH_COOKIE,
  e2eSessionFixture,
  isE2EAuthBypassEnabled,
  isShowcaseMode,
} from "@/lib/e2e-auth";

export type ResolvedSessionContext = {
  activeTeamId: string | null;
  isMock: boolean;
  organizationName: string | null;
  organizationSlug: string | null;
  role: string | null;
  sessionId: string | null;
  userId: string;
};

export const getResolvedSessionContext = cache(
  async (): Promise<ResolvedSessionContext | null> => {
    if (isShowcaseMode()) {
      return {
        activeTeamId: e2eSessionFixture.activeTeamId,
        isMock: true,
        organizationName: e2eSessionFixture.organizationName,
        organizationSlug: e2eSessionFixture.organizationSlug,
        role: e2eSessionFixture.role,
        sessionId: e2eSessionFixture.sessionId,
        userId: e2eSessionFixture.userId,
      };
    }

    const cookieStore = await cookies();
    const bypassCookie = cookieStore.get(E2E_AUTH_COOKIE)?.value;

    if (isE2EAuthBypassEnabled() && bypassCookie === "1") {
      return {
        activeTeamId: e2eSessionFixture.activeTeamId,
        isMock: true,
        organizationName: e2eSessionFixture.organizationName,
        organizationSlug: e2eSessionFixture.organizationSlug,
        role: e2eSessionFixture.role,
        sessionId: e2eSessionFixture.sessionId,
        userId: e2eSessionFixture.userId,
      };
    }

    const { orgId, orgRole, sessionId, userId } = await auth();

    if (!userId) {
      return null;
    }

    if (!orgId) {
      return {
        activeTeamId: null,
        isMock: false,
        organizationName: null,
        organizationSlug: null,
        role: orgRole ?? null,
        sessionId: sessionId ?? null,
        userId,
      };
    }

    const client = await clerkClient();
    const organization = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    return {
      activeTeamId: orgId,
      isMock: false,
      organizationName: organization.name,
      organizationSlug: organization.slug ?? null,
      role: orgRole ?? null,
      sessionId: sessionId ?? null,
      userId,
    };
  },
);

export async function requireSignedInSession() {
  const session = await getResolvedSessionContext();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireActiveTeamSession(): Promise<
  ResolvedSessionContext & { activeTeamId: string }
> {
  const session = await requireSignedInSession();

  if (!session.activeTeamId) {
    redirect("/team/select");
  }

  return {
    ...session,
    activeTeamId: session.activeTeamId,
  };
}

export function toSessionContextEcho(session: ResolvedSessionContext) {
  return {
    active_team_id: session.activeTeamId,
    role: session.role,
    session_id: session.sessionId,
    user_id: session.userId,
  } as const;
}
