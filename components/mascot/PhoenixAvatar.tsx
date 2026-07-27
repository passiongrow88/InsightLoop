import React, { useEffect, useMemo, useState } from "react";
import type { MascotType, PhoenixState } from "../../types";

interface PhoenixAvatarProps {
  mascotType: MascotType;
  name: string;
  state: PhoenixState;
  reducedMotion?: boolean;
  showMotionPreview?: boolean;
}

const STATE_LABELS: Record<PhoenixState, string> = {
  idle: "安静陪伴",
  greeting: "欢迎回来",
  listening: "认真倾听",
  writing: "正在记录",
  thinking: "正在思考",
  searchingMemory: "翻阅共同记录",
  clarifying: "确认一个细节",
  presenting: "把日记交给你",
  celebrating: "为你开心",
  concerned: "温柔陪着你",
  error: "稍等一下",
};

const MOTION_PREVIEWS: Array<{ state: PhoenixState; label: string }> = [
  { state: "idle", label: "待机" },
  { state: "greeting", label: "欢迎" },
  { state: "listening", label: "倾听" },
  { state: "thinking", label: "思考" },
  { state: "writing", label: "写作" },
  { state: "searchingMemory", label: "回忆" },
  { state: "presenting", label: "递交" },
  { state: "celebrating", label: "开心" },
];

