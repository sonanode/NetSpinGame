-- XZENZY member portal — run in Supabase SQL Editor after schema.sql + schema-secure.sql
-- Wallet (USDT), game credits, ledger, referrals, P2P transfers

alter table public.profiles
  add column if not exists wallet_usdt numeric(18, 2) not null default 0 check (wallet_usdt >= 0),
  add column if not exists referrer_id uuid references public.profiles (id) on delete set null,
  add column if not exists rank text not null default 'member';

create index if not exists profiles_referrer_idx on public.profiles (referrer_id);

create table if not exists public.member_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  amount numeric(18, 2) not null,
  currency text not null check (currency in ('USDT', 'CR')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'cancelled')),
  counterparty text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists member_ledger_user_idx on public.member_ledger (user_id, created_at desc);

alter table public.member_ledger enable row level security;

drop policy if exists "ledger_select_own" on public.member_ledger;
create policy "ledger_select_own"
on public.member_ledger for select to authenticated
using (auth.uid() = user_id);

-- Clients cannot insert ledger rows directly (RPC only)
drop policy if exists "ledger_insert_own" on public.member_ledger;

-- Resolve member code XZ + 8 hex chars → user id
create or replace function public.member_id_from_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suffix text;
  v_id uuid;
begin
  v_suffix := upper(trim(regexp_replace(p_code, '^XZ', '', 'i')));
  if length(v_suffix) < 6 then
    return null;
  end if;
  select p.id into v_id
  from public.profiles p
  where upper(replace(p.id::text, '-', '')) like v_suffix || '%'
  order by p.created_at
  limit 1;
  return v_id;
end;
$$;

