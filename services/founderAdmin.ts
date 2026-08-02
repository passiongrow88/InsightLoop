import { supabase } from "./supabaseClient";

export type FounderAccessKind = "invited_lifetime" | "invited_90day";

export type FounderInvite = {
  id: string;
  claim_token: string;
  recipient_email: string;
  recipient_name: string | null;
  access_kind: FounderAccessKind;
  seat_number: number;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export async function listFounderInvites(): Promise<FounderInvite[]> {
  const response = await fetch("/api/admin/founder-invites", { headers: await authHeaders() });
  const data = await parseResponse(response);
  return data.invites || [];
}

export async function issueFounderInvite(input: {
  recipientEmail: string;
  recipientName: string;
  accessKind: FounderAccessKind;
}): Promise<FounderInvite> {
  const response = await fetch("/api/admin/founder-invites", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseResponse(response);
  return data.invite;
}

export async function revokeFounderInvite(id: string) {
  const response = await fetch("/api/admin/founder-invites", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "revoke", id }),
  });
  await parseResponse(response);
}
