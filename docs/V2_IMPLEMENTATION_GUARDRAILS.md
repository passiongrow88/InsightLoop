# InsightLoop V2 — Implementation Guardrails

> This file is the engineering contract for V2. It operationalises the founder document **InsightLoop V2｜开发目标与守则**. If a proposed change conflicts with either document, do not ship it.

## Product invariant

InsightLoop is a long-term awareness companion. It helps a person record, remember, notice evidence-based patterns, and return ownership of the next choice to that person.

It is not a dashboard, task tracker, habit streak product, personality diagnosis tool, fortune-teller, or generic chatbot.

## V2 interaction contract

### Primary route: daily record

The signed-in landing route contains only:

1. selected companion;
2. one present-tense invitation;
3. one text input, with text/voice mode switch;
4. `Continue`, `Skip`, and `Save for later` only when needed.

Default invitation:

> 今天有什么有趣的故事，还是奇特的梦想要记入的吗？
> 值得珍惜的小事、想说的谢谢或抱歉，也可以。

Rules:

- One AI question at a time. A question may be skipped without penalty.
- Save immediately persists the user’s words, even if AI processing fails or the user leaves.
- `Save for later` preserves the draft and never creates a failed or incomplete journal entry.
- The AI chooses whether one follow-up question is useful. It must not reconstruct the former multi-field form through chat.
- Home must never show a journey selector, a session selector, a card grid, a metrics dashboard, or a streak.

### Evidence-based memory

An AI memory claim needs a real stored source record.

| Claim type | Required UI evidence | Permitted companion action |
| --- | --- | --- |
| Today-only reflection | None | listen, think, write |
| One past memory | date + distinct original-text summary | browse archive |
| Possible recurring pattern | at least 2 dated records, shown to user | pattern found |
| No source record | explicit “I do not have enough history yet” | review today only |

The UI must render these three layers separately whenever history is used:

- user’s original words;
- AI summary;
- AI hypothesis.

Never state a hypothesis as fact. The user must be able to correct or dismiss it.

### Safety mode

For self-harm, imminent danger, serious medical symptoms, or acute mental-health crisis:

- stop symbolic, destiny, shadow, reward, and celebration language;
- do not play a celebration, pattern-found, dream, or mystical companion animation;
- show calm, direct support and encourage immediate real-world help;
- save the user’s words only with the same privacy rules as all other entries.

## Data migration contract

### Never break existing records

- Existing `journal_entries`, authentication, old history, subscriptions, and entitlement records remain readable.
- Additive database migrations only. Do not rename, drop, or overwrite a production column during V2 rollout.
- Preserve immutable `created_at`; use `updated_at` for edits.
- A write has one owner. Do not perform a second compatibility write from a legacy store after the canonical write succeeds.
- Persist AI response separately from the user’s raw journal content. A failed AI call must not delete, overwrite, or block the raw entry.

### V2 record model (additive)

Use one canonical entry record plus supporting tables. Field names may differ in migration SQL, but the separation is mandatory.

| Purpose | Minimum fields | Notes |
| --- | --- | --- |
| Raw journal entry | `id`, `user_id`, `body`, `created_at`, `updated_at`, `status` | The source of truth; raw user text is immutable except user edits. |
| AI reflection | `entry_id`, `response`, `safety_mode`, `created_at`, `model_version` | Derived content. Can be regenerated without changing raw words. |
| Memory evidence | `entry_id`, `source_entry_id`, `reason`, `confidence`, `created_at` | Only created when actual source entries exist. |
| Companion profile | `user_id`, `companion_type`, `display_name`, `onboarding_complete` | Phoenix and Thunder Dragon have identical product rights. |
| Rewards | `user_id`, `echo_fragments`, `last_entry_rewarded_on`, `last_review_rewarded_on` | No streak or word-count field. |
| Intent tracking | `id`, `user_id`, `intention`, `action`, `outcome`, `created_at` | Replaces “manifestation” framing in the V2 UI while retaining old data. |

Old structured journal fields may be retained for backwards compatibility, but V2 must write the full raw text first.

