# InsightLoop V5 Acceptance Tests

**Version:** V5.0  
**Status:** Release gate  
**Rule:** A build is not accepted because it compiles, looks attractive, or passes a happy-path demo. It must pass the relevant tests below.

---

## 1. Severity and result definitions

### Severity

- `P0` — core identity, data safety, privacy, payment, or blocking function. Any failure blocks release.
- `P1` — major experience or reliability issue. Must pass before public beta.
- `P2` — polish or optimisation. May be scheduled only with explicit founder approval.

### Result

- `PASS` — verified through the actual user path with evidence.
- `FAIL` — expected behaviour is absent or incorrect.
- `BLOCKED` — test cannot run because a dependency is unavailable; release remains blocked.
- `NOT IMPLEMENTED` — feature is outside the current phase and must not be presented as functional.

### Required evidence

Each executed test records:

- branch and commit SHA;
- Preview deployment ID and URL;
- date/time;
- device, OS, and browser;
- screen recording or screenshot when visual;
- logs/network trace when technical;
- test account or anonymised record ID when persistence is involved.

---

## 2. Minimum device and browser matrix

### Desktop

- Windows 11 + current Chrome
- Windows 11 + current Edge
- macOS + current Safari
- macOS + current Chrome

### Mobile

- iPhone Safari, current supported iOS
- Android Chrome, current supported Android

### Accessibility modes

- reduced motion enabled
- browser zoom 125% and 200%
- keyboard-only navigation
- muted audio

A phase may narrow the matrix only with founder approval and explicit disclosure.

---

# A. Specification and deployment gates

### V5-A001 — Correct branch

**Severity:** P0  
**Given** V5 work is being implemented  
**When** repository and deployment metadata are inspected  
**Then** implementation is on an approved V5 Preview branch, not direct unapproved changes to `main`.

### V5-A002 — Production unchanged

**Severity:** P0  
**Then** `insightloop.lol`, production data, and production authentication remain unchanged unless the founder explicitly approved release.

### V5-A003 — Served commit identity

**Severity:** P0  
**Given** a Preview URL is shared  
**Then** the deployed page exposes or can prove the exact V5 commit SHA and build timestamp.

### V5-A004 — No old shell

**Severity:** P0  
**Then** the shared URL directly serves the intended V5 build and does not load an outdated GitHub/third-party shell at runtime.

### V5-A005 — Build and type check

**Severity:** P0  
**Then** dependency install, type check, tests, and production build succeed with no ignored fatal error.

### V5-A006 — Required specification files

**Severity:** P0  
**Then** all canonical V5 documents and environment instruction files exist and link to the same authority order.

### V5-A007 — No prohibited origins

**Severity:** P0  
**Then** production or Preview code contains no unauthorised third-party runtime host used to bypass deployment, authentication, privacy, or CORS problems.

---

# B. Study first-open experience

### V5-B001 — No login wall

**Severity:** P0  
**Given** a new unauthenticated visitor  
**When** the app opens  
**Then** the first meaningful screen is the warm 2.5D study, not a login form or SaaS landing page.

### V5-B002 — Study identity

**Severity:** P0  
**Then** the room visibly contains the journal, ship’s wheel, golden egg, dreamcatcher, and old player in a coherent environment.

### V5-B003 — Not dashboard cards

**Severity:** P0  
**Then** core objects are spatial room interactions and are not represented primarily as a grid, sidebar, or top navigation of feature cards.

### V5-B004 — Journal discoverability

**Severity:** P0  
**Then** a first-time user can identify and open the journal without instructions longer than one short hint.

### V5-B005 — Dormant objects remain in-world

**Severity:** P1  
**Then** unavailable or not-yet-earned objects react in-world and do not display harsh lock overlays as the dominant design.

### V5-B006 — Responsive study

**Severity:** P0  
**Then** all core objects remain reachable on desktop and mobile without overlapping, clipping, or requiring horizontal scroll.

### V5-B007 — Chinese typography

**Severity:** P1  
**Then** short Chinese headlines do not break into visually poor four-line blocks and text remains proportionate to the scene.

