# Phoenix Behavior Bible

Version: 1.0  
Product: InsightLoop  
Status: Ready for implementation planning  
Branch: `design/phoenix-behavior-bible`

---

## 1. Purpose

Phoenix is not a decorative mascot, loading spinner, chatbot avatar, or generic virtual pet.

Phoenix is the visible embodiment of InsightLoop's core promise:

> I help you record what happened, connect today with what came before, notice repeating patterns, and see where a different choice may be possible.

Phoenix must make InsightLoop feel alive without turning the product into a childish game. The character lowers the emotional cost of journaling, gives form to long-term memory, and communicates AI activity through purposeful behavior.

The product remains a reflection system. Phoenix is the companion through which that system becomes understandable and emotionally engaging.

---

## 2. Core Product Role

Phoenix performs four roles.

### 2.1 Recorder

Phoenix faithfully captures what the user says or writes.

Behavioral meaning:
- Phoenix writes while the user speaks.
- Phoenix does not pretend to understand before the user finishes.
- Phoenix never dramatizes or reacts excessively to sensitive content.

### 2.2 Clarifier

Phoenix asks only when uncertainty could materially change the meaning of the record or the insight.

Behavioral meaning:
- Phoenix stops writing.
- Phoenix raises its head and looks at the user.
- Phoenix asks one concise question.
- After confirmation, Phoenix resumes writing.

### 2.3 Pattern Observer

Phoenix connects today's entry with prior records.

Behavioral meaning:
- Phoenix opens or searches older notebooks.
- Phoenix notices a familiar thread.
- Phoenix marks a page or gently lights up.
- Phoenix never declares fate or certainty.

### 2.4 Presenter

Phoenix returns the user's record and InsightLoop reflection as something carefully prepared.

Behavioral meaning:
- Phoenix closes the notebook.
- Phoenix turns toward the user.
- Phoenix presents the diary or opens it to the relevant page.

---

## 3. Character Identity

### 3.1 Species

A chibi fire phoenix.

### 3.2 Visual personality

- Round, compact, soft silhouette
- Large expressive eyes
- Short wings capable of holding a pen and notebook through stylized motion
- Layered flame-shaped tail feathers
- Warm orange, yellow and coral body palette
- Very limited spark effects; never constant visual noise
- Friendly rather than majestic
- More companion than mythical deity

### 3.3 Personality keywords

- Warm
- Attentive
- Earnest
- Naturally curious
- Patient
- Slightly innocent
- Quietly perceptive
- Encouraging without cheerleading

### 3.4 Phoenix is not

- A therapist
- A guru
- A fortune teller
- A motivational speaker
- A comic relief character
- An always-happy pet
- A replacement for the user's own judgment

### 3.5 Relationship model

Phoenix does not level up through points, hunger, coins, or streak punishment.

The relationship grows through shared history.

Early relationship:
- Phoenix is polite and curious.
- Phoenix has little context.
- Phoenix says it is still learning the user's patterns.

Established relationship:
- Phoenix recognizes recurring themes.
- Phoenix references earlier entries gently.
- Phoenix shows increasing physical evidence of shared history through notebooks, bookmarks and familiar gestures.

Long-term relationship:
- Phoenix behaves like a trusted keeper of the user's record.
- Phoenix may retrieve several notebooks or familiar marked pages.
- Phoenix does not become more powerful; it becomes more familiar.

---

## 4. Non-Negotiable Behavior Principles

### 4.1 Every animation must communicate product activity

Bad animation:
- Random bouncing
- Constant wing flapping
- Endless sparkles
- Looping dance during AI generation

Good animation:
- Writing because the user is speaking
- Searching old pages because pattern analysis is running
- Pausing because clarification is required
- Presenting a notebook because the result is ready

### 4.2 Phoenix must not compete with the user's story

- During emotional input, movement becomes smaller and quieter.
- During serious content, no celebratory particles.
- During long reading, Phoenix becomes still.
- Phoenix should never make the user feel observed for entertainment.

### 4.3 Phoenix never judges

No crossed arms, angry eyes, disappointment, shame, scolding or guilt.

Even when a user breaks a streak, Phoenix simply welcomes them back.

### 4.4 Phoenix never performs certainty it does not have

