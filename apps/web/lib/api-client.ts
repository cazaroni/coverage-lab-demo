/**
 * Server-only helper for calling the ProjectEdge backend REST API.
 *
 * Import only from Server Components, Route Handlers, or other server-only
 * modules. Never import from client components.
 */

import "server-only";

import { z } from "zod";

export function getApiBase(): string {
  return (
    process.env.PROJECTEDGE_API_BASE_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8000"
  );
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = getApiBase();
  const url = new URL(path, base.endsWith("/") ? base : base + "/");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function sharedHeaders(): HeadersInit {
  return {
    Accept: "application/json",
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiConnectivityError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 0;
}

export function isApiStatusError(
  error: unknown,
  ...statuses: number[]
): error is ApiError {
  return error instanceof ApiError && statuses.includes(error.status);
}

async function apiFetch(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers: sharedHeaders(), cache: "no-store" });
  } catch (cause) {
    throw new ApiError(0, url, `Network error fetching ${url}: ${String(cause)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, url, `Backend ${res.status} for ${url}: ${body}`);
  }

  return res.json();
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = buildUrl(path, params);
  const raw = await apiFetch(url);
  return schema.parse(raw);
}