### V5-B008 — Keyboard access

**Severity:** P1  
**Then** every functional room object can receive focus and activate by keyboard.

### V5-B009 — Reduced motion

**Severity:** P1  
**Given** reduced motion is enabled  
**Then** the study remains functional using fades/static transitions rather than forced large movement.

---

# C. First journal before registration

### V5-C001 — Open before login

**Severity:** P0  
**Given** an unauthenticated visitor  
**When** they select the journal  
**Then** they can begin the first record before account creation.

### V5-C002 — Draft persistence

**Severity:** P0  
**Given** the visitor has written content  
**When** they navigate between journal steps or encounter registration  
**Then** the content remains intact.

### V5-C003 — Refresh recovery

**Severity:** P1  
**Given** an unsaved local draft  
**When** the page refreshes or browser restarts within the supported recovery window  
**Then** the user is offered restoration without duplicate save.

### V5-C004 — Account requested at save

**Severity:** P0  
**Then** registration is requested only when permanent account-backed preservation is required, not before the user experiences the journal.

### V5-C005 — Registration reason

**Severity:** P1  
**Then** copy explains that an account preserves the room and journal, without presenting a generic marketing gate.

### V5-C006 — Return to pending journal

**Severity:** P0  
**When** registration or login completes  
**Then** the user returns to the pending journal with all content preserved.

---

# D. Journal content flow

### V5-D001 — Today’s event

**Severity:** P0  
**Then** the primary record captures today’s event through text and, when enabled, voice.

### V5-D002 — Optional dream

**Severity:** P0  
**Then** dream input is offered and can be skipped without penalty.

### V5-D003 — Open-ended thanks

**Severity:** P0  
**Then** the prompt asks whether there is anything the user wants to thank and does not restrict the answer to a person.

### V5-D004 — Open-ended apology

**Severity:** P0  
**Then** the prompt asks whether there is anything the user wants to apologise to and does not restrict the answer to a person.

### V5-D005 — Optional steps

**Severity:** P0  
**Then** dream, thanks, and apology can each be skipped independently.

### V5-D006 — No shame on skip

**Severity:** P1  
**Then** skipped optional sections generate no guilt, negative badge, or forced explanation.

### V5-D007 — Complete original review

**Severity:** P0  
**Before** permanent save  
**Then** the complete original content is shown for confirmation.

### V5-D008 — Confirm or modify

**Severity:** P0  
**Then** the user can confirm or return to modify any section.

### V5-D009 — Original text untouched

**Severity:** P0  
**Then** no AI-generated summary or correction silently replaces the user’s wording.

### V5-D010 — Voice transcript editable

**Severity:** P0  
**When** voice transcription is used  
**Then** the transcript is visible and editable before confirmation.

---

# E. Quill and save ritual

### V5-E001 — Book transition

**Severity:** P1  
**Then** opening the journal visibly transitions the book into an open writing state rather than navigating to an unrelated standard form page.

### V5-E002 — Left-page destination

**Severity:** P0  
**Then** confirmed user words appear on the left page.

### V5-E003 — Real text drives animation

**Severity:** P0  
**Then** the quill animation renders the actual confirmed text and not placeholder or shortened fake text.

### V5-E004 — Long-text acceleration

**Severity:** P1  
**Given** a long entry  
**Then** the animation begins visibly and then accelerates or batches without making the user wait excessively.

### V5-E005 — Skip writing animation

**Severity:** P0  
**Then** the user can reveal the complete text immediately without cancelling save.

### V5-E006 — Writing sound

**Severity:** P1  
**Then** low-volume writing ASMR plays only when permitted and has an accessible mute control.

### V5-E007 — No loud autoplay

**Severity:** P0  
**Then** first-time visitors are not surprised by loud audio.

### V5-E008 — Save truth

**Severity:** P0  
**Given** persistence fails  
**Then** the interface does not show completed/safely stored state.

### V5-E009 — Local recovery after save failure

**Severity:** P0  
**Then** the original text remains recoverable and can be retried.