create or replace function public.set_my_referrer(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_code is null or trim(p_code) = '' then return false; end if;
  v_ref := public.member_id_from_code(p_code);
  if v_ref is null or v_ref = v_uid then return false; end if;
  update public.profiles
  set referrer_id = v_ref
  where id = v_uid and referrer_id is null;
  return found;
end;
$$;

create or replace function public.deposit_usdt(p_amount numeric, p_reference text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_auto boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 50000 then
    raise exception 'Invalid amount';
  end if;
  v_auto := p_amount <= 500;
  insert into public.member_ledger (user_id, type, amount, currency, status, note)
  values (
    v_uid,
    'deposit',
    p_amount,
    'USDT',
    case when v_auto then 'completed' else 'pending' end,
    coalesce(nullif(trim(p_reference), ''), 'Deposit request')
  )
  returning id into v_id;
  if v_auto then
    update public.profiles set wallet_usdt = wallet_usdt + p_amount where id = v_uid;
  end if;
  return v_id;
end;
$$;

create or replace function public.withdraw_usdt(p_amount numeric, p_address text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet numeric;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  if p_address is null or length(trim(p_address)) < 8 then raise exception 'Invalid address'; end if;
  select wallet_usdt into v_wallet from public.profiles where id = v_uid for update;
  if v_wallet < p_amount then raise exception 'Insufficient wallet balance'; end if;
  update public.profiles set wallet_usdt = wallet_usdt - p_amount where id = v_uid;
  insert into public.member_ledger (user_id, type, amount, currency, status, note, counterparty)
  values (v_uid, 'withdraw', p_amount, 'USDT', 'pending', left(trim(p_address), 120), 'Withdrawal')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.member_code(p_id uuid)
returns text
language sql
immutable
as $$
  select 'XZ' || upper(substring(replace(p_id::text, '-', '') from 1 for 8));
$$;

create or replace function public.buy_credits(p_usdt numeric)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet numeric;
  v_credits bigint;
  v_ref uuid;
  v_comm numeric;
  v_rate constant int := 100;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_usdt is null or p_usdt <= 0 or p_usdt > 10000 then raise exception 'Invalid amount'; end if;
  select wallet_usdt, referrer_id into v_wallet, v_ref
  from public.profiles where id = v_uid for update;
  if v_wallet < p_usdt then raise exception 'Insufficient USDT wallet'; end if;
  v_credits := floor(p_usdt * v_rate)::bigint;
  update public.profiles
  set wallet_usdt = wallet_usdt - p_usdt, balance = balance + v_credits
  where id = v_uid;
  insert into public.member_ledger (user_id, type, amount, currency, status, note)
  values (v_uid, 'buy_credits', p_usdt, 'USDT', 'completed', format('+%s game credits', v_credits));
  insert into public.member_ledger (user_id, type, amount, currency, status, note)
  values (v_uid, 'buy_credits', v_credits, 'CR', 'completed', format('Bought with %s USDT', p_usdt));
  if v_ref is not null then
    v_comm := round(p_usdt * 0.05, 2);
    if v_comm > 0 then
      update public.profiles set wallet_usdt = wallet_usdt + v_comm where id = v_ref;
      insert into public.member_ledger (user_id, type, amount, currency, status, counterparty, note)
      values (v_ref, 'commission', v_comm, 'USDT', 'completed', public.member_code(v_uid), 'Direct bonus 5%');
    end if;
  end if;
  return v_credits;
end;
$$;

create or replace function public.transfer_usdt(p_to_code text, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_to uuid;
  v_wallet numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_to := public.member_id_from_code(p_to_code);
  if v_to is null then raise exception 'Member not found'; end if;
  if v_to = v_uid then raise exception 'Cannot transfer to yourself'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  select wallet_usdt into v_wallet from public.profiles where id = v_uid for update;
  if v_wallet < p_amount then raise exception 'Insufficient wallet balance'; end if;
  update public.profiles set wallet_usdt = wallet_usdt - p_amount where id = v_uid;
  update public.profiles set wallet_usdt = wallet_usdt + p_amount where id = v_to;
  insert into public.member_ledger (user_id, type, amount, currency, status, counterparty, note)
  values (v_uid, 'transfer_out', p_amount, 'USDT', 'completed', public.member_code(v_to), 'P2P USDT sent');
  insert into public.member_ledger (user_id, type, amount, currency, status, counterparty, note)
  values (v_to, 'transfer_in', p_amount, 'USDT', 'completed', public.member_code(v_uid), 'P2P USDT received');
  return true;
end;
$$;

create or replace function public.transfer_credits(p_to_code text, p_amount bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_to uuid;
  v_bal bigint;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_to := public.member_id_from_code(p_to_code);
  if v_to is null then raise exception 'Member not found'; end if;
  if v_to = v_uid then raise exception 'Cannot transfer to yourself'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  select balance into v_bal from public.profiles where id = v_uid for update;
  if v_bal < p_amount then raise exception 'Insufficient game credits'; end if;
  update public.profiles set balance = balance - p_amount where id = v_uid;
  update public.profiles set balance = balance + p_amount where id = v_to;
  insert into public.member_ledger (user_id, type, amount, currency, status, counterparty, note)
  values (v_uid, 'transfer_out', p_amount, 'CR', 'completed', public.member_code(v_to), 'P2P credits sent');
  insert into public.member_ledger (user_id, type, amount, currency, status, counterparty, note)
  values (v_to, 'transfer_in', p_amount, 'CR', 'completed', public.member_code(v_uid), 'P2P credits received');
  return true;
end;
$$;

create or replace function public.get_leaderboard(p_limit int default 15)
returns table (
  display_name text,
  balance bigint,
  rank_pos int
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(p.display_name), ''), 'Player') as display_name,
    p.balance,
    (row_number() over (order by p.balance desc))::int as rank_pos
  from public.profiles p
  where p.balance > 0
  order by p.balance desc
  limit greatest(1, least(coalesce(p_limit, 15), 50));
$$;

create or replace function public.get_my_network()
returns table (
  member_code text,
  display_name text,
  balance bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    public.member_code(p.id),
    coalesce(nullif(trim(p.display_name), ''), 'Member'),
    p.balance,
    p.created_at
  from public.profiles p
  where p.referrer_id = auth.uid()
  order by p.created_at desc
  limit 50;
$$;

grant execute on function public.member_id_from_code(text) to authenticated;
grant execute on function public.set_my_referrer(text) to authenticated;
grant execute on function public.deposit_usdt(numeric, text) to authenticated;
grant execute on function public.withdraw_usdt(numeric, text) to authenticated;
grant execute on function public.buy_credits(numeric) to authenticated;
grant execute on function public.transfer_usdt(text, numeric) to authenticated;
grant execute on function public.transfer_credits(text, bigint) to authenticated;
grant execute on function public.get_leaderboard(int) to authenticated;
grant execute on function public.get_my_network() to authenticated;
grant execute on function public.member_code(uuid) to authenticated;

-- Allow members to update display name + game prefs (not wallet_usdt)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
