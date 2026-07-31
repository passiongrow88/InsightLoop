import React, { useState } from "react";
import { Shield, Users } from "lucide-react";
import { Language } from "../types";
import AdminResourceUpload from "./AdminResourceUpload";
import FounderAdmin from "./FounderAdmin";

const AdminConsole: React.FC<{ language: Language }> = ({ language }) => {
  const [tab, setTab] = useState<"founders" | "resources">("founders");
  const isZh = language === "zh";
  return <div className="space-y-5"><div className="flex gap-2 rounded-2xl border border-brand-100 bg-white p-2 shadow-sm"><button onClick={() => setTab("founders")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${tab === "founders" ? "bg-stone-900 text-white" : "text-stone-500"}`}><Users size={16} />{isZh ? "创始席位" : "Founder seats"}</button><button onClick={() => setTab("resources")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${tab === "resources" ? "bg-stone-900 text-white" : "text-stone-500"}`}><Shield size={16} />{isZh ? "资源管理" : "Resources"}</button></div>{tab === "founders" ? <FounderAdmin language={language} /> : <AdminResourceUpload language={language} />}</div>;
};

export default AdminConsole;