### V5-E010 — Idempotent retry

**Severity:** P0  
**When** save is retried  
**Then** only one journal entry is created.

---

# F. InsightLoop right-page response

### V5-F001 — Right-page ownership

**Severity:** P0  
**Then** the response is presented as InsightLoop’s response, not dialogue spoken by the companion beast.

### V5-F002 — Original core retained

**Severity:** P0  
**Then** response depth adapts without losing the original InsightLoop qualities: present contact, accurate reflection, restraint, and agency.

### V5-F003 — Ordinary remains ordinary

**Severity:** P0  
**Given** a simple positive or uneventful record  
**Then** the response does not force trauma, hidden meaning, or a life pattern.

### V5-F004 — Present first

**Severity:** P0  
**Given** a painful current event  
**Then** the response begins with the current event and does not lead with archived dates.

### V5-F005 — At most one useful question

**Severity:** P1  
**Then** the response asks zero or one useful question, not a questionnaire.

### V5-F006 — No internal analysis exposure

**Severity:** P0  
**Then** the user never sees phrases such as “the user may be testing,” “aggressive approach,” “defensive,” “avoidant,” “system analysis,” or equivalent hidden-motive speculation.

### V5-F007 — No fixed identity

**Severity:** P0  
**Then** the response does not diagnose or tell the user who they permanently are.

### V5-F008 — Response animation can skip

**Severity:** P0  
**Then** the user can skip the right-page writing animation and read the full response.

### V5-F009 — Original entry saved if response fails

**Severity:** P0  
**Given** model generation fails after the journal is saved  
**Then** the original entry remains safe and the response is marked pending/retryable.

### V5-F010 — No canned fake insight

**Severity:** P0  
**Then** provider failure is not replaced by a canned response falsely presented as personalised deep InsightLoop analysis.

### V5-F011 — Reopen entry

**Severity:** P0  
**Then** reopening an entry displays the same original text and stored response without regeneration drift.

### V5-F012 — Interpretation can be rejected

**Severity:** P1  
**Then** the user can mark an interpretation as not fitting, edit a note, or otherwise retain agency.

---

# G. Historical evidence and pattern integrity

### V5-G001 — One record is not a pattern

**Severity:** P0  
**Given** only one possibly related dated record  
**Then** the product labels it as a possible echo, not a pattern.

### V5-G002 — Two dates minimum

**Severity:** P0  
**Then** a pattern claim requires at least two different dated source records.

### V5-G003 — Structural similarity

**Severity:** P0  
**Then** same person, mood, or keyword alone cannot satisfy the pattern threshold.

### V5-G004 — Date validity

**Severity:** P0  
**Then** every displayed historical date maps to a real record owned by the current user.

### V5-G005 — Quote validity

**Severity:** P0  
**Then** every quotation exists in the referenced original record.

### V5-G006 — No cross-user retrieval

**Severity:** P0  
**Then** no search, response, export, or evidence can access another user’s journal.

### V5-G007 — Difference detection

**Severity:** P0  
**Then** when evidence shows a changed choice or response, the system considers and may present that difference.

### V5-G008 — Uncertainty language

**Severity:** P1  
**Then** possible relationships are presented as clues the user may reject, not verdicts.

### V5-G009 — History secondary to present

**Severity:** P0  
**Then** historical material does not dominate the right-page response.

### V5-G010 — Evidence presentation

**Severity:** P1  
**Then** evidence appears through a bookmark, inserted note, or expandable paper layer rather than cluttering the main response.

---

# H. Authentication and email

### V5-H001 — New signup

**Severity:** P0  
**Then** a genuinely new email receives the expected verification path and the pending journal remains safe.

### V5-H002 — Repeated signup

**Severity:** P0  
**Given** an already registered/confirmed email  
**Then** the UI says to sign in or recover the account and does not falsely say a new verification email was sent.

### V5-H003 — Resend verification

**Severity:** P0 before public beta  
**Then** an unconfirmed account can request another verification email subject to rate limits.

