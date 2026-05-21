import { JACKPOTS } from './config.js';
import { getSupabase } from './supabase-client.js';

const defaultJackpots = () => ({
  mini: JACKPOTS.mini.seed,
  minor: JACKPOTS.minor.seed,
  major: JACKPOTS.major.seed,
  mega: JACKPOTS.mega.seed,
});

let userId = null;
let saveTimer = null;
let pending = null;

export function setUserId (id) {
  userId = id;
}

export async function loadProfile (state) {
  const sb = getSupabase();
  if (!sb || !userId) return false;

  const { data, error } = await sb
    .from('profiles')
    .select('balance, line_bet, active_lines, bet_mult, jackpots, sound')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  state.balance = Number(data.balance);
  state.lineBet = data.line_bet;
  state.activeLines = data.active_lines;
  state.betMult = data.bet_mult;
  state.sound = data.sound;
  const jp = data.jackpots;
  if (jp && typeof jp === 'object' && Object.keys(jp).length) {
    state.jackpots = { ...defaultJackpots(), ...jp };
  }
  return true;
}

export function scheduleSave (state) {
  pending = {
    balance: state.balance,
    line_bet: state.lineBet,
    active_lines: state.activeLines,
    bet_mult: state.betMult,
    jackpots: state.jackpots,
    sound: state.sound,
  };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}

async function flushSave () {
  const sb = getSupabase();
  if (!sb || !userId || !pending) return;
  const payload = { ...pending, updated_at: new Date().toISOString() };
  pending = null;
  await sb.from('profiles').update(payload).eq('id', userId);
}

export async function flushSaveNow () {
  clearTimeout(saveTimer);
  await flushSave();
}
