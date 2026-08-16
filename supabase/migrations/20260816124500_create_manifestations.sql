create table if not exists public.manifestations (
  id text primary key default (gen_random_uuid())::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null check (char_length(trim(goal)) between 1 and 1000),
  expected_date text not null default '',
  reason text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'delayed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manifestations_user_created_idx
  on public.manifestations (user_id, created_at desc);

alter table public.manifestations enable row level security;

drop policy if exists "manifestations_select_own" on public.manifestations;
create policy "manifestations_select_own"
  on public.manifestations for select
  using ((select auth.uid()) = user_id);

drop policy if exists "manifestations_insert_own" on public.manifestations;
create policy "manifestations_insert_own"
  on public.manifestations for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "manifestations_update_own" on public.manifestations;
create policy "manifestations_update_own"
  on public.manifestations for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "manifestations_delete_own" on public.manifestations;
create policy "manifestations_delete_own"
  on public.manifestations for delete
  using ((select auth.uid()) = user_id);