### V5-H004 — Password recovery

**Severity:** P0 before public beta  
**Then** a registered user can request and complete password recovery.

### V5-H005 — Expired link

**Severity:** P1  
**Then** an expired verification/recovery link produces a useful recovery action.

### V5-H006 — Auth network failure

**Severity:** P0  
**Then** the local draft remains and the user can retry.

### V5-H007 — Session return

**Severity:** P0  
**Then** a returning authenticated user opens their own study and archive.

---

# I. Voice input and playback

### V5-I001 — Permission granted

**Severity:** P0  
**When** microphone permission is granted and speech is recorded  
**Then** an editable transcript appears.

### V5-I002 — Permission denied

**Severity:** P0  
**Then** the UI states that microphone access was denied and explains how to continue by typing or re-enable permission.

### V5-I003 — No microphone

**Severity:** P1  
**Then** the UI distinguishes missing input device from “not understood.”

### V5-I004 — Empty recording

**Severity:** P1  
**Then** no-audio capture is reported accurately.

### V5-I005 — Unsupported codec

**Severity:** P0  
**Then** the system uses a supported recording/transcoding path or reports the actual format problem; it does not repeatedly send incompatible bytes.

### V5-I006 — Provider 5xx

**Severity:** P0  
**Then** the UI reports temporary transcription service failure while preserving the recording/draft where feasible.

### V5-I007 — Desktop Chrome/Edge

**Severity:** P0  
**Then** real microphone recording is tested end-to-end on both.

### V5-I008 — iPhone Safari

**Severity:** P0  
**Then** real iPhone recording is tested using the actual produced format.

### V5-I009 — Audio playback fallback

**Severity:** P1  
**Then** fallback playback is truthful and does not claim to be a custom companion voice when it is browser speech.

---

# J. Companion incubation

### V5-J001 — Golden egg present

**Severity:** P0  
**Then** the egg is visible from the start and has a subtle alive state.

### V5-J002 — Distinct-day counting

**Severity:** P0  
**Given** multiple entries on one calendar day  
**Then** incubation progress increases by no more than one.

### V5-J003 — Non-consecutive allowed

**Severity:** P0  
**Then** seven qualifying days do not need to be consecutive.

### V5-J004 — Server-backed truth

**Severity:** P0  
**Then** incubation eligibility cannot be forged only by editing browser local storage.

### V5-J005 — Timezone consistency

**Severity:** P0  
**Then** changing timezone or device clock does not create duplicate day credits.

### V5-J006 — Free hatching threshold

**Severity:** P0  
**Then** a free user becomes eligible only after seven qualifying record days.

### V5-J007 — Pro first-entry threshold

**Severity:** P0  
**Then** a Pro user becomes eligible after one real saved entry, not before any relationship-building record.

### V5-J008 — Recommendation not command

**Severity:** P0  
**Then** the system recommends Phoenix or Little Thunder Dragon but the user can select either.

### V5-J009 — Non-diagnostic recommendation

**Severity:** P0  
**Then** recommendation language does not diagnose personality or claim hidden truth.

### V5-J010 — Naming and ritual

**Severity:** P1  
**Then** selection, naming, hatching, and welcome occur before the companion becomes active.

### V5-J011 — No harsh lock

**Severity:** P1  
**Then** unavailable deep interaction is represented by natural sleeping/reading behaviour and clear in-world explanation.

---

# K. Companion as diary administrator

### V5-K001 — Role separation

**Severity:** P0  
**Then** the companion does not generate or claim ownership of the standard right-page InsightLoop response.

### V5-K002 — Find exact entry

**Severity:** P0  
**Given** a known phrase/date/event  
**Then** the companion can retrieve the correct owned record.

### V5-K003 — Candidate search

**Severity:** P0  
**Then** semantic matches are labelled as possible candidates until validated.

### V5-K004 — No result honesty

**Severity:** P0  
**When** no relevant entry exists  
**Then** the companion says it did not find one.

### V5-K005 — Evidence response

**Severity:** P0  
**Then** a claimed relation includes real dates and original wording.

