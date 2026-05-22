/**
 * Local spin (browser) — no PowerShell / Edge Function required.
 * Balance saved to Supabase profile when logged in.
 */
import { mergeJackpots } from './config.js';
import { SlotEngine } from './engine.js';
import {
  FREE_SPIN_MULT_CAP,
  FREE_SPIN_START_MULT,
  JACKPOT_CFG,
  MAX_WIN_TIMES_BET,
} from './game-data.js';
import * as playerStore from './player-store.js';

const engine = new SlotEngine();

function capWin(pay, bet) {
  return Math.min(pay, Math.max(1, bet * MAX_WIN_TIMES_BET));
}

function contributeJackpots(jackpots, bet) {
  for (const [tier, cfg] of Object.entries(JACKPOT_CFG)) {
    jackpots[tier] += Math.floor(bet * cfg.contrib);
  }
}

function tryJackpot(jackpots, wildCount, rng = Math.random) {
  if (wildCount >= 8) {
    const amt = jackpots.mega;
    jackpots.mega = JACKPOT_CFG.mega.seed;
    return { tier: 'mega', label: 'MEGA', amount: amt };
  }
  for (const [tier, cfg] of Object.entries(JACKPOT_CFG)) {
    if (rng() < cfg.odds) {
      const amt = jackpots[tier];
      jackpots[tier] = cfg.seed;
      return { tier, label: cfg.label, amount: amt };
    }
  }
  return null;
}

export function previewGrid() {
  return { grid: engine.spinGrid() };
}

export async function runSpin(state) {
  const bet = state.lineBet * state.activeLines * state.betMult;
  const isFree = state.freeSpinsLeft > 0;

  if (!isFree && state.balance < bet) {
    throw new Error('Insufficient balance');
  }

  state.jackpots = mergeJackpots(state.jackpots);
  const grid = engine.spinGrid();
  const sessionMult = isFree ? state.sessionWinMult : 1;
  const result = engine.evaluate(
    grid,
    state.activeLines,
    state.lineBet,
    state.betMult,
    sessionMult
  );

  result.totalPay = capWin(result.totalPay, bet);
  let totalWin = result.totalPay;
  let jackpot = null;

  if (!isFree) {
    state.balance -= bet;
    contributeJackpots(state.jackpots, bet);
  } else {
    state.freeSpinsLeft--;
  }

  jackpot = tryJackpot(state.jackpots, result.wildCount);
  if (jackpot) totalWin += jackpot.amount;

  if (totalWin > 0 || result.totalFreeSpins > 0) {
    state.balance += totalWin;
    if (result.scatterWin || result.totalFreeSpins > 0) {
      const sm = result.scatterWin?.mult || 1;
      state.sessionWinMult = Math.max(
        state.sessionWinMult,
        sm,
        FREE_SPIN_START_MULT
      );
      state.freeSpinsLeft += result.totalFreeSpins;
    }
    if (isFree && totalWin > 0) {
      state.sessionWinMult = Math.min(
        FREE_SPIN_MULT_CAP,
        state.sessionWinMult + 1
      );
    }
  } else if (!isFree) {
    state.sessionWinMult = FREE_SPIN_START_MULT;
  }

  if (state.freeSpinsLeft === 0 && isFree) {
    state.sessionWinMult = 1;
  }

  await playerStore.saveGameState(state);

  return {
    grid,
    result,
    totalWin,
    jackpot,
    balance: state.balance,
    freeSpinsLeft: state.freeSpinsLeft,
    sessionWinMult: state.sessionWinMult,
    jackpots: state.jackpots,
  };
}
