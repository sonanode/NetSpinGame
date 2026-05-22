/**
 * XZENZY member portal — Supabase RPC + profile helpers
 */
import { getSupabase } from './supabase-client.js';

export const CREDITS_PER_USDT = 100;

export async function loadMemberProfile(userId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select(
      'email, display_name, balance, wallet_usdt, line_bet, active_lines, bet_mult, referrer_id, rank, sound, free_spins_left, created_at, updated_at'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadLedger(limit = 30) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('member_ledger')
    .select('type, amount, currency, status, counterparty, note, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function loadCommissions(limit = 20) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('member_ledger')
    .select('amount, counterparty, note, created_at')
    .eq('type', 'commission')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function loadNetwork() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('get_my_network');
  if (error) throw error;
  return data || [];
}

export async function loadLeaderboard() {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('get_leaderboard', { p_limit: 15 });
  if (error) throw error;
  return data || [];
}

export async function countReferrals(userId) {
  const sb = getSupabase();
  const { count, error } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function setReferrer(code) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('set_my_referrer', { p_code: code });
  if (error) throw error;
  return data;
}

export async function depositUsdt(amount, reference) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('deposit_usdt', {
    p_amount: amount,
    p_reference: reference || null,
  });
  if (error) throw error;
  return data;
}

export async function withdrawUsdt(amount, address) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('withdraw_usdt', {
    p_amount: amount,
    p_address: address,
  });
  if (error) throw error;
  return data;
}

export async function buyCredits(usdt) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('buy_credits', { p_usdt: usdt });
  if (error) throw error;
  return data;
}

export async function transferUsdt(toCode, amount) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('transfer_usdt', {
    p_to_code: toCode.trim().toUpperCase(),
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

export async function transferCredits(toCode, amount) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('transfer_credits', {
    p_to_code: toCode.trim().toUpperCase(),
    p_amount: Math.floor(amount),
  });
  if (error) throw error;
  return data;
}

export async function updateDisplayName(name) {
  const sb = getSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ display_name: name.trim().slice(0, 32) })
    .eq('id', (await sb.auth.getUser()).data.user.id);
  if (error) throw error;
}

export async function updateSoundPref(sound) {
  const sb = getSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ sound })
    .eq('id', (await sb.auth.getUser()).data.user.id);
  if (error) throw error;
}

export function commissionMtd(rows) {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return rows
    .filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((s, r) => s + Number(r.amount), 0);
}
