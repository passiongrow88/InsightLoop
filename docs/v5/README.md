# InsightLoop V5 Product Operating System

**Branch:** `v5/product-operating-system`  
**Status:** Founder specification baseline  
**Authority:** These documents define InsightLoop V5. They do not modify `main` or production by themselves.

## Purpose

This folder prevents any AI coding tool, contractor, designer, or developer from silently turning InsightLoop V5 into a generic SaaS dashboard, chat app, mood tracker, game, or ordinary diary.

The documents also establish one mandatory engineering rule:

> When a confirmed product requirement causes a technical problem, solve the technical problem. Do not remove, hide, imitate, replace, or weaken the requirement to make implementation easier.

## Required reading order

1. [`V5_PRODUCT_CONSTITUTION.md`](./V5_PRODUCT_CONSTITUTION.md)
2. [`V5_POD.md`](./V5_POD.md)
3. [`V5_TECHNICAL_GUARDRAILS.md`](./V5_TECHNICAL_GUARDRAILS.md)
4. [`V5_ACCEPTANCE_TESTS.md`](./V5_ACCEPTANCE_TESTS.md)
5. [`V5_DECISION_LOG.md`](./V5_DECISION_LOG.md)
6. [`V5_UNIFIED_VIBE_PROMPT.md`](./V5_UNIFIED_VIBE_PROMPT.md)
7. [`V5_ENVIRONMENT_ADAPTERS.md`](./V5_ENVIRONMENT_ADAPTERS.md)

## Authority order

When documents conflict, use this order:

1. Latest founder decision recorded as `LOCKED` in the Decision Log
2. Product Constitution
3. Product Operating Document
4. Technical Guardrails
5. Acceptance Tests
6. Implementation notes and code comments

Code is never allowed to redefine the product merely because the current implementation behaves differently.

## Change control

A locked V5 decision may only change when all of the following are true:

1. The founder explicitly approves the change.
2. The change is recorded in `V5_DECISION_LOG.md`.
3. Related POD, guardrail, and acceptance-test sections are updated in the same branch.
4. The change is validated in Preview before any production merge.

## Environment entry files

The repository includes environment-specific entry files that point back to this canonical specification:

- `/AGENTS.md` — Codex and general coding agents
- `/CLAUDE.md` — Claude Code
- `/.github/copilot-instructions.md` — GitHub Copilot
- `/.cursor/rules/insightloop-v5.mdc` — Cursor
- `/.windsurfrules` — Windsurf

For Lovable, Bolt, Replit Agent, v0, or another vibe-coding tool, use the canonical prompt in `V5_UNIFIED_VIBE_PROMPT.md` and the loading steps in `V5_ENVIRONMENT_ADAPTERS.md`.

## Release rule

No implementation is considered complete merely because it builds or renders. It must satisfy the relevant acceptance tests and preserve the confirmed user experience.