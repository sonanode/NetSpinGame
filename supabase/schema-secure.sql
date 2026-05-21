-- Run after schema.sql — lock economy to server-side Edge Functions

alter table public.profiles
  add column if not exists free_spins_left int not null default 0,
  add column if not exists session_win_mult int not null default 1;

-- Clients may read their row; economy updates only via Edge Functions (service role)
drop policy if exists "profiles_update_own" on public.profiles;

-- Optional: allow updating sound only from client (Edge Function update-settings is preferred)
-- create policy "profiles_update_sound" ...
