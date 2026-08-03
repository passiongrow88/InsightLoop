# InsightLoop V5 Product Operating Document

**Version:** V5.0  
**Status:** Founder-approved product baseline  
**Branch:** `v5/product-operating-system`  
**Purpose:** Convert the V5 product constitution into an executable user experience and business specification.

---

## 1. Product summary

InsightLoop V5 is a long-term awareness system experienced through a warm 2.5D private study.

The user does not begin from a dashboard, chat window, or login form. They enter a room containing meaningful objects:

- a journal for today’s record and the InsightLoop response;
- a golden companion egg that becomes a diary administrator;
- a ship’s wheel for user-confirmed directions and changed choices;
- a dreamcatcher for dream records;
- an old music player for study atmosphere;
- books or an audiobook object reserved for later-stage content.

The primary product value is not storage. It is the combination of:

1. preserving the user’s exact words;
2. responding to the present with the original InsightLoop warmth and depth;
3. building a trustworthy dated archive;
4. helping retrieve and compare relevant past records;
5. showing possible repetition and real differences;
6. helping the user choose and later verify a direction.

---

## 2. Product principles

### 2.1 One room, one world

All major V5 capabilities must belong naturally to the study. Core features must not appear as unrelated SaaS modules.

### 2.2 One primary recording flow

There is only one primary journal-entry flow. Previous separate structured journal forms may remain as internal data structures or an edit view, but not as a competing main entry point.

### 2.3 Original words are the source of truth

The user’s confirmed text is stored verbatim. Summaries, field extraction, response generation, and historical comparison are separate layers.

### 2.4 InsightLoop responds; the companion manages memory

The right-page response belongs to InsightLoop. The companion beast is a diary administrator and historical guide.

### 2.5 Evidence before pattern

The product must be willing to say “I found one possible echo” or “I do not have enough evidence yet.”

### 2.6 Technology serves the experience

Technical obstacles must be solved without silently replacing the confirmed experience.

---

## 3. Primary target user

V5 is designed for a person who:

- wants to record emotionally meaningful or ordinary life moments;
- dislikes rigid forms and clinical analysis;
- values warmth, privacy, and atmosphere;
- wants help finding an old entry without manually searching everything;
- wants to understand repeated choices over time;
- may use text or voice;
- is willing to return because the study feels personal and alive.

The product is not positioned as therapy, diagnosis, productivity software, or manifestation magic.

---

## 4. The study environment

### 4.1 Visual form

The approved direction is a fixed-angle 2.5D study with:

- layered depth;
- subtle parallax;
- local object animation;
- warm lighting;
- restrained ambient motion;
- responsive composition for desktop and mobile;
- no free-roaming 3D requirement for the first version.

### 4.2 Core object states

#### Journal

- idle on shelf or desk;
- hover/focus response;
- flies or transitions to the desk;
- opens to input flow;
- shows writing state;
- shows response state;
- returns to room.

#### Golden egg

- dormant;
- faint breathing/glow after first record;
- progress reactions across qualifying record days;
- recommended-companion state;
- hatching ceremony;
- companion present.

#### Companion beast

- sleeping;
- reading;
- organising journals;
- observing the journal from a distance;
- searching shelves;
- carrying a found book;
- ready for deep review;
- reacting to dreamcatcher or ship’s wheel.

#### Ship’s wheel

- visible but dormant;
- soft glow when a possible direction is detected;
- waiting for user confirmation;
- active when at least one direction exists;
- subtle response when an action or outcome is updated.

#### Dreamcatcher

- ambient idle;
- brief light reaction after a dream is saved;
- contains visual markers for dream entries;
- opens dream archive.

#### Old player

- off by default unless the user previously enabled playback;
- play/pause state;
- track selection;
- loop state;
- muted/volume state.

#### Audiobook object

- visible only when implemented;
- may remain decorative before the feature is released;
- must not imply unavailable content is already functional.

---

## 5. Entry before login

### 5.1 First open

An unauthenticated visitor sees a softly lit demonstration version of the study.

They do not see a full-screen login wall.

They can:

- look at the room;
- hover or tap objects;
- open the journal;
- start the first record;
- optionally start approved background music.

Locked or not-yet-earned objects may react subtly and explain themselves in-world. They must not become a grid of disabled buttons.

### 5.2 First record before account creation

The visitor can complete the journal input and preview experience before account creation.

The unsaved draft must persist locally during the flow.

Account creation is requested only when the user chooses to permanently save the entry and receive the full stored response.

### 5.3 Registration handoff

When registration begins:

- the journal draft remains intact;
- the study context remains visually connected;
- the user is told why an account is needed: to preserve the room and journal across visits;
- successful registration returns the user to the pending entry;
- the entry is then saved without requiring retyping.

