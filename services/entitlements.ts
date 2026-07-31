import { supabase } from "../supabaseClient";

export type Entitlement = {
  plan: "free" | "pro" | "founder";
  trialEndsAt?: string;
  subscriptionStatus?: string | null;
  founderKind?: "paid_founder" | "invited_lifetime" | "invited_90day";
  founderSeatNumber?: number;
  founderEndsAt?: string | null;
};

export async function getMyEntitlement(): Promise<Entitlement> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const uid = auth.user?.id;
  if (!uid) return { plan: "free" };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const founderResponse = accessToken
    ? await fetch("/api/founder/my-access", { headers: { Authorization: `Bearer ${accessToken}` } })
    : null;
  const founderPayload = founderResponse?.ok ? await founderResponse.json() : null;
  const founderGrant = founderPayload?.grant as { access_kind: string; seat_number: number; ends_at: string | null } | null;

  if (founderGrant) {
    return {
      plan: "founder",
      founderKind: founderGrant.access_kind as Entitlement["founderKind"],
      founderSeatNumber: founderGrant.seat_number,
      founderEndsAt: founderGrant.ends_at,
      subscriptionStatus: "active",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, subscription_status")
    .eq("id", uid)
    .single();

  if (error) {
    // profiles 不存在时，默认 free，不要阻断
    return { plan: "free" };
  }

  return {
    plan: (data.plan || "free") as "free" | "pro",
    trialEndsAt: data.trial_ends_at,
    subscriptionStatus: data.subscription_status
  };
}

// ✅ 你现在的 Paywall 开关策略（可改）
// 先默认：free 也能用（因为你还没接 Stripe），所以永远 false
export function isPaywallActive(_ent: Entitlement): boolean {
  return false;
}