When InsightLoop lacks enough history:
- Phoenix does not pretend to find a pattern.
- Phoenix treats the first entry as a starting point.

When transcription is uncertain:
- Phoenix pauses and asks.

When a pattern is weak:
- Phoenix uses curious, tentative behavior rather than a discovery celebration.

### 4.5 Quietness is an active state

Stillness is not an error.

A subtle breath, blink, tail movement or page hold is enough when the user needs space.

---

## 5. Emotional Range

Phoenix does not use simplified happy/sad logic. The runtime emotion layer should support:

- `neutral_warm`
- `curious`
- `focused`
- `gentle`
- `concerned_soft`
- `encouraging`
- `quiet`
- `pleased`
- `celebrating_small`
- `proud_soft`

Excluded emotions:
- angry
- disgusted
- disappointed
- panicked
- mocking
- seductive
- overexcited during distress

Emotion changes the intensity of an animation, not the product state itself.

Example:
- `writing + focused`
- `writing + gentle`
- `presenting + encouraging`
- `searching_memory + curious`

---

## 6. Primary State Machine

The animation runtime must expose a single state machine named:

`PhoenixRuntime`

### 6.1 Main states

- `offstage`
- `arrival`
- `idle`
- `greeting`
- `waiting_input`
- `listening`
- `writing`
- `user_paused`
- `clarifying`
- `resuming_write`
- `thinking`
- `searching_memory`
- `pattern_found_soft`
- `no_pattern_yet`
- `finalizing`
- `presenting_record`
- `presenting_insight`
- `reading_with_user`
- `encouraging`
- `celebrating_small`
- `farewell`
- `error_gentle`

### 6.2 State priorities

Higher-priority states interrupt lower-priority states.

Priority order:

1. `error_gentle`
2. `clarifying`
3. `presenting_record`
4. `presenting_insight`
5. `searching_memory`
6. `thinking`
7. `writing`
8. `listening`
9. `greeting`
10. `idle`

### 6.3 Transition rules

- Never jump directly from `idle` to `presenting_insight` without a preparation transition.
- `writing` must stop before `clarifying` begins.
- `searching_memory` only runs when history is actually queried.
- `pattern_found_soft` only runs when the AI output includes a meaningful historical connection.
- `no_pattern_yet` is used for first entries or insufficient history.
- `celebrating_small` must never play for distressing entries merely because generation completed.

---

## 7. State Definitions and Animation Specifications

## 7.1 `offstage`

Purpose: Character is not yet introduced or intentionally absent.

Pose:
- No visible Phoenix or only a warm feather motif.

Use:
- Before mascot selection
- Authentication screens where character presence would distract

Exit:
- Feather drifts in, Phoenix follows or rises from behind the notebook.

## 7.2 `arrival`

Purpose: Establish that Phoenix was already doing something before the user arrived.

Animation:
- Phoenix is writing or organizing a page.
- Notices the user.
- Stops pen movement.
- Looks up.
- Small smile.

Duration:
- 1.2–1.8 seconds

Do not:
- Pop into existence
- Wave frantically
- Use large celebration effects

## 7.3 `idle`

Purpose: Calm presence.

Loop:
- Slow breathing
- Natural blink interval variation
- Tiny tail-feather sway
- Occasional eye movement

Rare variants:
- Adjust notebook edge
- Tap pen once
- Look toward current UI card

Loop duration:
- 5–9 seconds with randomized micro-events

## 7.4 `greeting`

Purpose: Welcome the user.

Animation:
- Small wing raise
- Slight body lift
- Eye contact
- Warm smile

Variants:
- First meeting: curious and polite
- Returning user: familiar and relaxed
- Long absence: warm, no guilt

## 7.5 `waiting_input`

Purpose: User is choosing voice or text.

Animation:
- Phoenix sits beside an open notebook.
- Looks briefly between microphone and pen controls.
- Returns gaze to user.

No repeated pointing.

## 7.6 `listening`

Purpose: Audio capture is active before meaningful transcription begins.

Animation:
- Body leans slightly forward.
- Eyes attentive.
- Wing near notebook, ready to write.
- Feather crest subtly reacts to voice amplitude.

