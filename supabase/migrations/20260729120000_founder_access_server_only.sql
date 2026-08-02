-- Supersedes direct browser access from the first founder migration.
-- Invite redemption and entitlement lookup now occur only in authenticated server endpoints.
revoke all on table public.founder_invites from anon, authenticated;
revoke all on table public.founder_access_grants from anon, authenticated;
drop policy if exists "Users can read their own founder access" on public.founder_access_grants;

drop function if exists public.redeem_founder_invite(uuid);
create function public.redeem_founder_invite(p_claim_token uuid, p_user_id uuid, p_user_email text)
returns table (access_kind text, seat_number integer, ends_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
declare v_invite public.founder_invites%rowtype; v_ends_at timestamptz;
begin
  if p_user_id is null or coalesce(trim(p_user_email), '') = '' then raise exception 'A verified user is required.'; end if;
  select * into v_invite from public.founder_invites where claim_token = p_claim_token and claimed_by is null and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'This invitation is no longer available.'; end if;
  if lower(v_invite.recipient_email) <> lower(p_user_email) then raise exception 'This invitation was issued to a different email address.'; end if;
  v_ends_at := case when v_invite.access_kind = 'invited_90day' then now() + interval '90 days' else null end;
  insert into public.founder_access_grants (user_id, invite_id, access_kind, seat_number, starts_at, ends_at) values (p_user_id, v_invite.id, v_invite.access_kind, v_invite.seat_number, now(), v_ends_at);
  update public.founder_invites set claimed_by = p_user_id, claimed_at = now() where id = v_invite.id;
  return query select v_invite.access_kind, v_invite.seat_number, v_ends_at;
end;
$$;
revoke all on function public.redeem_founder_invite(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_founder_invite(uuid, uuid, text) to service_role;