## Companion asset contract

- V1 companion output is green-screen asset media, not a page background.
- Each animation is triggered only by the matching, completed system state: listening, thinking, saving, archive retrieval, evidence-backed pattern, or safe completion.
- The `browse-archive` animation requires retrieved historical source IDs.
- The `pattern-found` animation requires visible dated evidence.
- Render graceful static fallbacks while assets are missing, loading, unsupported, or reduced-motion is enabled.
- No asset may change a companion’s official face, body proportion, colour, wings, horns, or species.

## Product spaces

| Priority | Space | V2 responsibility |
| --- | --- | --- |
| Primary | Daily record | companion-led, one-task recording |
| Secondary | Memory map | permanent memory stars, dated evidence, meaningful connections |
| Secondary | Echo study | companion, equipped items, room decoration |
| Secondary | Intent & choice | intention, action, result; never prediction |
| Secondary | Library | free resources, paid resources, account history |
| Utility | Settings | companion change, privacy, language, voice, account, billing |

No secondary space is allowed to interrupt the first record flow.

## Reward and membership boundaries

### Echo fragments

- +1 for one saved real record per day;
- +1 for reviewing one old record and adding a present reflection per day;
- +1 for completing one meaningful continuation per day;
- +2 for an action or outcome logged in intent tracking, twice per week maximum.

Never reward word count, positivity, distress, referral, consecutive use, or returning after a lapse.

### Free vs paid

Free always includes basic writing, saving, reading own records, basic companion presence, and basic safety support. Paid value is depth and capacity: longer memory comparisons, reports, reasonable voice allowance, premium Library material, and selected room/customisation features.

Before selling a plan, the following must be real and tested: entitlement checks, feature limits, Stripe checkout, webhook provisioning and cancellation, and the Stripe customer portal.

## Mandatory release sequence

1. **Freeze and back up:** Git tag/commit, Vercel deployment record, Supabase schema/data export, environment-variable inventory.
2. **Repair V1 data integrity:** one canonical write path; preserve `created_at`; persist and read AI responses; test edit/delete/reload across devices.
3. **Add V2 schema behind feature flags:** no existing user sees a changed route yet.
4. **Ship text-only V2 daily record:** single input, save-first, one-question flow, safe fallback states.
5. **Ship onboarding:** egg selection, companion naming, profile persistence; static visual fallbacks are acceptable while media is being produced.
6. **Ship evidence-backed memory:** dated source cards before any pattern animation or language.
7. **Ship rewards and secondary spaces:** no streaks; all calculations server-validated.
8. **Integrate verified assets:** optimise originals into web formats and map actions to real states.
9. **Repair and verify billing:** only then present recurring payment as available.
10. **Pilot release:** feature flag for current users, restore plan verified before broad rollout.

## Ship gates

Do not release V2 if any statement is false:

- A raw entry can be saved if AI is unavailable.
- Editing an entry does not change the original creation time.
- A journal AI response survives a full sign-out/sign-in and cross-device reload.
- A historical claim displays the exact supporting dates and source summaries.
- No-history users never see false archive or pattern behaviour.
- A crisis input cannot trigger a celebratory, mystical, or reward state.
- The daily record route has no dashboard or legacy form fields.
- Motion can be disabled and every companion action has a static fallback.
- A cancellation downgrades entitlements correctly; a portal link works before paid users see it.
- Git/Vercel/Supabase restoration instructions have been run successfully in a non-production test.

## Current audit blockers (2026-07-29)

1. The current landing page is a legacy card dashboard; it conflicts with the daily-record contract.
2. The legacy journal is a multi-field form; V2 needs a save-first conversational record flow.
3. Journal writes use two store paths. The compatibility write path does not persist or reload `aiResponse`, and an edit can rewrite `created_at`.
4. The UI presents subscription management, while the current control is placeholder-only; `isPaywallActive` always returns false, so paid limits are not enforced.
5. The local build could not be verified until dependencies install successfully; the first install attempt was blocked by the restricted default npm cache path.

These are repair items, not reasons to delay V2 visual production.