const PhoenixArtwork: React.FC<{ state: PhoenixState }> = ({ state }) => (
  <svg
    className={`phoenix-scene phoenix-state-${state}`}
    viewBox="0 0 360 330"
    role="img"
    aria-label={`火凤凰动作：${STATE_LABELS[state]}`}
  >
    <defs>
      <radialGradient id="phoenix-aura" cx="50%" cy="48%" r="55%">
        <stop offset="0%" stopColor="#fff7c2" stopOpacity="0.95" />
        <stop offset="48%" stopColor="#ffcc7a" stopOpacity="0.34" />
        <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="phoenix-body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffea70" />
        <stop offset="42%" stopColor="#ff9b32" />
        <stop offset="100%" stopColor="#f04438" />
      </linearGradient>
      <linearGradient id="phoenix-wing" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor="#fff28a" />
        <stop offset="45%" stopColor="#ff9a32" />
        <stop offset="100%" stopColor="#df2e38" />
      </linearGradient>
      <linearGradient id="phoenix-tail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffdd55" />
        <stop offset="46%" stopColor="#ff7235" />
        <stop offset="100%" stopColor="#db2443" />
      </linearGradient>
      <filter id="phoenix-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="7" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#b54825" floodOpacity="0.2" />
      </filter>
    </defs>

    <ellipse className="phoenix-aura" cx="180" cy="158" rx="128" ry="118" fill="url(#phoenix-aura)" />
    <ellipse className="phoenix-ground" cx="180" cy="292" rx="60" ry="11" fill="#a85025" opacity="0.13" />

    <g className="memory-orbit">
      <circle cx="180" cy="158" r="108" fill="none" stroke="#ffba68" strokeWidth="2" strokeDasharray="5 12" opacity="0.6" />
      <circle className="memory-dot memory-dot-one" cx="180" cy="50" r="5" fill="#ff8a38" />
      <circle className="memory-dot memory-dot-two" cx="273" cy="212" r="4" fill="#ffd464" />
      <circle className="memory-dot memory-dot-three" cx="86" cy="205" r="3.5" fill="#f34a41" />
    </g>

    <g className="ember-field" aria-hidden="true">
      <circle className="ember ember-one" cx="92" cy="100" r="4" fill="#ff9349" />
      <circle className="ember ember-two" cx="270" cy="126" r="3" fill="#ffcd62" />
      <circle className="ember ember-three" cx="250" cy="64" r="4" fill="#f75c47" />
      <circle className="ember ember-four" cx="112" cy="72" r="3" fill="#ffd66b" />
      <circle className="ember ember-five" cx="294" cy="182" r="3" fill="#ff8a38" />
      <circle className="ember ember-six" cx="66" cy="184" r="3" fill="#f34a41" />
    </g>

    <g className="phoenix-rig" filter="url(#soft-shadow)">
      <g className="tail-rig">
        <path className="tail tail-left" d="M161 236 C143 260 141 293 153 316 C158 292 172 273 181 249 Z" fill="url(#phoenix-tail)" />
        <path className="tail tail-center" d="M178 235 C167 263 172 300 188 322 C194 292 204 267 198 241 Z" fill="url(#phoenix-tail)" />
        <path className="tail tail-right" d="M194 236 C203 261 219 286 216 313 C207 298 190 278 184 250 Z" fill="url(#phoenix-tail)" />
        <path className="tail-highlight" d="M183 250 C181 274 185 291 190 301 C192 280 198 264 194 250 Z" fill="#ffe26a" opacity="0.78" />
      </g>

      <g className="wing wing-left">
        <path d="M151 142 C112 120 80 127 61 158 C88 151 106 162 119 182 C89 178 68 192 57 218 C92 203 120 212 145 236 C139 203 143 169 151 142 Z" fill="url(#phoenix-wing)" />
        <path d="M137 157 C110 148 91 154 77 171 C101 168 119 179 135 199 Z" fill="#ffd85b" opacity="0.8" />
        <path d="M128 187 C101 184 83 193 72 208 C96 198 113 203 136 220 Z" fill="#ff6b3d" opacity="0.72" />
      </g>

      <g className="wing wing-right">
        <path d="M209 142 C248 120 280 127 299 158 C272 151 254 162 241 182 C271 178 292 192 303 218 C268 203 240 212 215 236 C221 203 217 169 209 142 Z" fill="url(#phoenix-wing)" />
        <path d="M223 157 C250 148 269 154 283 171 C259 168 241 179 225 199 Z" fill="#ffd85b" opacity="0.8" />
        <path d="M232 187 C259 184 277 193 288 208 C264 198 247 203 224 220 Z" fill="#ff6b3d" opacity="0.72" />
      </g>

      <g className="body-rig">
        <ellipse cx="180" cy="200" rx="48" ry="61" fill="url(#phoenix-body)" />
        <ellipse cx="180" cy="207" rx="29" ry="42" fill="#ffd958" opacity="0.72" />
        <path d="M151 204 C165 220 195 224 210 204 C204 237 195 253 180 260 C164 253 155 236 151 204 Z" fill="#ff7040" opacity="0.52" />

        <g className="head-rig">
          <circle cx="180" cy="130" r="46" fill="url(#phoenix-body)" />
          <path className="crest crest-one" d="M161 91 C156 69 166 51 178 43 C179 62 187 72 193 91 Z" fill="#f04438" />
          <path className="crest crest-two" d="M177 90 C177 66 191 49 204 44 C199 64 203 78 202 96 Z" fill="#ff743b" />
          <path className="crest crest-three" d="M153 98 C140 80 143 62 151 53 C155 70 165 80 171 94 Z" fill="#ff9835" />

          <g className="face-rig">
            <ellipse className="eye eye-left" cx="164" cy="128" rx="5.5" ry="7" fill="#4a2a28" />
            <ellipse className="eye eye-right" cx="196" cy="128" rx="5.5" ry="7" fill="#4a2a28" />
            <circle cx="162" cy="126" r="1.7" fill="white" />
            <circle cx="194" cy="126" r="1.7" fill="white" />
            <path className="eyelid eyelid-left" d="M157 128 Q164 122 171 128" fill="none" stroke="#6c342b" strokeWidth="5" strokeLinecap="round" />
            <path className="eyelid eyelid-right" d="M189 128 Q196 122 203 128" fill="none" stroke="#6c342b" strokeWidth="5" strokeLinecap="round" />
            <path className="beak" d="M174 140 L186 140 L180 150 Z" fill="#ffef80" />
            <path className="smile" d="M170 154 Q180 161 190 154" fill="none" stroke="#a23d32" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="151" cy="145" rx="7" ry="4" fill="#ff7f6d" opacity="0.55" />
            <ellipse cx="209" cy="145" rx="7" ry="4" fill="#ff7f6d" opacity="0.55" />
          </g>
        </g>
      </g>

      <g className="writing-prop">
        <path d="M107 235 Q180 216 253 235 L249 283 Q180 266 111 283 Z" fill="#fffdf7" stroke="#f1c18f" strokeWidth="3" />
        <path d="M180 230 V272" stroke="#f0d7bc" strokeWidth="2" />
        <path className="writing-line writing-line-one" d="M126 246 H164" stroke="#d99a67" strokeWidth="3" strokeLinecap="round" />
        <path className="writing-line writing-line-two" d="M126 257 H158" stroke="#e7b487" strokeWidth="3" strokeLinecap="round" />
        <g className="quill">
          <path d="M220 207 C235 188 250 182 258 184 C250 196 239 211 220 223 Z" fill="#ff8246" />
          <path d="M220 222 L201 260" stroke="#8f4a33" strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      <g className="presenting-prop">
        <rect x="104" y="211" width="152" height="91" rx="18" fill="#fffdf7" stroke="#f4bd82" strokeWidth="3" />
        <circle cx="128" cy="236" r="8" fill="#ff9a3d" />
        <path d="M146 234 H227 M125 257 H235 M125 274 H211" stroke="#d8a377" strokeWidth="5" strokeLinecap="round" />
        <path d="M232 216 L252 235" stroke="#ffd766" strokeWidth="7" strokeLinecap="round" />
      </g>

      <g className="listening-spark">
        <path d="M225 105 Q240 94 248 109" fill="none" stroke="#ffb33f" strokeWidth="5" strokeLinecap="round" />
        <path d="M232 88 Q253 75 266 96" fill="none" stroke="#ffcf62" strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>

    <g className="celebration-burst" aria-hidden="true">
      <path d="M60 78 L72 91" stroke="#ff7b3e" strokeWidth="6" strokeLinecap="round" />
      <path d="M86 48 L92 67" stroke="#ffd85e" strokeWidth="6" strokeLinecap="round" />
      <path d="M292 70 L280 87" stroke="#f04438" strokeWidth="6" strokeLinecap="round" />
      <path d="M320 117 L298 122" stroke="#ffd85e" strokeWidth="6" strokeLinecap="round" />
      <circle cx="68" cy="130" r="6" fill="#ffd85e" />
      <circle cx="302" cy="156" r="6" fill="#ff743b" />
    </g>
  </svg>
);

