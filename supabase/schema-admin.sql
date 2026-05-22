-- XZENZY admin portal — run after schema.sql + schema-secure.sql + schema-member.sql
-- Grants staff tools over members, wallet, and pending ledger (deposits / withdrawals)

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_admin_user() then raise exception 'Admin access required'; end if;
end;
$$;

-- Dashboard stats for admin home
create or replace function public.admin_overview()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_members bigint;
  v_pending bigint;
  v_wallet numeric;
  v_credits bigint;
begin
  perform public.assert_admin();
  select count(*)::bigint into v_members from public.profiles;
  select count(*)::bigint into v_pending
  from public.member_ledger where status = 'pending';
  select coalesce(sum(wallet_usdt), 0), coalesce(sum(balance), 0)::bigint
  into v_wallet, v_credits from public.profiles;
  return json_build_object(
    'members', v_members,
    'pending', v_pending,
    'total_wallet_usdt', v_wallet,
    'total_credits', v_credits
  );
end;
$$;

create or replace function public.admin_list_members(
  p_search text default null,
  p_limit int default 50
)
returns table (
  user_id uuid,
  member_code text,
  email text,
  display_name text,
  wallet_usdt numeric,
  balance bigint,
  rank text,
  is_admin boolean,
  referrer_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text;
begin
  perform public.assert_admin();
  v_q := '%' || lower(trim(coalesce(p_search, ''))) || '%';
  return query
  select
    p.id,
    public.member_code(p.id),
    p.email,
    coalesce(nullif(trim(p.display_name), ''), 'Member'),
    p.wallet_usdt,
    p.balance,
    p.rank,
    p.is_admin,
    case when p.referrer_id is not null then public.member_code(p.referrer_id) else null end,
    p.created_at
  from public.profiles p
  where p_search is null or trim(p_search) = ''
    or lower(p.email) like v_q
    or lower(p.display_name) like v_q
    or lower(public.member_code(p.id)) like v_q
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create or replace function public.admin_list_pending()
returns table (
  ledger_id uuid,
  user_id uuid,
  member_code text,
  member_email text,
  type text,
  amount numeric,
  currency text,
  note text,
  counterparty text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.user_id,
    public.member_code(l.user_id),
    p.email,
    l.type,
    l.amount,
    l.currency,
    l.note,
    l.counterparty,
    l.created_at
  from public.member_ledger l
  join public.profiles p on p.id = l.user_id
  where l.status = 'pending'
  order by l.created_at asc;
$$;

create or replace function public.admin_list_ledger(p_limit int default 40)
returns table (
  ledger_id uuid,
  member_code text,
  type text,
  amount numeric,
  currency text,
  status text,
  note text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    public.member_code(l.user_id),
    l.type,
    l.amount,
    l.currency,
    l.status,
    l.note,
    l.created_at
  from public.member_ledger l
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$$;

-- Approve or reject pending deposit / withdrawal
create or replace function public.admin_resolve_ledger(
  p_ledger_id uuid,
  p_approve boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_ledger%rowtype;
begin
  perform public.assert_admin();
  select * into v_row
  from public.member_ledger
  where id = p_ledger_id and status = 'pending'
  for update;
  if not found then raise exception 'Pending transaction not found'; end if;

  if p_approve then
    if v_row.type = 'deposit' and v_row.currency = 'USDT' then
      update public.profiles
      set wallet_usdt = wallet_usdt + v_row.amount
      where id = v_row.user_id;
    end if;
    update public.member_ledger set status = 'completed' where id = p_ledger_id;
  else
    if v_row.type = 'withdraw' and v_row.currency = 'USDT' then
      update public.profiles
      set wallet_usdt = wallet_usdt + v_row.amount
      where id = v_row.user_id;
    end if;
    update public.member_ledger set status = 'cancelled' where id = p_ledger_id;
  end if;
  return true;
end;
$$;

create or replace function public.admin_adjust_wallet(
  p_member_code text,
  p_amount numeric,
  p_note text default 'Admin adjustment'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  perform public.assert_admin();
  if p_amount is null or p_amount = 0 then raise exception 'Invalid amount'; end if;
  v_uid := public.member_id_from_code(p_member_code);
  if v_uid is null then raise exception 'Member not found'; end if;
  update public.profiles set wallet_usdt = wallet_usdt + p_amount where id = v_uid;
  if (select wallet_usdt from public.profiles where id = v_uid) < 0 then
    raise exception 'Wallet would go negative';
  end if;
  insert into public.member_ledger (user_id, type, amount, currency, status, note)
  values (
    v_uid,
    'admin_adjust',
    abs(p_amount),
    'USDT',
    'completed',
    coalesce(nullif(trim(p_note), ''), 'Admin USDT adjustment') ||
      case when p_amount < 0 then ' (debit)' else ' (credit)' end
  );
  return true;
end;
$$;

create or replace function public.admin_adjust_credits(
  p_member_code text,
  p_amount bigint,
  p_note text default 'Admin adjustment'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_bal bigint;
begin
  perform public.assert_admin();
  if p_amount is null or p_amount = 0 then raise exception 'Invalid amount'; end if;
  v_uid := public.member_id_from_code(p_member_code);
  if v_uid is null then raise exception 'Member not found'; end if;
  select balance into v_bal from public.profiles where id = v_uid for update;
  if v_bal + p_amount < 0 then raise exception 'Credits would go negative'; end if;
  update public.profiles set balance = balance + p_amount where id = v_uid;
  insert into public.member_ledger (user_id, type, amount, currency, status, note)
  values (
    v_uid,
    'admin_adjust',
    abs(p_amount),
    'CR',
    'completed',
    coalesce(nullif(trim(p_note), ''), 'Admin credits adjustment') ||
      case when p_amount < 0 then ' (debit)' else ' (credit)' end
  );
  return true;
end;
$$;

create or replace function public.admin_set_rank(p_member_code text, p_rank text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_rank text := lower(trim(coalesce(p_rank, 'member')));
begin
  perform public.assert_admin();
  if v_rank not in ('member', 'vip', 'agent', 'admin') then
    raise exception 'Invalid rank';
  end if;
  v_uid := public.member_id_from_code(p_member_code);
  if v_uid is null then raise exception 'Member not found'; end if;
  update public.profiles set rank = v_rank where id = v_uid;
  return true;
end;
$$;

create or replace function public.admin_set_admin_flag(
  p_member_code text,
  p_is_admin boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  perform public.assert_admin();
  v_uid := public.member_id_from_code(p_member_code);
  if v_uid is null then raise exception 'Member not found'; end if;
  if v_uid = auth.uid() and not p_is_admin then
    raise exception 'Cannot remove your own admin access';
  end if;
  update public.profiles
  set is_admin = p_is_admin,
      rank = case when p_is_admin then 'admin' else rank end
  where id = v_uid;
  return true;
end;
$$;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_members(text, int) to authenticated;
grant execute on function public.admin_list_pending() to authenticated;
grant execute on function public.admin_list_ledger(int) to authenticated;
grant execute on function public.admin_resolve_ledger(uuid, boolean) to authenticated;
grant execute on function public.admin_adjust_wallet(text, numeric, text) to authenticated;
grant execute on function public.admin_adjust_credits(text, bigint, text) to authenticated;
grant execute on function public.admin_set_rank(text, text) to authenticated;
grant execute on function public.admin_set_admin_flag(text, boolean) to authenticated;
