# InsightLoop V5 Environment Adapters

The canonical source is `V5_UNIFIED_VIBE_PROMPT.md`. These adapters define how to load it in tools that use different instruction systems.

Do not maintain separate product rules inside each tool. Update the canonical V5 documents first, then keep adapters as pointers.

---

## Codex / OpenAI coding agents

Repository entry file: `/AGENTS.md`

Required behaviour:

1. Open the repository on a V5 Preview branch.
2. Ensure the agent reads `/AGENTS.md`.
3. Use the canonical startup prompt from `V5_UNIFIED_VIBE_PROMPT.md` for the first task.
4. Require acceptance-test evidence before completion.

---

## Claude Code

Repository entry file: `/CLAUDE.md`

First-session instruction:

```text
Read CLAUDE.md and AGENTS.md, then load the canonical V5 documents in docs/v5 before changing code. Use the Unified Vibe-Coding Startup Prompt as your execution contract.
```

---

## Cursor

Repository rule: `/.cursor/rules/insightloop-v5.mdc`

The rule is always applied. For a new Composer/Agent session, paste the task under the `CURRENT TASK` section of the canonical prompt.

Do not allow Cursor to “improve” the product into a standard dashboard based on generic UI heuristics.

---

## Windsurf

Repository rule: `/.windsurfrules`

Start each Cascade task with:

```text
Follow .windsurfrules, AGENTS.md, and the locked docs/v5 specification. Do not downgrade confirmed requirements when blocked.
```

---

## GitHub Copilot

Repository instruction: `/.github/copilot-instructions.md`

For agent-mode implementation, additionally paste the canonical startup prompt and the specific task.

---

## Replit Agent

Replit may not automatically honour every repository-specific instruction format.

At the beginning of the Agent session:

1. Select/import the V5 implementation branch.
2. Paste the full canonical prompt from `V5_UNIFIED_VIBE_PROMPT.md`.
3. Tell the agent to read the five canonical files before editing.
4. Disable or reject any plan that starts by replacing the existing app with a new generic template.
5. Require a Preview deployment and relevant acceptance-test evidence.

Minimum opening message:

```text
Do not start coding yet. Read AGENTS.md and all canonical docs/v5 files in their required order. Summarise the locked product roles and the technical non-bypass law, then execute the task on the current V5 Preview branch without changing main or production.
```

---

## Lovable

Lovable is primarily suitable for visual implementation and may make broad design assumptions.

Use the “Prompt for a visual-only tool” in `V5_UNIFIED_VIBE_PROMPT.md`.

Required checks before accepting Lovable output:

- first screen is the study;
- no dashboard/card grid;
- no full-screen login wall;
- journal is a real book interaction;
- left-page original/right-page InsightLoop separation is visible;
- companion is shown as diary administrator, not chat bubble speaker;
- mobile composition remains coherent;
- generated screens do not claim backend features are functional.

Lovable output is a design/implementation input, not proof of working authentication, memory, voice, persistence, or payment.

---

## Bolt

Bolt may scaffold a new app quickly and overwrite existing architecture.

Before using it:

- explicitly say “continue from the existing repository; do not create a new project”;
- paste the full canonical startup prompt;
- specify the approved V5 Preview branch;
- prohibit backend rewrites unless the task requires and preserves existing data;
- require small, reviewable changes rather than replacing the codebase.

Opening line:

```text
Continue the existing InsightLoop repository and current V5 Preview branch. Do not scaffold a replacement app. Read the locked V5 documents before planning.
```

---

## v0

Use v0 only for component/screen exploration unless it has full repository context.

Paste the visual-only prompt and ask for:

- study scene composition;
- journal object states;
- book input/review/writing/response states;
- egg/companion states;
- wheel/dreamcatcher/player interaction states;
- desktop/mobile variants;
- reduced-motion variants.

Do not accept a generic marketing landing page or dashboard as a V5 implementation.

---

## Other vibe-coding tools

For any tool not listed:

1. Paste the complete canonical startup prompt.
2. Give repository and branch.
3. Require the tool to read the canonical documents.
4. Ask it to repeat the permanent role separation before coding.
5. Require a requirement-preserving plan for technical blockers.
6. Demand real Preview and acceptance evidence.

A tool that cannot read repository documents must receive the relevant locked text directly. Do not rely on the tool to infer the product from screenshots alone.

---

## Session handoff template

Use when moving a task from one coding environment to another:

```text
Repository: passiongrow88/InsightLoop
Branch:
Commit SHA:
Preview deployment:

Canonical specification:
docs/v5 (read in required order)

Task goal:

Files changed:

Verified acceptance tests:

Known blockers:

Unverified items:

Production status:
main and insightloop.lol unchanged / explicitly approved change reference

Important locked decisions relevant to this task:
[list decision IDs]
```

A handoff must not say only “continue from where the other AI stopped.” It must include exact branch, commit, product decisions, and verification state.
