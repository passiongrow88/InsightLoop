-- Applied to production as the founder_access migration on 2026-07-29.
-- Local copy retained for source-control and future environments.
create extension if not exists pgcrypto;

create table if not exists public.founder_invites (
  id uuid primary key default gen_random_uuid(),
  claim_token uuid not null unique default gen_random_uuid(),
  recipient_email text not null,
  recipient_name text,
  access_kind text not null check (access_kind in ('invited_lifetime', 'invited_90day')),
  seat_number integer not null unique check (seat_number between 1 and 10),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint founder_invites_claim_state check ((claimed_by is null and claimed_at is null) or (claimed_by is not null and claimed_at is not null))
);

create table if not exists public.founder_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid unique references public.founder_invites(id) on delete restrict,
  access_kind text not null check (access_kind in ('paid_founder', 'invited_lifetime', 'invited_90day')),
  seat_number integer not null unique check (seat_number between 1 and 40),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint founder_access_grants_dates check (ends_at is null or ends_at > starts_at)
);

create unique index if not exists founder_access_one_active_user on public.founder_access_grants (user_id) where status = 'active';
alter table public.founder_invites enable row level security;
alter table public.founder_access_grants enable row level security;
grant select on public.founder_access_grants to authenticated;
grant all on public.founder_invites to service_role;
grant all on public.founder_access_grants to service_role;

create policy "Users can read their own founder access" on public.founder_access_grants for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.redeem_founder_invite(p_claim_token uuid)
returns table (access_kind text, seat_number integer, ends_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_user_email text; v_invite public.founder_invites%rowtype; v_ends_at timestamptz;
begin
  if v_user_id is null then raise exception 'You must sign in before accepting an invitation.'; end if;
  select email into v_user_email from auth.users where id = v_user_id;
  select * into v_invite from public.founder_invites where claim_token = p_claim_token and claimed_by is null and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'This invitation is no longer available.'; end if;
  if lower(v_invite.recipient_email) <> lower(coalesce(v_user_email, '')) then raise exception 'This invitation was issued to a different email address.'; end if;
  v_ends_at := case when v_invite.access_kind = 'invited_90day' then now() + interval '90 days' else null end;
  insert into public.founder_access_grants (user_id, invite_id, access_kind, seat_number, starts_at, ends_at) values (v_user_id, v_invite.id, v_invite.access_kind, v_invite.seat_number, now(), v_ends_at);
  update public.founder_invites set claimed_by = v_user_id, claimed_at = now() where id = v_invite.id;
  return query select v_invite.access_kind, v_invite.seat_number, v_ends_at;
end;
$$;
revoke all on function public.redeem_founder_invite(uuid) from public;
grant execute on function public.redeem_founder_invite(uuid) to authenticated;
