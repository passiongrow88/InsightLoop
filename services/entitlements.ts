import { supabase } from "../supabaseClient";

export type Entitlement = {
  plan: "free" | "pro";
  trialEndsAt?: string;
  subscriptionStatus?: string | null;
};

export async function getMyEntitlement(): Promise<Entitlement> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const uid = auth.user?.id;
  if (!uid) return { plan: "free" };

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