### 5.4 Existing account

A returning user can select “I already have a room” or an equivalent in-world login action.

Repeated registration with an already confirmed email must not falsely promise another verification email. The interface must tell the user to sign in or use account recovery.

---

## 6. Journal flow

### 6.1 Flow overview

The journal flow contains four content opportunities:

1. Today’s event — primary and required for a normal entry.
2. Dream — optional.
3. Something to thank — optional and intentionally open-ended.
4. Something to apologise to — optional and intentionally open-ended.

“Something” is not limited to a person. It may be an animal, event, place, experience, self, opportunity, object, or anything the user chooses.

### 6.2 Step 1: open the journal

- The journal moves from its room position to the foreground.
- A aged-paper notebook opens with a quill nearby.
- The transition must feel intentional but remain fast.
- The user can skip prolonged motion if reduced-motion settings are enabled.

### 6.3 Step 2: today’s event

Prompt principle:

> Start with what happened. It does not need to sound important.

Input supports:

- typing;
- microphone recording;
- voice-to-text review before submission;
- editing at any time before confirmation.

The product must not force the user through a long questionnaire.

### 6.4 Step 3: dream

Prompt principle:

> Did a dream stay with you today?

Options:

- write or dictate it;
- skip.

If saved, the dream is stored as a distinct searchable field while remaining part of the full original entry.

### 6.5 Step 4: thanks

Prompt principle:

> Is there anything today that makes you want to say a real thank you?

Options:

- write it;
- skip.

No examples should be shown by default if they would narrow the user’s thinking.

### 6.6 Step 5: apology

Prompt principle:

> Is there anything today that makes you want to say sorry?

Options:

- write it;
- skip.

The product must not shame the user for skipping or having nothing to add.

### 6.7 Step 6: review original words

Before permanent save:

- show the complete original entry;
- separate sections visually without making them feel like a database record;
- allow “Confirm” and “Modify”;
- do not insert AI-generated wording into the original text;
- clearly preserve omitted optional sections as omitted, not as negative judgments.

### 6.8 Step 7: quill writes the original record

After confirmation:

- the quill begins writing the confirmed original words on the left page;
- low-volume writing ASMR may play;
- the first portion may animate at human pace;
- longer text may accelerate to avoid delay;
- tapping/clicking may complete the animation instantly;
- a mute control must remain accessible;
- reduced-motion mode must use a simpler transition.

This animation represents a real save operation. If persistence fails, the interface must not falsely present the record as safely stored.

### 6.9 Step 8: InsightLoop response

After the original record is safely captured:

- InsightLoop processes the full entry;
- the right page begins to receive the response through the quill;
- the companion beast does not speak this response;
- the response adapts in length to the record;
- ordinary entries stay ordinary;
- meaningful entries may receive more depth;
- the user can skip the writing animation and read the full response;
- text-to-speech may be offered separately when functional.

### 6.10 Step 9: finish

The user can:

- close the journal;
- reopen the saved entry;
- correct their original content with a visible edit history or updated timestamp;
- reject or annotate an interpretation;
- view historical evidence if InsightLoop used it;
- return to the study.

If a dream was recorded, the dreamcatcher reacts after successful save.

---

## 7. InsightLoop response operation

### 7.1 Response purpose

The response must make the person feel accurately met without sounding like a generic chatbot, therapist script, or internal model analysis.

### 7.2 Adaptive depth

#### Ordinary record

A brief response may:

- acknowledge the moment;
- preserve its tone;
- offer one small observation or no question.

#### Emotionally significant record

A deeper response may:

- name the concrete event;
- show the tension or human stake;
- distinguish fact, feeling, need, impulse, choice, and outcome when supported;
- ask at most one useful question.

#### Historically relevant record

Only after present contact, the response may:

- cite exact dates and original quotations;
- identify one possible echo;
- identify a pattern only with at least two different dated structurally similar records;
- state uncertainty;
- show both repetition and changed behaviour.

### 7.3 Historical presentation

Historical evidence should not overcrowd the right page.

Preferred presentation:

- a bookmark;
- inserted note;
- folded paper;
- expandable archive reference.

Each reference includes:

- date;
- exact or validated original quotation;
- why it may be related;
- language that leaves room for the user to disagree.

### 7.4 Forbidden response content

User-facing content must not say or imply:

- “the user is testing us”;
- “you are aggressive/defensive/avoidant/resistant” without explicit supported context;
- “the AI/system thinks”;
- “based on analysis”;
- a fixed personality diagnosis;
- certainty about fate, energy, past lives, or dream prophecy;
- certainty that physical illness is caused by emotion.

---

## 8. Companion egg and companion beast

### 8.1 Purpose

The companion beast exists to make the growing archive usable. It reduces the burden of manually searching hundreds of entries.

