-- NetSpinGame: member profiles (run in Supabase SQL Editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  balance bigint not null default 25000 check (balance >= 0),
  line_bet int not null default 1 check (line_bet >= 1 and line_bet <= 20),
  active_lines int not null default 40 check (active_lines >= 1 and active_lines <= 40),
  bet_mult int not null default 1,
  jackpots jsonb not null default '{}'::jsonb,
  sound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, balance)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    25000
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

create or replace function public.set_profiles_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at ();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid () = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid () = id)
with check (auth.uid () = id);
