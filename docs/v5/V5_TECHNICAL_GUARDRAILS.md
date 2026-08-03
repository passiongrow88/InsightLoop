# InsightLoop V5 Technical Guardrails

**Version:** V5.0  
**Status:** Mandatory for all development environments  
**Applies to:** AI coding tools, human developers, designers, contractors, CI, Preview, and production release work.

---

## 1. Non-bypass rule

> When a confirmed product requirement creates a technical problem, solve the technical problem. Do not remove, hide, imitate, replace, or weaken the requirement to make development easier.

A workaround is acceptable only when it preserves the approved user experience, privacy level, data integrity, and product meaning.

A workaround that merely makes a demo appear functional while the confirmed behaviour is absent is a failure.

---

## 2. Required engineering response to a blocker

Every blocker must follow this sequence.

### Step 1 — Reproduce

Record:

- environment;
- device/browser;
- branch and commit;
- exact user action;
- expected result;
- actual result;
- logs, network status, and error code;
- whether data was lost or exposed.

### Step 2 — Identify the real root cause

Do not stop at a friendly UI message such as “could not hear” or “please retry.” Determine whether the cause is:

- permission;
- browser capability;
- MIME/codec incompatibility;
- provider rejection;
- API authentication;
- rate limit;
- CORS/CSP;
- deployment mismatch;
- stale asset/cache;
- data schema mismatch;
- model output failure;
- licensing restriction;
- another specific dependency.

### Step 3 — Preserve the requirement

Propose at least one solution that keeps the approved experience.

For each option state:

- what changes technically;
- what the user still experiences;
- cost;
- privacy impact;
- performance impact;
- implementation risk;
- test plan.

### Step 4 — Implement only in Preview

- Use a dedicated feature or V5 implementation branch.
- Do not modify `main` or the production domain without founder approval.
- Keep rollback possible.
- Do not overwrite the last known stable Preview before the replacement is verified.

### Step 5 — Test the real path

Do not claim completion from a build alone.

Test:

- actual browser interaction;
- actual device microphone when relevant;
- actual registration and email flow;
- actual database persistence;
- actual model/provider request;
- actual deployment URL;
- actual reopened record.

### Step 6 — Report honestly

Use one of these statuses:

- `VERIFIED`: real end-to-end path passed.
- `PARTIALLY VERIFIED`: named portions passed; remaining gap listed.
- `BLOCKED`: root cause known, approved experience not yet working.
- `UNKNOWN`: evidence is insufficient.

Never use “done,” “fixed,” or “live” when the actual user path has not been verified.

---

## 3. Forbidden pseudo-solutions

| Problem | Forbidden response | Required direction |
|---|---|---|
| Vercel deployment fails | Publish a third-party CDN shell, redirect loader, or misleading old deployment | Fix the real build/deploy pipeline or publish a verified direct bundle |
| New build not visible | Blame user cache without checking served content | Verify deployment ID, alias, response body, cache headers, and build version |
| Microphone fails | Show generic “could not hear” for every error | Detect permission, input device, codec, recording size, network, provider, and transcription errors separately |
| Browser audio format unsupported | Remove voice or send the same incompatible file repeatedly | Select a supported recording format, transcode, use supported browser recognition, or route to a lawful compatible provider |
| Verification email absent | Disable verification or claim email was sent | Inspect Auth logs, distinguish repeated signup, configure SMTP, add resend and recovery flow |
| AI response poor | Replace with hard-coded comforting lines | Fix prompt, context, output validation, provider choice, retrieval, and fallback behaviour |
| History retrieval is slow | Skip retrieval but claim a pattern | Add indexing, staged retrieval, caching, summaries, and validated evidence lookup |
| Animation is heavy | Remove the journal ritual or return to a form | Compress, lazy-load, use WebM/WebP/Lottie/canvas/CSS, reduce layers, add reduced-motion mode |
| 3D performance weak | Replace the room with dashboard cards | Use the approved 2.5D layered room and fixed interaction points |
| External music API unavailable | Use unofficial extraction APIs | Use founder-licensed tracks, open-licensed tracks, local playback, or postpone integration |
| Provider API is expensive | Secretly degrade all responses | Define plan limits, cache safely, use model routing, or present an honest limit without reducing core trust |
| Save fails | Continue animation and imply success | Stop completion state, preserve local draft, show exact recoverable state, retry safely |
| A feature is hard | Hide the object or remove the route | Report blocker and preserve the product specification until solved or founder changes it |

