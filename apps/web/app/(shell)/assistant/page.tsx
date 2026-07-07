"use client";

import Link from "next/link";
import { useState } from "react";

import { useChat } from "@ai-sdk/react";

const STARTERS = [
  "What are my worst coverage plays this season?",
  "Why did play 2023090700_1300 break down?",
  "Is my defense improving over the season?",
  "Show me the plays with the most structural drift in week 14",
];

// Linkify /plays/<id> references the assistant cites so coaches can open the film.
// PLAY_LINK (global, capturing) drives the split; IS_PLAY_LINK (anchored, non-global)
// tests each chunk statelessly — a global regex's .test() advances lastIndex between
// calls and would drop the second link in a multi-citation message.
const PLAY_LINK = /(\/plays\/\d{10}_\d+)/g;
const IS_PLAY_LINK = /^\/plays\/\d{10}_\d+$/;

function renderText(text: string) {
  return text.split(PLAY_LINK).map((chunk, i) =>
    IS_PLAY_LINK.test(chunk) ? (
      <Link key={i} href={chunk} className="text-emerald-400 underline underline-offset-2">
        {chunk}
      </Link>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}

export default function AssistantPage() {
  const [input, setInput] = useState("");
  // Default transport targets POST /api/chat (our route handler).
  const { messages, sendMessage, status, error } = useChat();

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-3xl flex-col gap-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">Coaching Assistant</h1>
        <p className="text-sm text-zinc-400">
          Ask about coverage breakdowns, structural drift, or the season trend. Answers are grounded
          in your DCI/DIS data and cite the film.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-zinc-800 p-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
                    {renderText(part.text)}
                  </div>
                );
              }
              // Typed tool parts arrive as `tool-<name>` (plus a `dynamic-tool` variant).
              if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                const name =
                  part.type === "dynamic-tool" ? "tool" : part.type.replace("tool-", "");
                return (
                  <div key={i} className="text-xs text-zinc-500">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5">⚙ {name}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

        {error && (
          <div className="text-sm text-red-400">
            The assistant isn&rsquo;t responding &mdash; you may have reached the demo&rsquo;s
            message limit, or the chat layer isn&rsquo;t configured. Explore the dashboards
            and replay in the meantime.
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Ask about your defense…"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