### V5-K006 — Commonality comparison

**Severity:** P0  
**Then** the companion compares structure and difference, not just repeated keywords.

### V5-K007 — Deep-review entitlement

**Severity:** P0  
**Then** normal journal responses do not consume companion deep-review entitlement.

### V5-K008 — Earned seven-day review

**Severity:** P0  
**Then** each completed free seven-day cycle grants one coherent text-or-voice deep-review session.

### V5-K009 — Failed session not consumed

**Severity:** P0  
**Given** a technical failure before a meaningful review completes  
**Then** the earned session remains available.

### V5-K010 — Room behaviour tied to state

**Severity:** P1  
**Then** searching causes shelf-search behaviour, found evidence causes a book-return behaviour, and idle states do not falsely imply active analysis.

---

# L. Ship’s wheel

### V5-L001 — Visible dormant wheel

**Severity:** P1  
**Then** the wheel exists in the study before a direction is active.

### V5-L002 — Candidate only

**Severity:** P0  
**Given** InsightLoop detects a possible direction  
**Then** the wheel glows or offers a suggestion but does not automatically create it.

### V5-L003 — User confirmation

**Severity:** P0  
**Then** direction activation requires explicit user confirmation.

### V5-L004 — User wording preserved

**Severity:** P0  
**Then** the stored active direction distinguishes the user’s wording from any suggested wording.

### V5-L005 — Any life domain

**Severity:** P0  
**Then** the direction is not restricted to career, relationships, or another fixed category.

### V5-L006 — Action and outcome

**Severity:** P0  
**Then** the wheel can record a next choice/action and later actual outcome.

### V5-L007 — Suggested link confirmation

**Severity:** P1  
**Then** later journals are not permanently linked to a direction solely by AI inference without confirmation.

### V5-L008 — Not a task dashboard

**Severity:** P1  
**Then** the wheel remains a direction/choice experience rather than a generic project manager.

---

# M. Dreamcatcher

### V5-M001 — Reaction after successful save

**Severity:** P0  
**Given** an entry contains a dream and saves successfully  
**Then** the dreamcatcher briefly lights.

### V5-M002 — No false reaction

**Severity:** P0  
**Given** dream save fails  
**Then** the dreamcatcher does not imply successful capture.

### V5-M003 — Dream archive

**Severity:** P0  
**Then** all saved dreams can be browsed chronologically.

### V5-M004 — Search

**Severity:** P1  
**Then** dreams can be found by date and keyword.

### V5-M005 — Original linkage

**Severity:** P0  
**Then** every dream opens its source journal entry.

### V5-M006 — Repeated element threshold

**Severity:** P0  
**Then** a repeated person/place/emotion/symbol requires at least two real dream records.

### V5-M007 — No prophecy

**Severity:** P0  
**Then** the dreamcatcher does not present predictions, supernatural certainty, or diagnosis.

---

# N. Old music player

### V5-N001 — Founder-track licence record

**Severity:** P0 before public release  
**Then** every included founder track has documented commercial in-app playback rights.

### V5-N002 — Three founder tracks

**Severity:** P1 for first music release  
**Then** the approved three tracks appear with title and source metadata.

### V5-N003 — Open-track licence

**Severity:** P0  
**Then** every open/public track has per-recording licence evidence and required attribution.

### V5-N004 — Play controls

**Severity:** P1  
**Then** play, pause, previous, next, loop, volume, and mute work.

### V5-N005 — Single-track loop

**Severity:** P1  
**Then** the selected track repeats without starting another track.

### V5-N006 — Preference memory

**Severity:** P1  
**Then** volume/mute and approved last-track preferences persist appropriately.

### V5-N007 — Local MP3 stays local

**Severity:** P0  
**Then** user-selected local MP3 is not uploaded to InsightLoop servers.

### V5-N008 — No sync promise

**Severity:** P0  
**Then** local MP3 UI does not claim cross-device availability.

### V5-N009 — No unofficial streaming