### 8.2 Free incubation

A qualifying record day is a calendar day on which the user permanently saves at least one valid journal entry.

Rules:

- multiple entries are allowed;
- no more than one incubation credit per calendar day;
- credits do not need to be consecutive;
- progress reaches hatching at seven qualifying days;
- deleting the only qualifying entry for a day may remove that day’s credit unless the system preserves an audit rule specified later;
- imported historical entries do not automatically count toward the emotional hatching ritual unless the founder later approves it.

### 8.3 Recommendation and choice

At hatching readiness:

- the system reviews only supported signals from the user’s records;
- it recommends Phoenix or Little Thunder Dragon;
- it explains the recommendation gently and non-diagnostically;
- the user can choose either companion regardless of recommendation;
- the user names the companion;
- the hatching and welcome ritual follows.

### 8.4 Pro incubation

A Pro user becomes eligible for the hatching ritual after completing one real saved journal entry.

Pro does not skip:

- recommendation;
- user choice;
- naming;
- hatching animation;
- welcome ritual.

### 8.5 Companion routine states

When no deep session is available, the companion remains alive in the room:

- reads;
- sleeps;
- organises shelves;
- watches the journal quietly;
- reacts to a newly stored dream or active direction.

The room must not show a harsh lock overlay on the companion.

### 8.6 Free deep-review access

After hatching, each completed seven-day record cycle grants one deep-review session.

A deep-review session:

- can use text or voice;
- can search the archive;
- may gather several relevant entries;
- can compare patterns and changes;
- should feel like one coherent review, not one token-limited reply;
- ends clearly when complete.

Normal InsightLoop journal responses remain available per entry and do not consume the companion deep-review session.

### 8.7 Pro deep-review access

Pro may provide:

- more frequent sessions;
- larger searchable history;
- voice conversation;
- proactive follow-up on previous directions;
- periodic trajectory reports;
- richer companion behaviours.

Exact usage limits and prices remain a commercial configuration, not a reason to alter product identity.

### 8.8 Companion search behaviour

The companion should support requests such as:

- “Find the entry where I wrote about resigning.”
- “Did I mention this person before?”
- “When did I last feel the same conflict?”
- “Show me the dream with the train.”
- “What seems common across these entries?”
- “What is different this time?”

Search results must distinguish:

- exact matches;
- semantic candidates;
- confirmed related entries;
- insufficient evidence.

The companion must never invent a missing entry.

---

## 9. Ship’s wheel — direction system

### 9.1 Purpose

The ship’s wheel stores a direction the user consciously wants to move toward or a choice they want to change.

### 9.2 Detection and confirmation

InsightLoop may notice a possible direction in a journal, for example repeated desire to leave a job or speak more honestly.

The wheel may glow subtly and ask:

> This sounds like a direction you may want to keep. Put it on the wheel?

The user can:

- add it;
- edit the wording;
- decline;
- postpone.

No direction is created automatically from an AI inference.

### 9.3 Direction record

A direction may contain:

- user-authored direction statement;
- why it matters;
- next smallest choice or action;
- fear or obstacle, if the user wants to record it;
- action date;
- follow-up date;
- actual outcome;
- what changed in the user’s understanding.

### 9.4 Follow-up

Later journal entries may be linked to a direction only when the user confirms the connection or the system clearly labels it as a suggestion.

The system should help verify reality rather than celebrate intention alone.

---

## 10. Dreamcatcher — dream archive

### 10.1 Save behaviour

After a dream is successfully saved:

- the dreamcatcher briefly lights;
- a subtle new visual marker may appear;
- the reaction must be calm, not a reward explosion.

### 10.2 Archive behaviour

The dreamcatcher opens a dream archive supporting:

- chronological browsing;
- keyword search;
- date filtering;
- reopening the original journal entry;
- later grouping by person, place, emotion, or symbol.

### 10.3 Pattern behaviour

The system may suggest a repeated dream element only when at least two real records support it.

It must use uncertain language and must not present symbolic interpretation as truth.

First-release priority is reliable storage, browsing, and search. Advanced dream analysis is secondary.

---

## 11. Old music player

### 11.1 Purpose

The player creates an atmosphere that helps the user remain in the study. It is not a full music platform.

### 11.2 First-release music sources

#### Founder tracks

The player may contain three founder-selected AI-generated tracks when the generating platform’s terms clearly permit commercial in-app playback and distribution to application users.

For every track, store:

- title;
- creator/source;
- generation platform;
- subscription or licence tier used;
- date generated or acquired;
- proof or archived terms;
- required attribution;
- permitted uses;
- restrictions.

#### Public or open tracks

Additional tracks may be used only after per-track licence review, such as:

