# Claude Code Instructions — InsightLoop V5

Load and obey the repository-level `AGENTS.md` first.

Then read the canonical V5 documents in `docs/v5/` in the specified order before proposing or changing code.

## Claude-specific operating rules

- Do not infer a new product direction from current UI or legacy code.
- Do not simplify a confirmed experience merely because implementation is difficult.
- Do not silently replace a real integration with mock data, canned responses, or a visual-only simulation.
- Do not claim a feature is fixed until the real user path has been tested.
- When code conflicts with a `LOCKED` V5 decision, preserve the decision and report the conflict.
- Ask a founder question only for a genuinely `OPEN` decision that blocks correct implementation.
- Keep private journal prompts, secrets, service keys, and sensitive data out of client code and logs.

## Product role reminder

- InsightLoop writes the right-page journal response.
- The companion beast manages and retrieves the diary archive.
- The journal preserves original words.
- The ship’s wheel stores user-confirmed direction and later outcome.
- The dreamcatcher stores and searches dreams.
- The old player uses only documented lawful music sources.

## Blocker behaviour

Follow `docs/v5/V5_TECHNICAL_GUARDRAILS.md`.

A technical blocker may end as `BLOCKED`; it may not end as an unapproved product downgrade.
