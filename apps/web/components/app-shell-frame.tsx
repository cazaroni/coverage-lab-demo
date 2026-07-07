"use client";

import type { ReactNode } from "react";

import { brandThemeV1 } from "@projectedge/schemas";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

type AppShellFrameProps = {
  accountSlot?: ReactNode;
  children: ReactNode;
  navItems: NavItem[];
  teamId: string;
  teamName: string;
};

export function AppShellFrame({
  accountSlot,
  children,
  navItems,
  teamId,
  teamName,
}: AppShellFrameProps) {
  const pathname = usePathname();
  const teamInitials = teamName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(55,208,182,0.18),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(247,185,85,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-card/90 p-4 shadow-[0_24px_60px_rgba(2,8,19,0.38)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="flex items-center justify-between gap-3">
                <BrandMark surface="app" />
                <div className="flex items-center gap-2 xl:hidden">{accountSlot}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <Avatar className="size-10 border border-white/10 bg-white/5">
                    <AvatarFallback>{teamInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{teamName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{teamId}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[0.72rem] uppercase tracking-[0.2em]">
                  {brandThemeV1.product.shortName}
                </Badge>
              </div>
            </div>
            <div className="hidden items-center gap-3 xl:flex">{accountSlot}</div>
          </div>
          <Separator className="my-4 bg-white/10" />
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "border-primary/40 bg-primary/12 text-foreground"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 py-6">{children}</main>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-white/8 bg-white/5 px-4 py-3 text-sm text-muted-foreground">
          <span>{brandThemeV1.product.name}</span>
          <span>{brandThemeV1.company.name}</span>
        </footer>
      </div>
    </div>
  );
}
