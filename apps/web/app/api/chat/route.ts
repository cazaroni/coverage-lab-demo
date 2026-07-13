/**
 * Conversational layer for the Coverage Lab coaching assistant.
 *
 * Built on the Vercel AI SDK (v5): `streamText` runs a multi-step tool-calling
 * loop (stopWhen: stepCountIs) where each tool fetches the deterministic
 * ProjectEdge analytics API. The LLM orchestrates + narrates; the tools stay
 * deterministic and team-scoped (no DCI/DIS is ever invented by the model).
 *
 * The chat model is configurable via ANTHROPIC_CHAT_MODEL (we do NOT hardwire a
 * model) and requires ANTHROPIC_API_KEY at runtime. With no key, use the
 * deterministic POST /intelligence/query endpoint instead.
 */

import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiBase } from "@/lib/api-client";

// LLM responses with tool loops can take a while — give the stream room.
export const maxDuration = 60;

const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are the coaching assistant for Coverage Lab, defensive-structure analytics for amateur and youth football staffs (peewee, high-school, D-III). Speak plainly to a coach with no film budget — never assume NFL-grade resources.

Two metrics ground everything (from the team's tracking data):
- DCI (Defensive Coverage Index): spatial tightness — how aggressively the defense constricts space vs. an ideal coverage archetype. High DCI = tight, aggressive coverage (good, but more boom-or-bust); low DCI = soft, loose coverage.
- DIS (Defensive Integrity Score): structural stability — does the shell hold its shape and leverage, or break into seams. High DIS = disciplined execution; low DIS = chaos. DIS dropping below 0.25 is the empirical "point of no return" — after it, ~82% of plays yield explosive gains.

Rules:
- ALWAYS call a tool to ground any claim about plays or scores. Never invent a DCI/DIS number or a play id.
- Cite specific plays by their deep_link (e.g. /plays/2023090700_1300) so the coach can open the film.
- After calling openReplay for a play, tell the coach they can open the film at that play's deep_link.
- Be concise and concrete. Lead with the answer, then the supporting plays. Use the plain-English score labels the tools return (e.g. "Coverage breakdown", "Collapse detected").`;

const API_BASE = getApiBase();

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`backend ${res.status} on GET ${path}`);
  return res.json();
}

async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`backend ${res.status} on POST ${path}`);
  return res.json();
}

type ContextPlay = {
  week: number;
  opponent: string | null;
  dci: number | null;
  label: string;
  deep_link: string;
};
type TeamContext = {
  team_name: string;
  season: number;
  scored_play_count: number;
  motion_play_count: number;
  weeks_covered: number[];
  season_avg_dci: number | null;
  season_avg_dis: number | null;
  season_dci_label: string;
  season_dis_label: string;
  weakest_play: ContextPlay | null;
  tightest_play: ContextPlay | null;
};

// Deterministic grounding briefing — fetched server-side and injected into the
// system prompt so the assistant knows its scope and never falsely says "I don't
// know" about basics. Returns null if the backend is unreachable (chat still works).
async function fetchTeamContext(): Promise<TeamContext | null> {
  try {
    return (await apiGet("/intelligence/context")) as TeamContext;
  } catch {
    return null;
  }
}

function teamContextBlock(ctx: TeamContext): string {
  const weeks = ctx.weeks_covered;
  const span = weeks.length ? ` (weeks ${weeks[0]}–${weeks[weeks.length - 1]})` : "";
  const play = (p: ContextPlay | null) =>
    p
      ? `Week ${p.week} vs ${p.opponent ?? "OPP"} — DCI ${p.dci?.toFixed(2)} (${p.label}) — ${p.deep_link}`
      : "n/a";
  return `

CURRENT TEAM CONTEXT (ground every answer in this; do not claim ignorance about these basics):
- Team: ${ctx.team_name} — ${ctx.season} season
- Scored plays available: ${ctx.scored_play_count} across ${weeks.length} weeks${span}
- Plays with per-frame film (forensics/replay): ${ctx.motion_play_count} of those — the rest have headline DCI/DIS only
- Season averages: DCI ${ctx.season_avg_dci?.toFixed(2) ?? "—"} (${ctx.season_dci_label}), DIS ${ctx.season_avg_dis?.toFixed(2) ?? "—"} (${ctx.season_dis_label})
- Weakest coverage so far: ${play(ctx.weakest_play)}
- Tightest coverage so far: ${play(ctx.tightest_play)}
If a coach asks about a week, player, or play not in this data, say what IS available and offer the closest analysis instead of refusing. Only ${ctx.motion_play_count} plays have per-frame film — if explainPlay returns no collapse window / zero peak stress, that play has no motion sample, so report only its headline DCI/DIS and do NOT describe a frame-by-frame breakdown.`;
}

// ── Public-exposure gate ─────────────────────────────────────────────────────
// Cap abuse of the (paid) LLM endpoint on the public demo: MAX_MESSAGES_PER_IP per
// IP within WINDOW_MS, plus a kill switch and payload caps. NOTE: the Map lives in
// the serverless instance's memory, so on Vercel it is per-instance and resets on
// cold starts — best-effort, not a hard guarantee. For a hard cap, back it with a
// shared store (Vercel KV / Upstash Redis).
const CHAT_DISABLED = process.env.PROJECTEDGE_CHAT_DISABLED === "1";
const MAX_MESSAGES_PER_IP = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // rolling 24h window
const MAX_MESSAGES = 40;
const MAX_TEXT_PART_CHARS = 4_000;
const MAX_BODY_BYTES = 32_768;
const MAX_TRACKED_CLIENTS = 5_000;
const ipHits = new Map<string, number[]>();

// x-forwarded-for is only trustworthy because Vercel overwrites it with the real
// client IP; behind a proxy that merely appends, the first hop would be
// attacker-controlled and the limiter needs a platform-verified header instead.
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

function overRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  // delete-then-set keeps Map insertion order ≈ recency, so the size cap below
  // evicts the coldest visitor instead of a hot (possibly over-quota) one.
  ipHits.delete(ip);
  if (recent.length >= MAX_MESSAGES_PER_IP) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  if (ipHits.size > MAX_TRACKED_CLIENTS) {
    const coldest = ipHits.keys().next().value;
    if (coldest !== undefined) ipHits.delete(coldest);
  }
  return false;
}

function jsonError(status: number, error: string, headers?: Record<string, string>): Response {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(req: Request): Promise<Response> {
  if (CHAT_DISABLED) {
    return jsonError(503, "The assistant is disabled on this deployment.");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonError(503, "The assistant is not configured on this deployment.");
  }
  const ip = clientIp(req);
  if (overRateLimit(ip)) {
    return jsonError(
      429,
      `Demo limit reached — ${MAX_MESSAGES_PER_IP} assistant messages per visitor. Thanks for trying Coverage Lab! Explore the dashboards and replay in the meantime.`,
      { "retry-after": String(Math.ceil(WINDOW_MS / 1000)) },
    );
  }

  // The body is already fully buffered here (the platform enforces its own hard
  // request-size ceiling before us); this cap bounds what we forward to the LLM.
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return jsonError(413, "Request body too large.");
  }
  let messages: UIMessage[];
  try {
    const parsed: { messages?: unknown } = JSON.parse(raw);
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return jsonError(400, "Body must contain a non-empty messages array.");
    }
    messages = parsed.messages as UIMessage[];
  } catch {
    return jsonError(400, "Body must be JSON.");
  }
  if (messages.length > MAX_MESSAGES) {
    return jsonError(413, "Conversation too long — start a new chat.");
  }
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      return jsonError(400, "Malformed message.");
    }
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      if (
        part?.type === "text" &&
        typeof part.text === "string" &&
        part.text.length > MAX_TEXT_PART_CHARS
      ) {
        return jsonError(413, "Message too long.");
      }
    }
  }

  // convertToModelMessages is the real shape validator — surface its rejection
  // of malformed UIMessage payloads as a 400 instead of an unhandled 500.
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch {
    return jsonError(400, "Malformed messages payload.");
  }

  const ctx = await fetchTeamContext();
  const system = ctx ? SYSTEM_PROMPT + teamContextBlock(ctx) : SYSTEM_PROMPT;

  const result = streamText({
    model: anthropic(CHAT_MODEL),
    system,
    messages: modelMessages,
    // Multi-step agentic loop: keep generating after tool results until the
    // model has a final answer (or we hit the step ceiling). AI SDK v7:
    // the stopping helper is `isStepCount` (renamed from v5's `stepCountIs`).
    stopWhen: isStepCount(6),
    tools: {
      findPlays: tool({
        description:
          "Find this team's plays ranked by coverage scores. Use for 'worst/weakest coverage' (sort=dci_asc), 'tightest coverage' (sort=dci_desc), or 'most structural drift/chaos' (sort=dis_desc). Optionally filter by week. Returns plays with DCI/DIS, plain-English labels, and deep_links.",
        inputSchema: z.object({
          sort: z.enum(["dci_asc", "dci_desc", "dis_desc"]).optional(),
          week: z.number().int().min(1).max(25).optional(),
          limit: z.number().int().min(1).max(15).optional(),
        }),
        execute: async ({ sort, week, limit }) =>
          apiPost("/intelligence/tools/find-plays", { sort, week, limit }),
      }),

      explainPlay: tool({
        description:
          "Get full coverage forensics for one play: DCI, DIS, nearest archetype, peak-stress frame/player, collapse window, and a plain-text breakdown. Use to answer 'why did this play break down'.",
        inputSchema: z.object({
          playId: z.string().describe("e.g. 2023090700_1300"),
        }),
        execute: async ({ playId }) =>
          apiGet(`/plays/${encodeURIComponent(playId)}/forensics`),
      }),

      teamIntegrityTrend: tool({
        description:
          "Get the team's weekly average DCI/DIS for a season to judge whether the defense is improving, declining, or holding steady.",
        inputSchema: z.object({
          season: z.number().int().min(2000).max(2100).optional(),
        }),
        execute: async ({ season }) =>
          apiGet(`/analytics/integrity?season=${season ?? 2023}`),
      }),

      openReplay: tool({
        description:
          "Mint a short-lived replay-session token so the coach can open the film for a specific play. Returns the token plus the play's deep_link.",
        inputSchema: z.object({
          playId: z.string().describe("e.g. 2023090700_1300"),
        }),
        execute: async ({ playId }) => {
          const session = (await apiPost(
            `/plays/${encodeURIComponent(playId)}/replay-session`,
          )) as Record<string, unknown>;
          return { ...session, deep_link: `/plays/${playId}` };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
