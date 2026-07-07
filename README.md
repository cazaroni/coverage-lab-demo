# Coverage Lab

**Defensive coverage analytics for football — a working demo.**

Coverage Lab scores defensive plays from player-tracking data, then lets a coach
replay them frame-by-frame with the analytics drawn on top. It turns raw
positional data into two plain-English signals a coach can act on, and a
broadcast-style replay that shows *why* a play held up or broke down.

> This is a public portfolio demo running on sample tracking data. Open the app,
> click **Enter demo** — no account, no sign-up — and you land in a live workspace.

---

## What it does

- **Two coverage metrics per play**
  - **DCI — Defensive Coverage Index:** how tightly the defense constricts space
    relative to an ideal coverage shape. High = tight/aggressive, low = soft.
  - **DIS — Defensive Integrity Score:** whether the defensive shell holds its
    structure or breaks into seams. Low DIS precedes explosive plays.
- **Broadcast-style replay** — a 60fps field renderer with per-player stress
  halos, a scrubber, and a HUD, so a play's breakdown is visible, not just
  tabulated.
- **Coaching assistant** — ask questions in natural language ("what were my
  worst coverage plays?", "why did this play break down?") and get answers
  grounded in the data, with links back to the film. Every number is computed
  by a deterministic tool, never invented by the model.
- **Play catalog, drives, and player views** — browse and filter scored plays,
  drill into a drive, or open a player's profile.

## How it's built

A pnpm + Turbo monorepo:

| Path | Role |
| --- | --- |
| `apps/web` | Next.js frontend — play catalog, dashboards, and the PixiJS replay renderer |
| `services/api` | FastAPI backend — analytics reads, play scoring, replay-session tokens |
| `services/realtime` | WebSocket service streaming replay frames as binary protobuf |
| `services/inference` | Scoring service (geometric model bundle) with an in-process fallback |
| `packages/analytics` | The Python analytics engine (DCI/DIS, forensics, trends) |
| `packages/schemas` | Shared typed contracts (Zod + Python) across the stack |
| `packages/proto` | Protobuf definitions and the scoring payload-hash contract |

**Stack:** TypeScript · Next.js · PixiJS · React · Python · FastAPI · Protobuf ·
DuckDB/Parquet · WebSockets · an optional LLM assistant.

## Run it locally

Prerequisites: Node 20+, pnpm 10, Python 3.12.

```bash
# 1. Install frontend deps
pnpm install

# 2. Set up the backend venv
cd services/api
python -m venv .venv
.venv/bin/pip install -e .[dev] -e ../../packages/analytics
cd ../..

# 3. Start backend + frontend together
./dev.sh            # backend :8000, frontend :3000  (dev.bat on Windows)
```

Then open http://localhost:3000 and click **Enter demo**.

The coaching assistant is optional — set `ANTHROPIC_API_KEY` to enable the
conversational layer; without it, the same questions are answered by the
deterministic query endpoint.

## Notes

- Runs on a bundled sample tracking dataset so the demo works out of the box.
- Sign-in is a one-click demo bypass — there is no real authentication in this
  build, by design.