---

## 4. Branch and production protection

### 4.1 Branches

- V5 specification branch: `v5/product-operating-system`.
- Implementation must use a separate V5 implementation branch derived from an approved base.
- Do not build V5 directly on the old companion Preview branch unless the founder explicitly chooses it.

### 4.2 Production

Without explicit founder approval, do not:

- merge to `main`;
- deploy to `insightloop.lol`;
- replace production Supabase migrations;
- change production authentication behaviour;
- rotate production keys;
- delete production data;
- alter paid-user entitlements.

### 4.3 Preview identity

Every Preview must expose a visible or inspectable build identity containing:

- V5 version;
- commit SHA;
- build timestamp;
- environment = Preview.

The user should not be sent an ambiguous link that may serve an older shell.

---

## 5. Architecture rules

### 5.1 Separate presentation from product truth

The 2.5D room is the presentation layer. Product state must remain in explicit services and data models.

Do not encode critical business rules only inside animation components.

Examples of explicit state:

- journal draft;
- save status;
- response status;
- incubation qualifying days;
- deep-review entitlement;
- companion identity;
- direction confirmation;
- dream record;
- music licence metadata.

### 5.2 State machine over scattered booleans

Core interactions should use clear state machines or typed states.

Example journal states:

`room → opening → event → dream → thanks → apology → review → writing_original → saving → generating_response → writing_response → complete → error`

Impossible state combinations must be prevented, such as:

- response shown before original text is saved;
- complete animation while persistence failed;
- companion search result without evidence;
- hatching before eligibility;
- direction activated without confirmation.

### 5.3 Graceful degradation must preserve meaning

Allowed examples:

- reduced-motion journal transition instead of full animation;
- immediate text reveal after the user skips writing animation;
- text deep review when voice is temporarily unavailable;
- static fallback image when WebM cannot play.

Not allowed:

- chat bubbles replacing the journal pages;
- generic dashboard replacing the study;
- hard-coded fake search results;
- removing InsightLoop response because the model is unavailable;
- treating local-only music as cloud-synchronised.

### 5.4 Offline and retry safety

At minimum:

- unsaved text survives navigation and registration handoff;
- save operations are idempotent;
- repeated retry does not create duplicate entries;
- a failed response generation does not delete the saved original entry;
- network recovery can resume the pending response;
- the user can clearly see whether original text is local, saving, or saved.

---

## 6. Journal and animation engineering

### 6.1 Source of truth

Store at least:

- immutable or versioned original confirmed text;
- optional dream text;
- optional thanks text;
- optional apology text;
- structured extraction separately;
- InsightLoop response separately;
- response evidence separately;
- timestamps and edit metadata.

### 6.2 Quill animation

The quill animation must:

- render from real confirmed text;
- support long entries without excessive delay;
- allow skip-to-complete;
- support mute;
- honour reduced-motion preference;
- keep the full text selectable/readable after completion;
- never be the only copy of the text;
- never falsely indicate persistence success.

### 6.3 Assets

- Use optimised modern formats.
- Lazy-load nonessential animations.
- Provide poster/static fallback.
- Do not embed secrets or private URLs in assets.
- Record source and licence for every externally sourced visual or audio asset.
- Never share font files from development environments.

---

## 7. Voice and audio guardrails

### 7.1 Recording

Before recording:

- confirm secure origin;
- request microphone permission in response to a user action;
- select a supported MIME type using browser capability checks;
- show recording state and stop control;
- stop media tracks after completion.

### 7.2 Transcription

The client and backend must agree on:

- MIME type;
- codec;
- size limit;
- duration limit;
- language handling;
- provider-supported formats.

Do not relabel audio bytes as another format without real compatibility.

