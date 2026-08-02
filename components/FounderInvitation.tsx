import React, { useState } from "react";
import { Check, Crown, LockKeyhole, Sparkles } from "lucide-react";
import { supabase } from "../services/supabaseClient";
import { Language } from "../types";

type Claim = { access_kind: "invited_lifetime" | "invited_90day"; seat_number: number; ends_at: string | null };

interface FounderInvitationProps {
  token: string;
  language: Language;
  onComplete: () => void;
}

const FounderInvitation: React.FC<FounderInvitationProps> = ({ token, language, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isZh = language === "zh";

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error(isZh ? "请重新登录后领取。" : "Please sign in again before claiming.");
      const response = await fetch("/api/founder/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to accept invitation.");
      const result = payload.claim as Claim | undefined;
      if (!result) throw new Error("The invitation could not be completed.");
      setClaim(result);
    } catch (err: any) {
      setError(err?.message || (isZh ? "这张邀请函暂时无法使用。" : "This invitation is no longer available."));
    } finally {
      setLoading(false);
    }
  };

  const isLifetime = claim?.access_kind === "invited_lifetime";
  const date = claim?.ends_at ? new Date(claim.ends_at).toLocaleDateString(isZh ? "zh-CN" : "en-US") : null;

  return (
    <div className="min-h-screen bg-[#17130c] px-5 py-12 text-[#fff8e7] flex items-center justify-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-300/35 bg-gradient-to-br from-[#37230f] via-[#1f1912] to-[#0d0d0d] p-8 sm:p-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/50 bg-amber-300/10 text-amber-200">
          {claim ? <Check size={30} /> : <Crown size={30} />}
        </div>
        {!claim ? (
          <>
            <p className="mb-3 text-xs tracking-[0.32em] text-amber-200/75 uppercase">InsightLoop · Founder Circle</p>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{isZh ? "有一张金券，被特意留给了你。" : "A Golden Ticket has been held for you."}</h1>
            <p className="mx-auto mt-6 max-w-md leading-7 text-amber-50/75">
              {isZh
                ? "你不是来领取一个促销名额，而是被邀请成为 InsightLoop 最初四十位初代回响者之一。你的记录会参与塑造我们如何更认真地记得人。"
                : "This is not a promotion. You were invited to become one of InsightLoop’s first forty Founding Echoes."}
            </p>
            <div className="my-8 rounded-2xl border border-amber-100/20 bg-black/15 p-4 text-sm text-amber-50/70">
              <div className="flex items-center justify-center gap-2"><LockKeyhole size={15} />{isZh ? "仅限受邀请的邮箱领取；不可转让。" : "Bound to the invited email and cannot be transferred."}</div>
              <p className="mt-3 text-xs text-amber-100/55">{isZh ? "若为首季体验券，领取后享有 90 天创始会员权益；到期前会清楚提示你以创始价继续。" : "A First Season Ticket includes 90 days of Founder access. Continuing at the Founder price is always your choice."}</p>
            </div>
            {error && <p className="mb-5 text-sm text-red-200">{error}</p>}
            <button onClick={accept} disabled={loading} className="w-full rounded-full bg-gradient-to-r from-amber-200 to-yellow-500 px-6 py-4 font-semibold text-stone-900 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? (isZh ? "正在封存你的席位…" : "Sealing your place…") : (isZh ? "接下这张金券" : "Accept this Golden Ticket")}
            </button>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs tracking-[0.32em] text-amber-200/75 uppercase">Founder Circle</p>
            <h1 className="font-serif text-3xl sm:text-4xl">{isZh ? `初代回响者 #${String(claim.seat_number).padStart(3, "0")}` : `Founding Echo #${String(claim.seat_number).padStart(3, "0")}`}</h1>
            <p className="mx-auto mt-6 max-w-md leading-7 text-amber-50/80">
              {isLifetime
                ? (isZh ? "你的创始人亲选席位已经封存。只要 InsightLoop 仍提供创始会员方案，你将持续拥有这一方案的核心权益与合理使用额度。" : "Your Founder's Chosen seat is sealed. While InsightLoop offers the Founder plan, its core benefits and fair-use limits remain yours.")
                : (isZh ? `你的首季金券已生效，创始会员权益至 ${date}。到期后是否以创始价继续，永远由你决定。` : `Your First Season Ticket is active until ${date}. Continuing at the Founder price will always be your choice.`)}
            </p>
            <div className="my-8 flex justify-center text-amber-200"><Sparkles size={32} /></div>
            <button onClick={onComplete} className="w-full rounded-full border border-amber-200/55 bg-amber-100/10 px-6 py-4 font-semibold text-amber-50 transition hover:bg-amber-100/15">
              {isZh ? "走进我的第一段回响" : "Begin my first reflection"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FounderInvitation;