const DinoArtwork: React.FC<{ state: PhoenixState }> = ({ state }) => (
  <svg
    className={`phoenix-scene dino-scene phoenix-state-${state}`}
    viewBox="0 0 360 330"
    role="img"
    aria-label={`雷龙兽动作：${STATE_LABELS[state]}`}
  >
    <defs>
      <radialGradient id="dino-aura" cx="50%" cy="48%" r="55%">
        <stop offset="0%" stopColor="#dff8ff" stopOpacity="0.95" />
        <stop offset="56%" stopColor="#8be0ff" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#4eb8ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="dino-body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8fe8ff" />
        <stop offset="50%" stopColor="#4ab8ee" />
        <stop offset="100%" stopColor="#5269d9" />
      </linearGradient>
      <filter id="dino-shadow" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#2b4b8e" floodOpacity="0.2" />
      </filter>
    </defs>
    <ellipse className="phoenix-aura" cx="180" cy="158" rx="128" ry="118" fill="url(#dino-aura)" />
    <ellipse className="phoenix-ground" cx="180" cy="292" rx="60" ry="11" fill="#31578c" opacity="0.13" />
    <g className="ember-field">
      <path className="ember ember-one" d="M84 84 L73 109 L89 106 L81 129 L110 96 L94 99 L105 83 Z" fill="#ffd94e" />
      <path className="ember ember-two" d="M276 99 L265 124 L281 121 L273 144 L302 111 L286 114 L297 98 Z" fill="#fff078" />
    </g>
    <g className="phoenix-rig" filter="url(#dino-shadow)">
      <path className="tail tail-right" d="M229 220 C282 213 296 238 282 257 C271 239 254 242 225 251 Z" fill="#5269d9" />
      <ellipse cx="181" cy="205" rx="70" ry="65" fill="url(#dino-body)" />
      <ellipse cx="181" cy="222" rx="42" ry="39" fill="#c8f5ff" opacity="0.62" />
      <g className="head-rig">
        <circle cx="180" cy="126" r="54" fill="url(#dino-body)" />
        <path d="M146 84 L131 56 L159 74 Z M176 70 L178 38 L194 72 Z M207 79 L229 54 L223 91 Z" fill="#3659c7" />
        <ellipse className="eye eye-left" cx="160" cy="124" rx="6" ry="8" fill="#24345e" />
        <ellipse className="eye eye-right" cx="200" cy="124" rx="6" ry="8" fill="#24345e" />
        <circle cx="158" cy="121" r="2" fill="white" />
        <circle cx="198" cy="121" r="2" fill="white" />
        <path className="eyelid eyelid-left" d="M152 124 Q160 117 168 124" fill="none" stroke="#31529d" strokeWidth="6" strokeLinecap="round" />
        <path className="eyelid eyelid-right" d="M192 124 Q200 117 208 124" fill="none" stroke="#31529d" strokeWidth="6" strokeLinecap="round" />
        <path d="M164 149 Q180 161 196 149" fill="none" stroke="#31529d" strokeWidth="4" strokeLinecap="round" />
        <circle cx="142" cy="145" r="7" fill="#ff9fa8" opacity="0.52" />
        <circle cx="218" cy="145" r="7" fill="#ff9fa8" opacity="0.52" />
      </g>
      <path className="wing wing-left" d="M126 187 C99 171 79 183 74 210 C91 198 106 203 130 225 Z" fill="#6fd6f6" />
      <path className="wing wing-right" d="M235 187 C262 171 282 183 287 210 C270 198 255 203 231 225 Z" fill="#6fd6f6" />
      <g className="writing-prop">
        <path d="M107 235 Q180 216 253 235 L249 283 Q180 266 111 283 Z" fill="#fff" stroke="#9edcf0" strokeWidth="3" />
        <g className="quill"><path d="M220 207 C235 188 250 182 258 184 C250 196 239 211 220 223 Z" fill="#6b75df" /><path d="M220 222 L201 260" stroke="#34529a" strokeWidth="4" strokeLinecap="round" /></g>
      </g>
      <g className="presenting-prop">
        <rect x="104" y="211" width="152" height="91" rx="18" fill="#fff" stroke="#9edcf0" strokeWidth="3" />
        <path d="M126 236 H230 M126 257 H238 M126 276 H210" stroke="#78bdd7" strokeWidth="5" strokeLinecap="round" />
      </g>
    </g>
  </svg>
);

