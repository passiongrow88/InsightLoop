import React from "react";
import type { MascotType, PhoenixState } from "../../types";

interface PhoenixAvatarProps {
  mascotType: MascotType;
  name: string;
  state: PhoenixState;
  reducedMotion?: boolean;
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

/**
 * Runtime adapter for the future Rive asset.
 *
 * This component intentionally does not imitate a final animation. It exposes
 * the exact product states today, so the Journal flow can be built and tested.
 * Once the approved .riv file exists, only this component should change.
 */
const PhoenixAvatar: React.FC<PhoenixAvatarProps> = ({
  mascotType,
  name,
  state,
}) => {
  const isPhoenix = mascotType === "phoenix";

  return (
    <section
      className="rounded-[2rem] border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-5 text-center shadow-sm"
      aria-label={`${name}：${STATE_LABELS[state]}`}
    >
      <div className="mx-auto flex aspect-square w-44 max-w-full items-center justify-center rounded-full border border-dashed border-orange-200 bg-white/80 px-5">
        <div>
          <div className="text-5xl" aria-hidden="true">
            {isPhoenix ? "🔥" : "🌩️"}
          </div>
          <p className="mt-3 text-sm font-medium text-stone-700">
            {isPhoenix ? "火凤凰 Rive 资产位" : "雷龙兽 Rive 资产位"}
          </p>
          <p className="mt-1 text-xs text-stone-400">不模拟最终动画</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-medium text-stone-800">{name}</p>
        <p className="mt-1 text-sm text-orange-600" aria-live="polite">
          {STATE_LABELS[state]}
        </p>
      </div>
    </section>
  );
};

export default PhoenixAvatar;
