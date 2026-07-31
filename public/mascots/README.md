# InsightLoop mascot media handoff

The app selects a companion action using this fixed convention:

`/mascots/{phoenix|thunder}/{action}.webp`

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

Green-screen exports cannot be used directly in the product. Deliver each
source animation first as `mp4` and preserve the original. Before web use,
convert it to a **transparent animated WebP** with the full green range,
smoke, glow and edge spill removed. Do not use CSS blend modes as a substitute;
they create green fringing around the mascot. The browser UI must load the
derivatives from this local directory, not an old GitHub raw URL.

The current shipped web derivatives are normalized to **320×320 at 12 fps**
and total about 14 MB for all 36 animations.
They use WebP alpha because the prior VP9 alpha delivery was rendered as an
opaque green square in the target preview browser. Keep original MP4 masters
outside this public web folder.

Only trigger `browse-archive`, `memory-found`, and `pattern-found` after the server has genuinely retrieved dated journal evidence. They must never be a decorative loading animation.

## Onboarding egg contract

New users first choose one companion, then see its egg, hatch it, and give the
companion a name. The egg paths are:

`/mascots/eggs/{phoenix|thunder}-{idle|hatch}.webp`

| Source master | Public web derivative |
| --- | --- |
| `E-01_PhoenixEgg_egg-idle.mp4` | `eggs/phoenix-idle.webp` |
| `E-02_PhoenixEgg_egg-hatch.mp4` | `eggs/phoenix-hatch.webp` |
| `E-03_ThunderDragonEgg_egg-idle.mp4` | `eggs/thunder-idle.webp` |
| `E-04_ThunderDragonEgg_egg-hatch.mp4` | `eggs/thunder-hatch.webp` |

## Action source mapping

For Phoenix, use `P-01` through `P-16`; for Thunder Dragon, use `T-01` through
`T-16`. The suffix after the second underscore is the exact web action name:

`idle-breathe`, `welcome`, `listening`, `voice-listening`, `writing`,
`thinking`, `gentle-question`, `review-today`, `browse-archive`,
`memory-found`, `pattern-found`, `soft-sigh`, `comfort`, `quiet-celebrate`,
`save-complete`, `resting`.

Example: `P-05_Phoenix_writing.mp4` becomes
`public/mascots/phoenix/writing.webp`; `T-05_ThunderDragon_writing.mp4`
becomes `public/mascots/thunder/writing.webp`.

`P-11_Phoenix_pattern-found.mp4` has a gray-green background instead of the
standard green screen. It requires edge-connected flood-fill matting; the
normal chroma-key settings remove parts of the phoenix's face.

Do not publish original masters in this folder. They are not loaded by the app.