### 7.3 Error taxonomy

Distinguish at least:

- permission denied;
- no microphone device;
- device busy;
- browser unsupported;
- no audio captured;
- recording too short;
- recording too large;
- unsupported codec;
- upload/network failure;
- provider authentication failure;
- provider rejection;
- empty transcript;
- service unavailable.

User-facing copy may be gentle but must remain truthful.

### 7.4 Playback

- Do not autoplay loud sound on first visit.
- Persist user mute/volume preference.
- Provide browser speech fallback only when it is clearly a fallback and does not misrepresent the companion voice.
- Stop previous audio before playing new audio.

---

## 8. Authentication and email guardrails

### 8.1 First-record handoff

- Draft persists before account creation.
- Authentication must not destroy room state.
- Email callback returns to the pending V5 flow.
- Duplicate signup is distinguished from new signup.

### 8.2 Email delivery

A production-ready flow requires:

- configured sending domain/SMTP provider;
- verified sender identity;
- correct redirect URLs;
- resend verification action;
- password-recovery action;
- clear spam-folder guidance where appropriate;
- Auth-log inspection for delivery and repeated-signup states.

Do not disable verification simply to make Preview convenient unless the Preview environment is isolated and the founder explicitly approves it.

### 8.3 Error messages

Translate provider errors into accurate user actions, for example:

- already registered → sign in or recover password;
- verification pending → resend verification;
- expired link → request a new link;
- rate limit → wait and retry later;
- invalid credentials → check email/password;
- network failure → draft remains safe, reconnect.

---

## 9. InsightLoop AI guardrails

### 9.1 System responsibilities

The AI layer must produce separate outputs for:

- user-facing response;
- internal structured extraction;
- optional question;
- historical evidence references;
- possible echo/pattern/change state;
- optional direction candidate;
- safety state.

Internal observations must never be directly rendered by default.

### 9.2 Output validation

Validate:

- JSON/schema;
- maximum lengths;
- allowed response modes;
- historical dates exist;
- quotations exist in the referenced original record;
- pattern claims meet evidence threshold;
- direction suggestions are not auto-created;
- banned internal-analysis phrases are absent;
- safety handling overrides pattern interpretation when necessary.

### 9.3 Fallbacks

A fallback must preserve product honesty.

Allowed:

- retry with stricter schema;
- route to a second approved model;
- save original text and mark response pending;
- show a clear service-unavailable state while preserving the record.

Not allowed:

- canned pseudo-insight presented as personalised analysis;
- invented historical citations;
- generic motivational text labelled as the full InsightLoop response;
- silently switching to an unapproved provider that changes privacy terms.

### 9.4 Prompt secrecy and data minimisation

- Keep private system prompts server-side.
- Do not send unnecessary full history to every request.
- Retrieve candidate records first, then send validated relevant context.
- Avoid logging raw private journal text unless explicitly required and protected.
- Redact secrets and authentication tokens from logs.

---

## 10. Memory and retrieval guardrails

### 10.1 Retrieval stages

Recommended stages:

1. filter by user and permissions;
2. apply date/entity/keyword constraints when given;
3. semantic candidate retrieval;
4. rerank by structural relevance;
5. fetch original record text;
6. validate quotations;
7. produce evidence-backed response.

### 10.2 Pattern requirements

A pattern requires:

- at least two different dated records;
- structural similarity beyond keywords;
- traceable evidence;
- a confidence/uncertainty statement;
- attention to changed response or outcome.

### 10.3 Search honesty

If search finds nothing, say so.

If it finds candidates, label them as candidates.

If exact text cannot be validated, do not put quotation marks around it.

### 10.4 Data isolation

Every query must be scoped to the authenticated user. No cross-user memory retrieval is permitted.

---

## 11. Companion and entitlement guardrails

### 11.1 Incubation counter

- Count distinct local calendar record dates under a defined timezone policy.
- Multiple records on the same date count once.
- Counter must be derived from saved records or a transactionally consistent ledger.
- Do not trust only client-side local storage.
- Avoid timezone changes creating duplicate credits.

### 11.2 Deep-review entitlement