const PhoenixAvatar: React.FC<PhoenixAvatarProps> = ({
  mascotType,
  name,
  state,
  reducedMotion = false,
  showMotionPreview = true,
}) => {
  const [previewState, setPreviewState] = useState<PhoenixState | null>(null);

  useEffect(() => {
    setPreviewState(null);
  }, [state, mascotType]);

  const activeState = previewState || state;
  const isPhoenix = mascotType === "phoenix";
  const wrapperClass = useMemo(
    () =>
      [
        "phoenix-avatar-shell",
        isPhoenix ? "phoenix-theme" : "dino-theme",
        reducedMotion ? "phoenix-reduced-motion" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [isPhoenix, reducedMotion]
  );

  return (
    <section className={wrapperClass} aria-label={`${name}：${STATE_LABELS[activeState]}`}>
      <style>{`
        .phoenix-avatar-shell {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(251, 146, 60, .22);
          border-radius: 2rem;
          padding: 18px;
          text-align: center;
          background:
            radial-gradient(circle at 50% 20%, rgba(255, 236, 190, .82), transparent 36%),
            linear-gradient(180deg, #fffaf2 0%, #ffffff 72%);
          box-shadow: 0 18px 50px rgba(143, 75, 35, .09);
        }
        .phoenix-avatar-shell.dino-theme {
          border-color: rgba(56, 189, 248, .22);
          background:
            radial-gradient(circle at 50% 20%, rgba(218, 247, 255, .9), transparent 36%),
            linear-gradient(180deg, #f5fcff 0%, #ffffff 72%);
        }
        .phoenix-stage {
          position: relative;
          margin: 0 auto;
          width: min(100%, 300px);
          aspect-ratio: 1.05 / 1;
          border-radius: 28px;
          background: rgba(255, 255, 255, .56);
          box-shadow: inset 0 0 0 1px rgba(255, 170, 95, .13);
          cursor: pointer;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .dino-theme .phoenix-stage { box-shadow: inset 0 0 0 1px rgba(74, 184, 238, .13); }
        .phoenix-stage:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px rgba(255, 143, 63, .2), 0 16px 30px rgba(198, 94, 38, .08); }
        .phoenix-scene { width: 100%; height: 100%; overflow: visible; }
        .phoenix-rig { transform-origin: 180px 210px; animation: phoenix-float 3.2s ease-in-out infinite; }
        .phoenix-ground { transform-origin: center; animation: ground-breathe 3.2s ease-in-out infinite; }
        .phoenix-aura { transform-origin: center; animation: aura-breathe 2.8s ease-in-out infinite; }
        .wing { transform-box: fill-box; animation: wing-breathe 2.6s ease-in-out infinite; }
        .wing-left { transform-origin: right center; }
        .wing-right { transform-origin: left center; animation-delay: -.12s; }
        .tail { transform-box: fill-box; transform-origin: top center; animation: tail-sway 2.2s ease-in-out infinite; }
        .tail-center { animation-delay: -.35s; }
        .tail-right { animation-delay: -.7s; }
        .tail-highlight { animation: tail-glow 1.5s ease-in-out infinite; }
        .crest { transform-box: fill-box; transform-origin: bottom center; animation: crest-flicker 1.7s ease-in-out infinite; }
        .crest-two { animation-delay: -.45s; }
        .crest-three { animation-delay: -.9s; }
        .eye { transform-box: fill-box; transform-origin: center; animation: eye-blink 5.4s infinite; }
        .eyelid { opacity: 0; animation: eyelid-blink 5.4s infinite; }
        .ember { transform-box: fill-box; animation: ember-rise 2.8s ease-in-out infinite; opacity: 0; }
        .ember-two { animation-delay: -.5s; }
        .ember-three { animation-delay: -1s; }
        .ember-four { animation-delay: -1.5s; }
        .ember-five { animation-delay: -2s; }
        .ember-six { animation-delay: -2.4s; }
        .writing-prop, .presenting-prop, .listening-spark, .memory-orbit, .celebration-burst { opacity: 0; pointer-events: none; }
        .phoenix-state-greeting .phoenix-rig { animation: greeting-bounce 1.15s ease-in-out infinite; }
        .phoenix-state-greeting .wing-left { animation: greeting-wave .72s ease-in-out infinite; }
        .phoenix-state-greeting .wing-right { animation: wing-breathe 1.8s ease-in-out infinite; }
        .phoenix-state-listening .phoenix-rig { animation: listening-lean 1.8s ease-in-out infinite; }
        .phoenix-state-listening .listening-spark { opacity: 1; animation: listening-pulse 1.2s ease-in-out infinite; }
        .phoenix-state-listening .eye { animation: listening-eyes 1.8s ease-in-out infinite; }
        .phoenix-state-thinking .head-rig, .phoenix-state-clarifying .head-rig { animation: head-tilt 1.8s ease-in-out infinite; transform-origin: 180px 150px; }
        .phoenix-state-thinking .memory-orbit, .phoenix-state-clarifying .memory-orbit { opacity: .72; animation: memory-spin 5.5s linear infinite; transform-origin: 180px 158px; }
        .phoenix-state-searchingMemory .memory-orbit { opacity: 1; animation: memory-spin 2.8s linear infinite; transform-origin: 180px 158px; }
        .phoenix-state-searchingMemory .memory-dot { filter: url(#phoenix-glow); animation: memory-dot-pulse .8s ease-in-out infinite alternate; }
        .phoenix-state-searchingMemory .phoenix-rig { animation: memory-focus 1.4s ease-in-out infinite; }
        .phoenix-state-writing .writing-prop { opacity: 1; animation: prop-rise .45s cubic-bezier(.2,.8,.2,1) both; }
        .phoenix-state-writing .quill { transform-origin: 203px 258px; animation: quill-write .72s ease-in-out infinite; }
        .phoenix-state-writing .writing-line { stroke-dasharray: 45; stroke-dashoffset: 45; animation: line-write 1.45s ease-in-out infinite; }
        .phoenix-state-writing .writing-line-two { animation-delay: .42s; }
        .phoenix-state-writing .wing-left { animation: writing-wing-left .72s ease-in-out infinite; }
        .phoenix-state-presenting .presenting-prop { opacity: 1; animation: present-card 1.35s cubic-bezier(.18,.82,.23,1) infinite; transform-origin: 180px 255px; }
        .phoenix-state-presenting .wing { animation: present-wing 1.35s ease-in-out infinite; }
        .phoenix-state-celebrating .phoenix-rig { animation: celebration-hop .9s ease-in-out infinite; }
        .phoenix-state-celebrating .wing-left { animation: celebrate-left .9s ease-in-out infinite; }
        .phoenix-state-celebrating .wing-right { animation: celebrate-right .9s ease-in-out infinite; }
        .phoenix-state-celebrating .celebration-burst { opacity: 1; animation: celebration-pop .9s ease-in-out infinite; transform-origin: 180px 160px; }
        .phoenix-state-concerned .phoenix-rig { animation: concerned-huddle 2.4s ease-in-out infinite; }
        .phoenix-state-concerned .wing { animation: concerned-wing 2.4s ease-in-out infinite; }
        .phoenix-state-error .phoenix-rig { animation: gentle-shake 1.6s ease-in-out infinite; }
        .motion-copy { margin-top: 10px; }
        .motion-name { margin: 0; color: #292524; font-weight: 700; font-size: 1.12rem; }
        .motion-state { margin: 4px 0 0; color: #ea580c; font-size: .9rem; font-weight: 600; }
        .dino-theme .motion-state { color: #2582b8; }
        .motion-hint { margin: 5px 0 0; color: #a8a29e; font-size: .72rem; }
        .motion-preview { margin-top: 14px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
        .motion-preview button { border: 1px solid #f4e2cf; border-radius: 999px; padding: 7px 4px; background: rgba(255,255,255,.8); color: #78675b; font-size: 11px; cursor: pointer; transition: all .18s ease; }
        .motion-preview button:hover { transform: translateY(-1px); border-color: #fb923c; color: #c2410c; }
        .motion-preview button[data-active="true"] { border-color: #fb923c; background: #fff0df; color: #c2410c; font-weight: 700; }
        .dino-theme .motion-preview button[data-active="true"] { border-color: #38bdf8; background: #eafaff; color: #1676a6; }
        @keyframes phoenix-float { 0%,100%{transform:translateY(2px) rotate(-.5deg)} 50%{transform:translateY(-8px) rotate(.5deg)} }
        @keyframes ground-breathe { 0%,100%{transform:scaleX(1);opacity:.13} 50%{transform:scaleX(.82);opacity:.08} }
        @keyframes aura-breathe { 0%,100%{transform:scale(.94);opacity:.72} 50%{transform:scale(1.04);opacity:1} }
        @keyframes wing-breathe { 0%,100%{transform:rotate(2deg)} 50%{transform:rotate(-5deg)} }
        @keyframes tail-sway { 0%,100%{transform:rotate(-4deg) scaleY(.98)} 50%{transform:rotate(5deg) scaleY(1.05)} }
        @keyframes tail-glow { 0%,100%{opacity:.48} 50%{opacity:.96} }
        @keyframes crest-flicker { 0%,100%{transform:rotate(-3deg) scaleY(.96)} 50%{transform:rotate(4deg) scaleY(1.08)} }
        @keyframes eye-blink { 0%,44%,48%,100%{transform:scaleY(1)} 46%{transform:scaleY(.08)} }
        @keyframes eyelid-blink { 0%,44%,48%,100%{opacity:0} 46%{opacity:1} }
        @keyframes ember-rise { 0%{transform:translateY(18px) scale(.55);opacity:0} 35%{opacity:.85} 100%{transform:translateY(-26px) scale(1.08);opacity:0} }
        @keyframes greeting-bounce { 0%,100%{transform:translateY(2px) rotate(-1deg)} 50%{transform:translateY(-18px) rotate(2deg)} }
        @keyframes greeting-wave { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(-34deg)} }
        @keyframes listening-lean { 0%,100%{transform:translateX(0) rotate(0)} 50%{transform:translateX(6px) rotate(2.4deg)} }
        @keyframes listening-pulse { 0%,100%{opacity:.3;transform:scale(.88)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes listening-eyes { 0%,100%{transform:translateX(0)} 50%{transform:translateX(1.8px)} }
        @keyframes head-tilt { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(6deg)} }
        @keyframes memory-spin { to{transform:rotate(360deg)} }
        @keyframes memory-dot-pulse { from{transform:scale(.75);opacity:.55} to{transform:scale(1.35);opacity:1} }
        @keyframes memory-focus { 0%,100%{transform:translateY(1px) scale(.98)} 50%{transform:translateY(-5px) scale(1.02)} }
        @keyframes prop-rise { from{transform:translateY(18px) scale(.94);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes quill-write { 0%,100%{transform:translate(0,0) rotate(-5deg)} 50%{transform:translate(-14px,4px) rotate(4deg)} }
        @keyframes line-write { 0%{stroke-dashoffset:45;opacity:.2} 55%,100%{stroke-dashoffset:0;opacity:1} }
        @keyframes writing-wing-left { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(-12deg)} }
        @keyframes present-card { 0%{transform:translateY(14px) scale(.92);opacity:.2} 42%,72%{transform:translateY(-4px) scale(1);opacity:1} 100%{transform:translateY(3px) scale(.98);opacity:.75} }
        @keyframes present-wing { 0%,100%{transform:rotate(3deg)} 45%{transform:rotate(-17deg)} }
        @keyframes celebration-hop { 0%,100%{transform:translateY(4px) scale(.98)} 50%{transform:translateY(-22px) scale(1.04)} }
        @keyframes celebrate-left { 0%,100%{transform:rotate(8deg)} 50%{transform:rotate(-39deg)} }
        @keyframes celebrate-right { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(39deg)} }
        @keyframes celebration-pop { 0%,100%{transform:scale(.7);opacity:.25} 50%{transform:scale(1.12);opacity:1} }
        @keyframes concerned-huddle { 0%,100%{transform:translateY(3px) scale(.97)} 50%{transform:translateY(-2px) scale(1)} }
        @keyframes concerned-wing { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(8deg)} }
        @keyframes gentle-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @media (prefers-reduced-motion: reduce) {
          .phoenix-avatar-shell * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
        }
        .phoenix-reduced-motion * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
      `}</style>

      <button
        type="button"
        className="phoenix-stage"
        onClick={() => {
          const currentIndex = MOTION_PREVIEWS.findIndex((item) => item.state === activeState);
          const next = MOTION_PREVIEWS[(currentIndex + 1) % MOTION_PREVIEWS.length];
          setPreviewState(next.state);
        }}
        aria-label={`点击查看 ${name} 的下一个动作`}
      >
        {isPhoenix ? <PhoenixArtwork state={activeState} /> : <DinoArtwork state={activeState} />}
      </button>

      <div className="motion-copy">
        <p className="motion-name">{name}</p>
        <p className="motion-state" aria-live="polite">{STATE_LABELS[activeState]}</p>
        <p className="motion-hint">点击角色，或选择下方动作预览</p>
      </div>

      {showMotionPreview && (
        <div className="motion-preview" aria-label="角色动作预览">
          {MOTION_PREVIEWS.map((item) => (
            <button
              key={item.state}
              type="button"
              data-active={activeState === item.state}
              onClick={() => setPreviewState(item.state)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default PhoenixAvatar;