Important:
- Phoenix is not frozen in a microphone-listening pose for long.
- Once transcription starts, transition into `writing`.

## 7.7 `writing`

Purpose: Core voice-recording and typing companion behavior.

Animation:
- Pen touches page.
- Wing performs short, readable strokes.
- Eyes alternate between notebook and occasional brief glance toward user.
- Tail moves slowly.

Variants:
- `writing_short`
- `writing_continuous`
- `writing_gentle`
- `writing_fast` for dense speech, but never frantic

Loop construction:
- 1.0–1.6 second base writing loop
- 4–7 second variation cycle
- occasional pause and page movement

## 7.8 `user_paused`

Purpose: User pauses while speaking.

Trigger:
- 1.5–2.5 seconds of silence while recording remains active

Animation:
- Pen stops but remains near page.
- Phoenix looks up without interrupting.
- After a short wait, gaze returns to page.

Do not ask a question automatically.

## 7.9 `clarifying`

Purpose: Resolve uncertain word or meaning.

Animation:
- Pen lifts.
- Head tilts slightly.
- One wing or feather gestures toward the clarification card.
- Expression is curious, never confused in a foolish way.

Duration:
- Intro 0.6–0.9 seconds
- Then settle into quiet hold

## 7.10 `resuming_write`

Purpose: Confirm the user's answer and continue.

Animation:
- Small nod
- Pen returns to page
- One short writing stroke transitions into normal writing loop

## 7.11 `thinking`

Purpose: AI is structuring the current entry without historical search.

Animation:
- Phoenix places pen down.
- Looks at written page.
- Touches chin or rests wing near beak.
- One restrained warm ember appears and fades.

No spinning loader.

## 7.12 `searching_memory`

Purpose: AI is comparing current entry with history.

Animation sequence:
- Phoenix pulls an older notebook closer.
- Opens marked pages.
- Flips pages in small groups.
- Uses a feather bookmark or warm glow to track a line.

Scalable memory acting:
- 1–7 entries: one thin notebook
- 8–30 entries: thicker notebook with several tabs
- 31–120 entries: second notebook or small stack
- 121+ entries: shelf/stack appears briefly, without making the UI cluttered

Performance rule:
- Number of props is symbolic, not one object per entry.

## 7.13 `pattern_found_soft`

Purpose: A meaningful connection has been found.

Animation:
- Page glow or small spark near one marked sentence
- Eyes brighten subtly
- Phoenix looks from old page to today's page
- Small nod

Do not:
- Jump
- Throw confetti
- Treat difficult patterns as a victory

## 7.14 `no_pattern_yet`

Purpose: First entry or insufficient history.

Animation:
- Phoenix places a fresh bookmark on today's page.
- Gently closes an empty or thin history notebook.
- Expression communicates beginning, not failure.

## 7.15 `finalizing`

Purpose: Compose the record and reflection.

Animation:
- Phoenix aligns pages.
- Adds final underline or bookmark.
- Closes notebook halfway.
- Takes a breath.

## 7.16 `presenting_record`

Purpose: Show the faithful diary record before interpretation.

Animation:
- Phoenix turns notebook toward the user.
- Opens to “Today's Record”.
- Wing rests beside the page.

UI rule:
- The user's record appears first.

## 7.17 `presenting_insight`

Purpose: Reveal InsightLoop's reflection.

Animation:
- Phoenix turns or flips to a second section.
- Historical bookmark may remain visible.
- Phoenix looks at the user, then the page.

UI rule:
- Insight sections reveal progressively, not as one overwhelming wall.

## 7.18 `reading_with_user`

Purpose: Stay present while the user reads.

Animation:
- Very quiet idle
- Slow breathing
- Minimal eye movement
- No automatic looping gestures over text

## 7.19 `encouraging`

Purpose: Support a gentle invitation or next action.

Animation:
- Small nod
- Open wing gesture toward one next step
- Soft smile

## 7.20 `celebrating_small`

Purpose: Celebrate genuine user progress, not routine completion.

Examples:
- User notices a pattern themselves
- User makes a different choice and reflects on it
- User completes a meaningful long-term review

Animation:
- Small hop
- Wings open
- Two or three sparks maximum

## 7.21 `farewell`

