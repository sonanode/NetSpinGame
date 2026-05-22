/**
 * XZENZY admin portal — Supabase RPC (requires schema-admin.sql)
 */
import { getSupabase } from './supabase-client.js';

export async function checkIsAdmin() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('is_admin_user');
  if (error) throw error;
  return !!data;
}

export async function adminOverview() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_overview');
  if (error) throw error;
  return data || {};
}

export async function adminListMembers(search = '', limit = 50) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_list_members', {
    p_search: search || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function adminListPending() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_list_pending');
  if (error) throw error;
  return data || [];
}

export async function adminListLedger(limit = 40) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_list_ledger', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function adminResolveLedger(ledgerId, approve) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_resolve_ledger', {
    p_ledger_id: ledgerId,
    p_approve: approve,
  });
  if (error) throw error;
  return data;
}

export async function adminAdjustWallet(memberCode, amount, note) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_adjust_wallet', {
    p_member_code: memberCode.trim().toUpperCase(),
    p_amount: amount,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function adminAdjustCredits(memberCode, amount, note) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_adjust_credits', {
    p_member_code: memberCode.trim().toUpperCase(),
    p_amount: Math.trunc(amount),
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function adminSetRank(memberCode, rank) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_set_rank', {
    p_member_code: memberCode.trim().toUpperCase(),
    p_rank: rank,
  });
  if (error) throw error;
  return data;
}

export async function adminSetAdminFlag(memberCode, isAdmin) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('admin_set_admin_flag', {
    p_member_code: memberCode.trim().toUpperCase(),
    p_is_admin: isAdmin,
  });
  if (error) throw error;
  return data;
}
