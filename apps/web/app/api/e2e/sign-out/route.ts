import { NextResponse } from "next/server";

import { E2E_AUTH_COOKIE, isE2EAuthBypassEnabled } from "@/lib/e2e-auth";

export async function GET(request: Request) {
  if (!isE2EAuthBypassEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/", url));

  response.cookies.delete(E2E_AUTH_COOKIE);

  return response;
}