- Separate normal InsightLoop journal responses from companion deep reviews.
- A deep-review session must have a clear start, active state, and completion state.
- Consuming entitlement must be transactional and idempotent.
- Failed technical attempts must not consume the user’s earned session.

### 11.3 Companion recommendation

Recommendation logic must be explainable and non-diagnostic. The user always retains final choice.

---

## 12. Ship’s wheel guardrails

- AI may create a candidate only.
- User confirmation is required before active direction creation.
- Store user wording separately from suggested wording.
- Link later entries as suggestions until confirmed.
- Track actual action and outcome, not only intention.
- Do not turn the wheel into a task-management dashboard.

---

## 13. Dreamcatcher guardrails

- Dream entries remain linked to original journal records.
- Search and grouping must use real records.
- Repeated symbols require at least two records.
- Symbolic language must remain uncertain.
- No prediction, diagnosis, supernatural certainty, or medical inference.

---

## 14. Music and external-content guardrails

### 14.1 Licence record required

No track enters a public Preview or production player without documented rights covering the intended in-app use.

Keep a machine-readable or documented asset register containing:

- asset ID;
- source URL/platform;
- creator;
- licence;
- acquisition date;
- attribution text;
- proof snapshot/link;
- commercial use allowed;
- in-app full-track playback allowed;
- modification allowed;
- redistribution restrictions;
- territory concerns;
- expiration or subscription dependency.

### 14.2 Prohibited sources

- unofficial music APIs;
- stream ripping;
- scraped direct URLs;
- tracks labelled only “no copyright” without licence evidence;
- modern recordings assumed public domain because the composition is old;
- user-uploaded copyrighted music stored or redistributed without a lawful basis.

### 14.3 Local MP3

Local playback must remain local unless a future cloud licence and storage design is explicitly approved.

### 14.4 Affiliate links

Affiliate tracking must be disclosed where required and must not alter or impersonate the provider’s player.

---

## 15. Privacy and security guardrails

- Secrets remain server-side or in approved secret stores.
- Never commit API keys, service-role keys, database passwords, or private prompts.
- Use least-privilege credentials.
- Enforce row-level access controls.
- Protect exports and deletion actions with re-authentication where appropriate.
- Log administrative access to private records.
- Do not claim stronger encryption or privacy than implemented.
- Confirm provider data-retention and training terms before publishing user promises.

---

## 16. Performance guardrails

Target principles:

- show a usable study shell quickly;
- lazy-load heavy object animation;
- avoid loading every companion asset at first paint;
- preload only the next likely interaction;
- compress audio and visual assets lawfully;
- keep controls responsive while models or animations run;
- support low-power mobile devices;
- honour reduced-motion and muted-audio preferences.

A slow beautiful room that blocks journaling is not acceptable.

---

## 17. Accessibility guardrails

- Every interactive room object has a keyboard-accessible control.
- Provide visible focus states.
- Do not rely only on colour or glow to communicate availability.
- All animations have reduced-motion behaviour.
- All audio has mute/volume control.
- Text remains readable and selectable.
- Chinese typography must not overflow or split short phrases into visually poor line breaks.
- Screen-reader labels describe function, not decorative lore only.

---

## 18. Required blocker report template

```md
## Blocker

Requirement:
Environment / device:
Branch / commit:
Expected:
Actual:
Reproduction steps:
Evidence / logs:
Root cause:

## Requirement-preserving solution

Technical approach:
User experience preserved:
Cost:
Risks:
Privacy impact:
Test plan:

## Status

VERIFIED | PARTIALLY VERIFIED | BLOCKED | UNKNOWN

## Explicitly not done

List anything that remains unverified.
```

---

## 19. Definition of technical completion

A task is complete only when:

1. the approved user experience is present;
2. the implementation is not a visual fake;
3. persistence and permissions are correct;
4. error states are truthful;
5. relevant devices/browsers are tested;
6. build and type checks pass;
7. the deployed Preview serves the intended commit;
8. acceptance tests pass;
9. production remains unchanged unless approved;
10. unresolved limitations are disclosed.