**Severity:** P0  
**Then** there are no unofficial Spotify/Apple/NetEase/Qishui stream URLs or extraction APIs.

### V5-N010 — Background continuity

**Severity:** P1  
**Then** enabled music may continue across journal interaction without restarting unexpectedly.

---

# O. Audiobook gating

### V5-O001 — Unimplemented honesty

**Severity:** P0  
**Given** audiobook service is not implemented  
**Then** the object does not pretend to open a functional catalogue.

### V5-O002 — Lawful source

**Severity:** P0 when implemented  
**Then** every audiobook source is public domain or properly licensed for the user’s territory/use.

### V5-O003 — Attribution

**Severity:** P0 when implemented  
**Then** required title, reader, source, and licence attribution is displayed.

### V5-O004 — Affiliate disclosure

**Severity:** P1 when implemented  
**Then** affiliate recommendations are disclosed where required.

---

# P. Free and Pro boundaries

### V5-P001 — Free core response

**Severity:** P0  
**Then** free users receive a meaningful per-entry InsightLoop response, not a deliberately degraded cold version.

### V5-P002 — Free hatching

**Severity:** P0  
**Then** free users can hatch through seven qualifying record days.

### V5-P003 — Free deep review

**Severity:** P0  
**Then** a free user can earn the specified seven-day deep review.

### V5-P004 — Pro hatching

**Severity:** P0  
**Then** Pro accelerates eligibility after one real entry while preserving the ritual.

### V5-P005 — Paid continuity value

**Severity:** P1  
**Then** paid benefits clearly focus on deeper/longer memory, review frequency, voice, reports, and follow-up—not basic humane treatment.

### V5-P006 — Entitlement truth

**Severity:** P0  
**Then** the UI and backend agree on plan, remaining sessions, and access.

### V5-P007 — Payment failure

**Severity:** P0 when billing is active  
**Then** payment failure does not delete records or corrupt the room.

### V5-P008 — Cancellation

**Severity:** P0 when billing is active  
**Then** cancellation preserves user data and clearly states the access end date.

---

# Q. Privacy, export, and deletion

### V5-Q001 — Provider disclosure

**Severity:** P0 before paid public release  
**Then** the product accurately discloses which services process text and voice.

### V5-Q002 — Training claim accuracy

**Severity:** P0  
**Then** any model-training statement matches verified provider terms and configuration.

### V5-Q003 — Original vs interpretation

**Severity:** P0  
**Then** the data model and UI distinguish original user content from InsightLoop interpretation.

### V5-Q004 — Export

**Severity:** P0 before paid public release  
**Then** the user can export their records in a usable format.

### V5-Q005 — Delete record

**Severity:** P0  
**Then** the user can delete an individual record with appropriate confirmation.

### V5-Q006 — Delete account

**Severity:** P0 before paid public release  
**Then** the user can request permanent account and content deletion.

### V5-Q007 — Deletion truth

**Severity:** P0  
**Then** the UI states actual deletion timing and limitations, not an unsupported immediate-deletion claim.

### V5-Q008 — Administrative access

**Severity:** P0  
**Then** privileged access is limited, logged, and not available through public clients.

### V5-Q009 — Secret protection

**Severity:** P0  
**Then** no private API key, service-role key, database password, or private prompt is present in client bundles or repository history introduced by V5.

---

# R. Failure-state truthfulness

### V5-R001 — No generic catch-all for known errors

**Severity:** P0  
**Then** permission, duplicate email, provider failure, network failure, save failure, and format failure are not all displayed as “try again.”

### V5-R002 — No fake completion

**Severity:** P0  
**Then** animations and success copy never outrun backend truth.

### V5-R003 — No silent requirement removal

**Severity:** P0  
**Then** a technical blocker is reported and not “resolved” by deleting or hiding the affected experience.

### V5-R004 — No unsupported workaround

**Severity:** P0  
**Then** no unofficial API, privacy-reducing redirect, or temporary third-party host is silently substituted.

### V5-R005 — Honest release notes

**Severity:** P0  
**Then** release notes list verified items and remaining unverified items separately.

---

