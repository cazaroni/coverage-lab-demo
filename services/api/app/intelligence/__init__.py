"""Phase 4 intelligence layer: a tool-use chatbot over the analytics surface.

Tools execute deterministic analytics queries (never blocking on an LLM for what
the data answers directly); reports are template-rendered with play-link citations.
A Claude tool-use orchestrator can drive the same tools/templates for queries that
need multi-tool reasoning — without changing this contract. See ARCHITECTURE.md §5.
"""