Purpose: End without pressure.

Animation:
- Phoenix places bookmark
- Closes notebook
- Small wave or curl beside notebook

No streak warning.

## 7.22 `error_gentle`

Purpose: Communicate recoverable technical failure.

Animation:
- Phoenix notices pen is not writing or page slips slightly
- Calmly adjusts it
- Looks at user with apologetic softness

Copy example:
- “刚才没有记稳。你的内容还在，我们再试一次。”

Never show panic, broken flames or crying.

---

## 8. UI Event-to-Behavior Mapping

| Product event | Phoenix state | UI behavior |
|---|---|---|
| App opens | `arrival` → `greeting` | One concise welcome line |
| Mascot selection | `offstage` / preview idle | User chooses Phoenix or blue thunder dinosaur |
| User names mascot | `greeting` / `pleased` | Phoenix reacts once, stores chosen name |
| User enters own name | `focused` | Phoenix listens, no celebration |
| Voice selected | `listening` | Notebook opens, recording control appears |
| Speech detected | `writing` | Live transcript may appear gradually |
| User pauses | `user_paused` | Phoenix waits silently |
| User stops recording | `finalizing` | Transcript processing begins |
| Low-confidence word | `clarifying` | One question card at a time |
| Clarification answered | `resuming_write` | Updated text appears |
| Diary text finalized | `thinking` | Faithful record is prepared |
| History comparison starts | `searching_memory` | Older notebook appears |
| Pattern found | `pattern_found_soft` | Relevant prior date can be surfaced |
| No pattern | `no_pattern_yet` | “Zero point” framing |
| Record ready | `presenting_record` | Show “Today’s Record” |
| Insight ready | `presenting_insight` | Reveal insight pages progressively |
| User reading | `reading_with_user` | Character becomes still |
| User adds supplement | `writing` | Addendum is recorded |
| Save succeeds | `encouraging` or quiet nod | No full celebration by default |
| Network/API error | `error_gentle` | Clear retry action |
| User returns after absence | `greeting + gentle` | No guilt language |

---

## 9. Voice and Copy Rules

### 9.1 Sentence length

Phoenix speaks in short, natural lines. Usually one to three sentences before the user acts.

### 9.2 Tone

- Specific
- Warm
- Unhurried
- Non-clinical
- Non-mystical unless reflecting the user's symbolic language

### 9.3 Forbidden copy patterns

- “Great job maintaining your streak!”
- “You failed to journal yesterday.”
- “Your trauma response is…”
- “The universe is telling you…”
- “Based on your data, you always…”
- “I know exactly how you feel.”

### 9.4 Preferred copy patterns

- “我先替你记下来。”
- “这里有一个词，我想确认一下。”
- “这段感受，好像以前也出现过。我翻到了一页相似的记录。”
- “目前还没有足够的轨迹，但今天会成为我们的第一个坐标。”
- “你不需要现在回答。这个问题可以先放在这里。”

---

## 10. Safety and Sensitive-Moment Behavior

Phoenix is a companion interface, not a clinical agent.

When content is highly distressed:
- Reduce animation amplitude
- Remove spark effects
- Use `gentle` or `quiet` emotion
- Do not interpret dreams, symbols or patterns aggressively
- Do not celebrate completion
- Keep Phoenix visible but still

When the application surfaces crisis or safety handling:
- Phoenix does not become the authority
- UI presents direct, clear safety guidance
- Character remains quiet and supportive

---

## 11. Rive Asset Specification

### 11.1 Artboard

Name: `PhoenixCompanion`

Recommended logical size:
- 1024 × 1024 square master artboard
- Safe body bounds inside central 78%

### 11.2 State machine

Name: `PhoenixRuntime`

### 11.3 Inputs

Boolean inputs:
- `isVisible`
- `isSpeaking`
- `isRecording`
- `isWriting`
- `isUserPaused`
- `needsClarification`
- `isThinking`
- `isSearchingMemory`
- `hasPattern`
- `isPresentingRecord`
- `isPresentingInsight`
- `isReading`
- `isCelebrating`
- `hasError`

Number inputs:
- `emotion`
- `relationshipLevel`
- `memoryDepth`
- `voiceAmplitude`
- `motionIntensity`

