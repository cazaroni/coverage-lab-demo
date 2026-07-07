import type { ReactNode } from "react";

import { ArrowRightIcon, CheckCircle2Icon, ShieldIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type TeamMembershipOption = {
  id: string;
  name: string;
  role: string | null;
  slug: string | null;
};

type TeamContextPanelProps = {
  actionLabel: string;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  isAutoResolving: boolean;
  isLoading: boolean;
  managementSlot?: ReactNode;
  memberships: TeamMembershipOption[];
  onSelect?: (organizationId: string) => void;
  pendingId?: string | null;
  roleLabel: string;
  title: string;
};

export function TeamContextPanel({
  actionLabel,
  description,
  emptyDescription,
  emptyTitle,
  isAutoResolving,
  isLoading,
  managementSlot,
  memberships,
  onSelect,
  pendingId,
  roleLabel,
  title,
}: TeamContextPanelProps) {
  return (
    <Card className="border-white/10 bg-card/95 shadow-[0_24px_60px_rgba(2,8,19,0.42)]">
      <CardHeader>
        <CardTitle className="font-heading text-2xl uppercase tracking-[0.12em]">
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-3xl bg-white/10" />
            <Skeleton className="h-24 rounded-3xl bg-white/10" />
          </>
        ) : null}

        {!isLoading && isAutoResolving ? (
          <div className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/8 px-4 py-4 text-sm text-foreground">
            <CheckCircle2Icon className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">Activating your only team</span>
              <span className="text-muted-foreground">
                Coverage Lab found a single membership and is setting it active now.
              </span>
            </div>
          </div>
        ) : null}

        {!isLoading && !isAutoResolving && memberships.length > 0
          ? memberships.map((membership) => {
              const initials = membership.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Card key={membership.id} className="border-white/8 bg-white/5">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 border border-white/10 bg-white/8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <CardTitle className="text-lg">{membership.name}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {membership.slug ?? membership.id}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="w-fit rounded-full px-3 py-1 uppercase tracking-[0.18em]"
                      >
                        {membership.role ?? "member"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldIcon />
                      <span>
                        {roleLabel}: {membership.role ?? "member"}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      disabled={!onSelect || pendingId === membership.id}
                      onClick={() => onSelect?.(membership.id)}
                    >
                      <ArrowRightIcon data-icon="inline-end" />
                      {pendingId === membership.id ? "Activating..." : actionLabel}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          : null}

        {!isLoading && !isAutoResolving && memberships.length === 0 ? (
          <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground">{emptyTitle}</span>
              <span className="text-sm text-muted-foreground">{emptyDescription}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3">
        {managementSlot}
      </CardFooter>
    </Card>
  );
}
