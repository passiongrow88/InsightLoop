# InsightLoop mascot media handoff

The app selects a companion action using this fixed convention:

`/mascots/{phoenix|thunder}/{action}.webm`

Both companions must supply every action below. The daily screen currently uses
`welcome`, `idle-breathe`, `listening`, `writing`, and `save-complete`; the
remaining states are reserved for real AI and memory evidence events.

- `idle-breathe`
- `welcome`
- `listening`
- `voice-listening`
- `writing`
- `thinking`
- `gentle-question`
- `review-today`
- `browse-archive`
- `memory-found`
- `pattern-found`
- `soft-sigh`
- `comfort`
- `quiet-celebrate`
- `save-complete`
- `resting`

## Delivery requirement

Seedance exports with a green screen cannot be used directly in the product.
Deliver each source animation first as `mp4` and preserve the original. Before web use, convert it to a **transparent WebM (VP9 + alpha)** with the green removed. Do not use CSS blend modes as a substitute; they create green fringing around the mascot.

The current shipped web derivatives are normalized to **720×720 at 24 fps**, VP9 with alpha, and remain below 1 MB each (about 16 MB for all 36 assets). Keep original MP4 masters outside this public web folder.

Only trigger `browse-archive`, `memory-found`, and `pattern-found` after the server has genuinely retrieved dated journal evidence. They must never be a decorative loading animation.

## Onboarding egg contract

New users first choose one companion, then see its egg, hatch it, and give the
companion a name. The egg paths are:

`/mascots/eggs/{phoenix|thunder}-{idle|hatch}.webm`

| Source master | Public web derivative |
| --- | --- |
| `E-01_PhoenixEgg_egg-idle.mp4` | `eggs/phoenix-idle.webm` |
| `E-02_PhoenixEgg_egg-hatch.mp4` | `eggs/phoenix-hatch.webm` |
| `E-03_ThunderDragonEgg_egg-idle.mp4` | `eggs/thunder-idle.webm` |
| `E-04_ThunderDragonEgg_egg-hatch.mp4` | `eggs/thunder-hatch.webm` |

## Action source mapping

For Phoenix, use `P-01` through `P-16`; for Thunder Dragon, use `T-01` through
`T-16`. The suffix after the second underscore is the exact web action name:

`idle-breathe`, `welcome`, `listening`, `voice-listening`, `writing`,
`thinking`, `gentle-question`, `review-today`, `browse-archive`,
`memory-found`, `pattern-found`, `soft-sigh`, `comfort`, `quiet-celebrate`,
`save-complete`, `resting`.

Example: `P-05_Phoenix_writing.mp4` becomes
`public/mascots/phoenix/writing.webm`; `T-05_ThunderDragon_writing.mp4`
becomes `public/mascots/thunder/writing.webm`.

Do not publish original masters in this folder. They are not loaded by the app.