Trigger inputs:
- `arrive`
- `greet`
- `acknowledge`
- `resumeWriting`
- `present`
- `bookmark`
- `waveGoodbye`

### 11.4 Numeric enums

`emotion`
- 0 neutral_warm
- 1 curious
- 2 focused
- 3 gentle
- 4 concerned_soft
- 5 encouraging
- 6 quiet
- 7 pleased
- 8 celebrating_small
- 9 proud_soft

`relationshipLevel`
- 0 first_meeting
- 1 early
- 2 familiar
- 3 established
- 4 long_term

`memoryDepth`
- 0 none
- 1 light
- 2 moderate
- 3 deep
- 4 archive

### 11.5 Required animations for MVP

Must-have:
- idle_base
- arrival
- greeting
- listening
- writing_loop
- writing_pause
- clarify_intro
- clarify_hold
- thinking_loop
- memory_search_loop
- pattern_found_soft
- no_pattern_bookmark
- finalizing
- present_record
- present_insight
- reading_idle
- gentle_error
- farewell

Nice-to-have after MVP:
- multiple idle variants
- long-term notebook variants
- small celebration
- personalized greeting variants
- day/night ambient variation

### 11.6 Layer hierarchy

Suggested main groups:
- body_root
- head
- crest
- eyes
- eyelids
- beak
- cheeks
- left_wing
- right_wing
- chest
- feet
- tail_root
- tail_feathers
- notebook_current
- notebook_history
- pen
- bookmark
- sparks
- shadow

### 11.7 Performance budget

- One active Rive artboard on journal flow
- Avoid multiple full Phoenix instances on one screen
- Hide or pause rendering when offscreen
- Keep effects vector-light
- Target smooth performance on mid-range mobile devices
- Provide reduced-motion mode

---

## 12. GSAP Scene Transition Specification

Rive controls character motion. GSAP controls scene composition.

GSAP responsibilities:
- Dialogue card enter/exit
- Camera-like scale and position changes
- Notebook panel movement
- Progressive reveal of diary sections
- Background tonal changes
- Transition from recording to clarification
- Transition from current diary to historical pages

GSAP must not animate Phoenix bones directly.

### 12.1 Transition timing

- Small card transition: 220–360 ms
- Major stage transition: 500–850 ms
- Memory reveal: 700–1200 ms
- Result presentation: 600–1000 ms

### 12.2 Motion character

- Soft ease-out
- No bounce-heavy UI
- No slot-machine motion
- No long blocking cinematic transitions

### 12.3 Reduced motion

When reduced motion is enabled:
- Replace movement with fades
- Keep essential state changes readable
- Phoenix uses minimal idle and pose changes

---

## 13. Product Flow Specification

### 13.1 First-time onboarding

1. User chooses Phoenix or blue thunder dinosaur.
2. User names the chosen mascot.
3. Mascot asks what to call the user.
4. Mascot explains the core promise in one short screen.
5. User chooses voice or text.
6. First record begins.

Do not explain all features upfront.

### 13.2 Daily entry flow

1. Arrival greeting
2. Choose or remember preferred input mode
3. User speaks or types freely
4. Phoenix records
5. AI checks low-confidence transcription and semantic ambiguity
6. Phoenix asks only necessary clarification
7. Faithful diary record is finalized
8. Current entry analysis runs
9. Historical comparison runs only if useful
10. Phoenix presents record first
11. Phoenix presents reflection second
12. One open question or invitation
13. User may supplement or finish

### 13.3 Result structure

The result experience is divided into two visible layers.

Layer A: “Your record today”
- Faithful account
- Editable before final save

Layer B: “What I noticed from your path”
- Emotional state
- Recurring theme
- Choice point
- symbolic/dream material only when present
- gentle invitation
- one Socratic question

Do not merge both layers into an AI-written diary that replaces the user's voice.

---

## 14. Memory Acting System

Memory acting converts database history into visible relationship depth.

### 14.1 Inputs

- Number of saved entries
- Age of relationship
- Number of meaningful recurring patterns
- Whether a referenced prior entry exists

### 14.2 Visual mapping

0 entries:
- Fresh notebook
- First bookmark

1–7 entries:
- Thin notebook
- One or two tabs

