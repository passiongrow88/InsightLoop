import React from "react";

export default function Paywall() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7FF]">
      <div className="bg-white/60 backdrop-blur p-10 rounded-[2rem] border border-white shadow-sm max-w-lg w-full">
        <h1 className="font-serif text-3xl text-stone-700 mb-3">90 天体验已结束</h1>
        <p className="text-stone-500 mb-8 leading-relaxed">
          你的数据都还在。升级订阅即可继续使用 InsightLoop。
        </p>

        <button
          onClick={() => alert("下一步接 Stripe：这里会跳转到 Checkout")}
          className="w-full bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white py-3 rounded-full font-medium shadow-lg"
        >
          立即升级（月费）
        </button>

        <div className="mt-4 text-center text-xs text-stone-400">
          （下一步我们会把按钮接到 Stripe Checkout）
        </div>
      </div>
    </div>
  );
}