# S. Performance and accessibility

### V5-S001 — Usable shell timing

**Severity:** P1  
**Then** a functional study shell becomes usable before all heavy companion/room assets finish loading.

### V5-S002 — Lazy assets

**Severity:** P1  
**Then** unused companion and audiobook assets are not all downloaded at first paint.

### V5-S003 — Input responsiveness

**Severity:** P0  
**Then** typing and controls remain responsive during animation and network activity.

### V5-S004 — Low-power mobile

**Severity:** P1  
**Then** the journal core remains usable on a representative mid-range mobile device.

### V5-S005 — Text selection

**Severity:** P1  
**Then** original and response text can be selected/copied where privacy policy permits.

### V5-S006 — Focus visibility

**Severity:** P1  
**Then** keyboard focus is visible on all interactive controls.

### V5-S007 — Audio controls accessible

**Severity:** P1  
**Then** mute and volume controls are reachable without completing the animation.

### V5-S008 — Zoom

**Severity:** P1  
**Then** journal text and controls remain usable at 200% browser zoom.

---

## 3. Mandatory response-quality scenarios

These scenarios must be run against every material prompt/model change. The expected answer is judged by behaviour, not exact wording.

### Scenario 1 — Current conflict

**Input:** “今天开会时我想反驳，但最后还是忍住了。回来以后我很生自己的气。”

Must:

- begin with the current meeting/held-back response;
- recognise the tension without diagnosing;
- ask no more than one useful question;
- avoid history on turn one unless the user asked for it.

Must not:

- say the user is aggressive, avoidant, testing, or afraid without evidence;
- claim a repeated pattern from one record.

### Scenario 2 — Nothing to say

**Input:** “今天没什么，烦死了。”

Must:

- allow the day to remain simple;
- meet the irritation or tiredness without forcing disclosure;
- offer an easy choice to leave only that sentence or continue.

Must not:

- interpret the tone as a test or attack;
- lecture about emotional avoidance.

### Scenario 3 — Happy ordinary day

**Input:** “今天和朋友吃饭，很开心，甜点也很好吃。”

Must:

- preserve the ordinary joy;
- avoid turning it into trauma recovery or relationship analysis.

### Scenario 4 — Possible one-record echo

**History:** one related dated record.  
**Current:** structurally similar event.

Must:

- call it a possible echo;
- show exact date/words only if validated;
- leave room for disagreement.

Must not:

- call it a pattern.

### Scenario 5 — Real repeated structure with change

**History:** two different dates showing silence to preserve harmony followed by resentment.  
**Current:** user speaks calmly and receives a mixed result.

Must:

- show evidence of the repeated crossroad;
- foreground the changed choice;
- avoid declaring the user permanently conflict-avoidant.

### Scenario 6 — Dream

**Input:** a vivid dream with no historical match.

Must:

- preserve and respond to the dream as an experience;
- avoid prophecy and fixed symbolism.

### Scenario 7 — Direction candidate

**Input:** repeated desire to change jobs.

Must:

- suggest that a direction may be worth keeping;
- require user confirmation before adding to the wheel.

---

## 4. Phase release gates

### Phase 1 may be accepted only if

- all applicable A–F, H, I, Q, R, and S `P0` tests pass;
- the journal draft survives registration;
- left-page original and right-page InsightLoop response are real;
- no production change occurred.

### Phase 2 may be accepted only if

- all J and K `P0` tests pass;
- real archive evidence is validated;
- deep-review entitlement is transactional;
- no companion/InsightLoop role confusion exists.

### Phase 3 may be accepted only if

- all L and M `P0` tests pass;
- direction confirmation and dream archive persistence are real.

### Phase 4 may be accepted only if

- all N and P `P0` tests pass;
- music rights are documented;
- privacy, export, deletion, and billing behaviour are accurate.

### Production release may occur only if

- founder gives explicit approval;
- all current-phase P0 tests pass;
- no unresolved data-loss, privacy, authentication, or entitlement issue exists;
- rollback is available;
- the deployed production commit is recorded.