- public-domain composition and recording;
- CC0 recording;
- compatible CC BY recording with correct attribution.

“Free to download” is not sufficient.

#### User local MP3

The user may select a local audio file.

First-release rule:

- play from the current device;
- do not upload to InsightLoop servers;
- do not promise cross-device sync;
- do not include the file in exports;
- disclose that playback depends on the local device/browser.

### 11.3 Player controls

First release includes:

- play/pause;
- previous/next track;
- single-track loop;
- volume;
- mute;
- track title and source/attribution;
- remember last selected approved track and volume;
- never autoplay loudly on first visit.

### 11.4 Later platform integrations

Apple Music, Spotify, NetEase Cloud Music, Qishui Music, or another provider may only be integrated through officially permitted commercial APIs and user authorisation.

Unofficial stream extraction, scraping, or unlicensed playback is prohibited.

---

## 12. Audiobooks

Audiobooks are not part of the first core release unless the core is stable.

A later version may include:

- public-domain audiobooks through a lawful source;
- saved listening position;
- quiet listening mode;
- properly attributed content;
- affiliate links to licensed commercial audiobook stores.

Affiliate revenue is supplementary. It must not drive product decisions that weaken journaling or memory.

---

## 13. Account, privacy, and user control

The “My room” or settings area must eventually provide:

- account identity;
- language;
- companion and room preferences;
- sound and reduced-motion controls;
- subscription status;
- privacy explanation;
- text/voice provider explanation;
- export records;
- delete selected record;
- permanently delete account and associated content;
- support/contact path.

The application must not claim end-to-end encryption, no-training guarantees, or deletion timing unless technically and contractually verified.

---

## 14. Free and Pro product boundaries

### Free must include

- entry into the study;
- first record before registration;
- persistent journal storage after registration;
- full original-word preservation;
- per-entry InsightLoop response;
- optional dream, thanks, and apology sections;
- archive access appropriate to the free plan;
- seven-day companion incubation;
- one deep review per completed seven-day cycle;
- ship’s wheel directions;
- dreamcatcher archive;
- approved default study music;
- local-device MP3 playback where supported.

### Pro may include

- hatching after first real saved entry;
- more frequent companion deep reviews;
- broader and longer-term archive search;
- voice deep reviews;
- periodic week/month/quarter/year reports;
- proactive direction follow-up;
- additional room, sound, and companion personalisation;
- higher processing limits;
- advanced export formats.

Free users must never receive a deliberately cold or low-quality InsightLoop response to force payment.

---

## 15. V5 phased delivery

### Phase 0 — Specification and protection

- Product Constitution
- POD
- Technical Guardrails
- Acceptance Tests
- Decision Log
- Agent instructions

### Phase 1 — Study shell and journal core

- unauthenticated study entry;
- journal interaction;
- today/dream/thanks/apology flow;
- local draft preservation;
- registration handoff;
- left-page original words;
- right-page InsightLoop response;
- skip/mute/reduced-motion support;
- reliable save and reopen.

### Phase 2 — Memory and companion

- qualifying record-day counter;
- egg progression;
- recommendation and user choice;
- hatching ceremony;
- companion room states;
- real journal search;
- evidence citations;
- seven-day deep review.

### Phase 3 — Direction and dreams

- ship’s wheel direction confirmation;
- action and outcome follow-up;
- dreamcatcher archive;
- dream search and validated repeated elements.

### Phase 4 — Atmosphere and commercial depth

- three licensed founder tracks;
- local MP3;
- approved open music;
- Pro limits and billing;
- privacy, export, and deletion completion;
- periodic trajectory reports.

### Phase 5 — Audiobook and authorised integrations

- lawful public-domain audiobook source;
- affiliate links where approved;
- authorised music integrations only when commercially viable.

---

## 16. Out of scope until explicitly approved

- free-roaming 3D room;
- multiplayer or social rooms;
- public journal feed;
- companion marketplace;
- random gacha mechanics;
- streak punishment;
- forced daily notifications;
- unlicensed music streaming;
- cloud upload of user music;
- automatic dream prophecy;
- automatic direction creation without confirmation;
- companion replacing InsightLoop responses;
- a second competing journal-entry module;
- migration to production before V5 acceptance.

---

## 17. Product success signals

Early validation should focus on whether users:

- understand the study and journal within 30 seconds;
- complete the first record before being asked to register;
- return to the room voluntarily;
- feel the right-page response truly meets the entry;
- trust the preservation of their original words;
- understand the companion as a memory administrator;
- experience a credible historical retrieval;
- choose a direction on the wheel;
- are willing to pay for deeper continuity rather than superficial decoration.

The product is not ready for commercial scaling if the room is beautiful but the journal response, memory retrieval, voice, save, registration, privacy, or evidence system is unreliable.