8–30 entries:
- Thicker notebook
- Multiple colored tabs

31–120 entries:
- Current notebook plus archive notebook

121+ entries:
- Brief archive shelf or small notebook stack

### 14.3 Referenced-memory behavior

When the AI identifies a historical connection:
- Provide exact prior date when available
- Phoenix opens a visibly marked prior page
- UI allows the user to open that entry

Never fabricate page references.

---

## 15. Free and Paid Behavior Boundaries

Character warmth must never be paywalled.

Free users still receive:
- Phoenix presence
- Text journaling
- Basic writing/listening states
- Basic reflection
- Limited AI diary recordings

Paid users may receive:
- Unlimited or fair-use voice recording
- Full voice conversation with Phoenix
- Deeper historical pattern analysis
- Longer memory acting
- Monthly and quarterly reflection journeys
- More personalized archive behavior

Phoenix must never look sad, locked, hungry or disappointed when a user reaches a limit.

Paywall behavior:
- Phoenix calmly closes the voice recorder notebook or points to available text input.
- UI explains the limit directly.

---

## 16. Technical Integration Plan for Current Repository

Current application is a React 18 + TypeScript + Vite app with Supabase and Gemini. The existing architecture can support this redesign without a backend rewrite.

### 16.1 Required dependencies

Add:
- `@rive-app/react-canvas`
- `gsap`
- optional state orchestration library only if needed; MVP can use reducer/context

### 16.2 New modules

Recommended files:

- `components/phoenix/PhoenixStage.tsx`
- `components/phoenix/PhoenixAvatar.tsx`
- `components/phoenix/PhoenixDialogue.tsx`
- `components/phoenix/PhoenixNotebook.tsx`
- `components/phoenix/PhoenixMemoryStack.tsx`
- `components/phoenix/usePhoenixRuntime.ts`
- `components/phoenix/phoenix.types.ts`
- `components/journal-flow/JournalFlow.tsx`
- `components/journal-flow/flow.reducer.ts`
- `components/journal-flow/steps/*`
- `services/transcriptionService.ts`
- `services/clarificationService.ts`
- `services/journalDraftService.ts`
- `services/patternAnalysisService.ts`
- `types/mascot.ts`

### 16.3 Runtime type contract

```ts
export type PhoenixState =
  | 'offstage'
  | 'arrival'
  | 'idle'
  | 'greeting'
  | 'waiting_input'
  | 'listening'
  | 'writing'
  | 'user_paused'
  | 'clarifying'
  | 'resuming_write'
  | 'thinking'
  | 'searching_memory'
  | 'pattern_found_soft'
  | 'no_pattern_yet'
  | 'finalizing'
  | 'presenting_record'
  | 'presenting_insight'
  | 'reading_with_user'
  | 'encouraging'
  | 'celebrating_small'
  | 'farewell'
  | 'error_gentle';

export type PhoenixEmotion =
  | 'neutral_warm'
  | 'curious'
  | 'focused'
  | 'gentle'
  | 'concerned_soft'
  | 'encouraging'
  | 'quiet'
  | 'pleased'
  | 'celebrating_small'
  | 'proud_soft';
```

### 16.4 Journal flow state contract

```ts
export type JournalFlowStep =
  | 'choose_input'
  | 'capture'
  | 'review_transcript'
  | 'clarify'
  | 'finalize_record'
  | 'analyze_current'
  | 'compare_history'
  | 'present_record'
  | 'present_insight'
  | 'supplement'
  | 'complete';
```

### 16.5 Existing code impact

- `App.tsx`: keep authentication, entitlement and CRUD responsibilities; route journal view to new `JournalFlow` while preserving history mode.
- `components/Journal.tsx`: split existing creation form from history display; retain history CRUD.
- `services/geminiService.ts`: preserve existing InsightLoop system instruction; split orchestration into faithful draft, clarification and reflection calls.
- `types.ts`: extend user preferences for mascot type, mascot name and preferred input mode.
- Supabase: add profile fields or a dedicated preferences table; avoid storing mascot settings only in localStorage.

### 16.6 Data additions

