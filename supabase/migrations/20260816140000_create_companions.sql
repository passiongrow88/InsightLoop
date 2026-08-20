create table if not exists public.companions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recommended_kind text not null check (recommended_kind in ('phoenix', 'thunder_dragon')),
  recommendation_reason text not null default '',
  selected_kind text check (selected_kind is null or selected_kind in ('phoenix', 'thunder_dragon')),
  name text check (name is null or (char_length(trim(name)) between 1 and 40)),
  status text not null default 'recommended' check (status in ('recommended', 'selected', 'hatched')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hatched_at timestamptz,
  constraint companions_selected_state_check check (
    (status = 'recommended')
    or (status = 'selected' and selected_kind is not null)
    or (status = 'hatched' and selected_kind is not null and name is not null and hatched_at is not null)
  )
);

alter table public.companions enable row level security;

revoke all on table public.companions from anon;
grant select, insert, update, delete on table public.companions to authenticated;
grant select, insert, update, delete on table public.companions to service_role;

drop policy if exists "companions_select_own" on public.companions;
create policy "companions_select_own"
  on public.companions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "companions_insert_own" on public.companions;
create policy "companions_insert_own"
  on public.companions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "companions_update_own" on public.companions;
create policy "companions_update_own"
  on public.companions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "companions_delete_own" on public.companions;
create policy "companions_delete_own"
  on public.companions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
