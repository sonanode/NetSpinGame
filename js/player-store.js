import { mergeJackpots } from './config.js';
import { getSupabase } from './supabase-client.js';
import { saveSettings } from './spin-api.js';

let userId = null;
let saveTimer = null;

export function setUserId (id) {
  userId = id;
}

export async function loadProfile (state) {
  const sb = getSupabase();
  if (!sb || !userId) return false;

  const { data, error } = await sb
    .from('profiles')
    .select(
      'balance, line_bet, active_lines, bet_mult, jackpots, sound, free_spins_left, session_win_mult'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  state.balance = Number(data.balance);
  state.lineBet = data.line_bet;
  state.activeLines = Math.min(
    40,
    Math.max(1, Number(data.active_lines) || 40)
  );
  state.betMult = data.bet_mult;
  state.sound = data.sound;
  state.freeSpinsLeft = Number(data.free_spins_left ?? 0);
  state.sessionWinMult = Number(data.session_win_mult ?? 1);
  state.jackpots = mergeJackpots(data.jackpots);
  return true;
}

export function scheduleSaveSettings (state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSettings({
      lineBet: state.lineBet,
      activeLines: state.activeLines,
      betMult: state.betMult,
      sound: state.sound,
    });
  }, 400);
}

export async function flushSaveNow (state) {
  clearTimeout(saveTimer);
  await saveSettings({
    lineBet: state.lineBet,
    activeLines: state.activeLines,
    betMult: state.betMult,
    sound: state.sound,
  });
}