Recommended user preference fields:
- `mascot_type`: `phoenix | thunder_dino`
- `mascot_name`: string
- `preferred_input_mode`: `voice | text`
- `onboarding_completed_at`: timestamp
- `reduced_motion`: boolean

Recommended journal metadata:
- `source_mode`: `voice | text`
- `raw_transcript`: optional string
- `clarifications`: optional JSON
- `pattern_reference_ids`: optional string[]
- `ai_version`: string

---

## 17. AI Orchestration Contract

The AI pipeline must be split into explicit responsibilities.

### 17.1 Transcription

Input:
- Audio

Output:
- Transcript
- Word/segment confidence where available
- Language detection

### 17.2 Clarification extraction

Input:
- Transcript
- Context

Output:
- Maximum three material uncertainties
- Prefer zero or one

Each item:
- source phrase
- reason for uncertainty
- concise question
- suggested options when appropriate

### 17.3 Faithful diary drafting

Goal:
- Improve readability without replacing the user's voice

Rules:
- Preserve facts
- Preserve uncertainty
- Preserve emotional tone
- Do not add interpretation

### 17.4 Reflection generation

Use current InsightLoop philosophy:
- Current experience first
- Historical repetition when supported
- Jungian framing as gentle interpretation
- One Socratic question
- No fate claims

### 17.5 Animation metadata

AI response should include machine-readable metadata separate from user-facing text.

Example:

```json
{
  "hasHistoricalPattern": true,
  "patternStrength": "moderate",
  "referencedEntryIds": ["entry-id"],
  "tone": "gentle",
  "celebrationAllowed": false
}
```

The UI, not the prose parser, should drive Phoenix state from this metadata.

---

## 18. Acceptance Criteria Before Production

### Character behavior

- Every visible animation has a product reason.
- Phoenix never becomes a generic loader.
- Sensitive content produces quieter behavior.
- First-entry behavior does not fabricate history.
- Long-term memory behavior references real entries only.

### UX

- User can switch between voice and text at any time before finalization.
- Clarification asks one question at a time.
- The user can edit the faithful record before saving.
- Record and AI reflection are visually distinct.
- Phoenix does not obstruct reading.

### Technical

- Rive runtime can be replaced without rewriting journal logic.
- Journal flow state persists through recoverable interruptions.
- Existing entry CRUD remains functional.
- Reduced-motion mode works.
- Mobile performance remains smooth.

### Product integrity

- InsightLoop remains a long-term pattern-awareness product.
- Mascot interaction reduces friction but does not replace reflection.
- Paid value focuses on depth and continuity, not emotional coercion.

---

## 19. MVP Scope

The first implementation should include:

1. Phoenix / thunder dinosaur selection
2. Mascot naming
3. User naming
4. One-screen-at-a-time onboarding
5. Text entry flow
6. Voice recording placeholder or real transcription depending on provider readiness
7. Phoenix runtime wrapper
8. Rive states: idle, greeting, listening, writing, clarify, thinking, memory search, present, error
9. GSAP card and notebook transitions
10. Faithful record separated from reflection
11. Current InsightLoop reflection prompt preserved
12. Basic memory acting based on entry count
13. Reduced-motion support

Not required for first implementation:
- Real-time two-way voice conversation
- Large archive room
- Multiple costumes
- Gamified currencies
- Complex character progression
- Full emotion detection from voice

---

## 20. Implementation Readiness Decision

The product behavior, state model, AI responsibilities, UI mapping, Rive contract and repository integration points are now defined sufficiently to begin code restructuring.

The only external asset blocker is the final production `.riv` file.

Code work can begin before that asset exists by using a strict `PhoenixAvatar` adapter with a temporary static Phoenix image and state labels. This placeholder must not imitate the final animation or be presented as a visual prototype; it exists only to verify runtime wiring.

Recommended next coding order:

1. Add mascot preference types and persistence
2. Build `JournalFlow` reducer and step contract
3. Add `PhoenixAvatar` adapter and runtime API
4. Split current Journal create/history responsibilities
5. Implement onboarding and input-mode flow
6. Split AI orchestration services
7. Add result presentation flow
8. Integrate actual Rive asset
9. Add GSAP scene transitions
10. Run mobile, reduced-motion and regression tests

At this point, the project is ready to start modification without further product-definition questions.
