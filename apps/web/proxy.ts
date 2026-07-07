import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  E2E_AUTH_COOKIE,
  isE2EAuthBypassEnabled,
  isShowcaseMode,
} from "@/lib/e2e-auth";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/session(.*)",
  "/team(.*)",
]);

const hasClerkKeys = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY,
);

// When no Clerk keys are configured (e.g. LHCI prod audit without real keys),
// skip Clerk entirely and allow all requests through. E2E bypass still works
// because protected routes rely only on the cookie check.
const middleware = isShowcaseMode() || !hasClerkKeys
  ? () => NextResponse.next()
  : clerkMiddleware(async (auth, req) => {
      const isBypassed =
        isE2EAuthBypassEnabled() && req.cookies.get(E2E_AUTH_COOKIE)?.value === "1";

      if (isProtectedRoute(req) && !isBypassed) {
        await auth.protect();
      }
    });

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
