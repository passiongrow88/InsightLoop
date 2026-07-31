import React, { useEffect, useMemo, useState } from "react";
import { Copy, Crown, Link2, Loader2, Mail, ShieldAlert, UserRoundCheck, XCircle } from "lucide-react";
import { FounderAccessKind, FounderInvite, issueFounderInvite, listFounderInvites, revokeFounderInvite } from "../services/founderAdmin";
import { Language } from "../types";

const FounderAdmin: React.FC<{ language: Language }> = ({ language }) => {
  const isZh = language === "zh";
  const [invites, setInvites] = useState<FounderInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ recipientName: "", recipientEmail: "", accessKind: "invited_lifetime" as FounderAccessKind });

  const load = async () => {
    try {
      setLoading(true);
      setInvites(await listFounderInvites());
    } catch (err: any) {
      setMessage(err?.message || "Unable to load founder invitations.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const active = useMemo(() => invites.filter((invite) => !invite.revoked_at), [invites]);
  const lifetimeUsed = active.filter((invite) => invite.access_kind === "invited_lifetime").length;
  const trialUsed = active.filter((invite) => invite.access_kind === "invited_90day").length;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true); setMessage(null);
      const created = await issueFounderInvite(form);
      setInvites((previous) => [...previous, created].sort((a, b) => a.seat_number - b.seat_number));
      setForm({ recipientName: "", recipientEmail: "", accessKind: "invited_lifetime" });
      setMessage(isZh ? "金券已生成。复制私密链接发送给对方。" : "Golden Ticket created. Copy its private link and send it personally.");
    } catch (err: any) { setMessage(err?.message || "Unable to create invitation."); }
    finally { setSaving(false); }
  };

  const copyLink = async (invite: FounderInvite) => {
    await navigator.clipboard.writeText(`${window.location.origin}/?invite=${invite.claim_token}`);
    setMessage(isZh ? `已复制 #${String(invite.seat_number).padStart(3, "0")} 的金券链接。` : `Copied Golden Ticket #${String(invite.seat_number).padStart(3, "0")}.`);
  };

  const revoke = async (invite: FounderInvite) => {
    const prompt = isZh ? "撤销后，该金券和已发放的权限都会立刻失效。确定吗？" : "Revoking immediately disables this ticket and any access it issued. Continue?";
    if (!window.confirm(prompt)) return;
    try { await revokeFounderInvite(invite.id); await load(); setMessage(isZh ? "已撤销。" : "Revoked."); }
    catch (err: any) { setMessage(err?.message || "Unable to revoke invitation."); }
  };

  return <div className="space-y-6">
    <div className="rounded-3xl bg-gradient-to-br from-stone-900 to-amber-950 p-7 text-amber-50 shadow-xl">
      <div className="flex items-start gap-3"><Crown className="mt-1 text-amber-300" /><div><p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">Founder Circle</p><h2 className="mt-1 font-serif text-2xl">{isZh ? "创始席位与金券" : "Founder seats & Golden Tickets"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/70">{isZh ? "这里是唯一可以发放、查看与撤销 10 张受邀席位的地方。链接只可由对应邮箱领取，无法被转发冒领。" : "This is the only place to issue, view, or revoke the ten invited seats. Each ticket is bound to its intended email."}</p></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-amber-100/60">{isZh ? "创始人亲选席位" : "Founder's Chosen"}</p><p className="mt-1 text-2xl font-semibold">{lifetimeUsed} / 5</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-amber-100/60">{isZh ? "首季金券" : "First Season Tickets"}</p><p className="mt-1 text-2xl font-semibold">{trialUsed} / 5</p></div></div>
    </div>

    <form onSubmit={create} className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm space-y-4">
      <div><h3 className="font-semibold text-stone-800">{isZh ? "发放一张金券" : "Issue a Golden Ticket"}</h3><p className="mt-1 text-sm text-stone-500">{isZh ? "金券有效期为 30 天；领取后，90 天体验从领取当天开始计算。" : "Tickets expire after 30 days. A 90-day trial begins only when claimed."}</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} placeholder={isZh ? "对方名字（可选）" : "Recipient name (optional)"} className="rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-500" /><input required type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} placeholder={isZh ? "对方的领取邮箱" : "Recipient email"} className="rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-amber-500" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setForm({ ...form, accessKind: "invited_lifetime" })} className={`rounded-2xl border p-4 text-left ${form.accessKind === "invited_lifetime" ? "border-amber-500 bg-amber-50" : "border-stone-200"}`}><strong>{isZh ? "创始人亲选 · 全免" : "Founder's Chosen · Comped"}</strong><span className="mt-1 block text-xs text-stone-500">{isZh ? "5 位；核心创始会员权益持续免费，合理使用额度照常适用。" : "5 seats; Founder core benefits remain comped, with fair-use limits."}</span></button><button type="button" onClick={() => setForm({ ...form, accessKind: "invited_90day" })} className={`rounded-2xl border p-4 text-left ${form.accessKind === "invited_90day" ? "border-amber-500 bg-amber-50" : "border-stone-200"}`}><strong>{isZh ? "首季金券 · 90 天全免" : "First Season Ticket · 90 days"}</strong><span className="mt-1 block text-xs text-stone-500">{isZh ? "5 位；结束前清楚提示可按创始价继续。" : "5 seats; continuation at Founder price is shown before expiry."}</span></button></div>
      <button disabled={saving || (form.accessKind === "invited_lifetime" ? lifetimeUsed >= 5 : trialUsed >= 5)} className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}{isZh ? "生成私密金券" : "Create private ticket"}</button>
    </form>

    {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>}
    <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm"><h3 className="font-semibold text-stone-800">{isZh ? "已发放的金券" : "Issued tickets"}</h3>{loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-400" /></div> : <div className="mt-4 space-y-3">{invites.length === 0 ? <p className="py-5 text-sm text-stone-400">{isZh ? "尚未发放。" : "No tickets issued yet."}</p> : invites.map((invite) => { const label = invite.access_kind === "invited_lifetime" ? (isZh ? "创始人亲选" : "Founder's Chosen") : (isZh ? "首季金券" : "First Season"); const state = invite.revoked_at ? (isZh ? "已撤销" : "Revoked") : invite.claimed_at ? (isZh ? "已领取" : "Claimed") : (isZh ? "等待领取" : "Awaiting claim"); return <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">#{String(invite.seat_number).padStart(3, "0")}</span><strong className="text-sm text-stone-800">{invite.recipient_name || invite.recipient_email}</strong></div><p className="mt-1 text-xs text-stone-500">{invite.recipient_email} · {label} · {state}</p></div><div className="flex gap-2">{!invite.revoked_at && !invite.claimed_at && <button onClick={() => void copyLink(invite)} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs hover:bg-stone-50"><Copy size={14} />{isZh ? "复制链接" : "Copy link"}</button>}{!invite.revoked_at && <button onClick={() => void revoke(invite)} className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><XCircle size={14} />{isZh ? "撤销" : "Revoke"}</button>}</div></div>; })}</div>}</div>
  </div>;
};

export default FounderAdmin;
