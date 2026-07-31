import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

void import("./App")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error: unknown) => {
    console.error("[InsightLoop] Application startup failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const isMissingConfiguration = message.includes("Missing Supabase env vars");

    root.render(
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-6 text-[#3f2c23]">
        <section className="w-full max-w-md rounded-3xl border border-[#efddcf] bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-semibold">
            {isMissingConfiguration ? "预览环境尚未配置完成" : "InsightLoop 暂时无法启动"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#79645a]">
            {isMissingConfiguration
              ? "这不是你的设备问题。请使用已配置的正式预览链接，或联系管理员补齐 Preview 环境配置。"
              : "请刷新页面再试一次。如果问题持续，请把当前网址发给管理员。"}
          </p>
          <button
            className="mt-6 rounded-full bg-[#c76836] px-5 py-2.5 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            重新加载
          </button>
        </section>
      </main>
    );
  });
