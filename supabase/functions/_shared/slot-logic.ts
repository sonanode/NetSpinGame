/** Server-only slot logic — not shipped to browser */

export const COLS = 5;
export const ROWS = 4;
export const WILD_ID = 6;
export const SCATTER_ID = 10;
export const BONUS_ID = 11;
export const USE_WILD = true;
export const USE_WILD_IN_FIRST = false;

const WILD_SUB_IDS = new Set([0, 1, 2, 3, 4, 5, 7, 8, 9]);

export const PAYLINE_PATHS: number[][] = [
  [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3],
  [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
  [0, 1, 1, 1, 0], [3, 2, 2, 2, 3], [1, 2, 2, 2, 1], [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1], [2, 3, 2, 3, 2], [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
  [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [0, 0, 1, 2, 3], [3, 3, 2, 1, 0],
  [1, 1, 0, 1, 1], [2, 2, 3, 2, 2], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
  [1, 0, 1, 2, 3], [2, 3, 2, 1, 0], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
  [1, 2, 3, 2, 1], [2, 1, 0, 1, 2], [0, 2, 0, 2, 0], [3, 1, 3, 1, 3],
  [1, 3, 1, 3, 1], [2, 0, 2, 0, 2], [0, 3, 0, 3, 0], [3, 0, 3, 0, 3],
  [1, 1, 2, 1, 1], [2, 2, 1, 2, 2], [0, 2, 1, 2, 0], [3, 1, 2, 1, 3],
];

/** 40 lines + lower pays ≈ ~85% RTP — wins exist but not every spin */
const BASE_PAYTABLE = [
  { line: [2, 2, 2, -1, -1], pay: 0, freeSpins: 0 },
  { line: [2, 2, 2, 2, -1], pay: 1, freeSpins: 0 },
  { line: [2, 2, 2, 2, 2], pay: 2, freeSpins: 0 },
  { line: [1, 1, 1, -1, -1], pay: 0, freeSpins: 0 },
  { line: [1, 1, 1, 1, -1], pay: 1, freeSpins: 0 },
  { line: [1, 1, 1, 1, 1], pay: 3, freeSpins: 0 },
  { line: [4, 4, 4, -1, -1], pay: 0, freeSpins: 0 },
  { line: [4, 4, 4, 4, -1], pay: 2, freeSpins: 0 },
  { line: [4, 4, 4, 4, 4], pay: 4, freeSpins: 0 },
  { line: [9, 9, 9, -1, -1], pay: 0, freeSpins: 0 },
  { line: [9, 9, 9, 9, -1], pay: 2, freeSpins: 0 },
  { line: [9, 9, 9, 9, 9], pay: 5, freeSpins: 0 },
  { line: [5, 5, 5, -1, -1], pay: 2, freeSpins: 0 },
  { line: [5, 5, 5, 5, -1], pay: 5, freeSpins: 0 },
  { line: [5, 5, 5, 5, 5], pay: 8, freeSpins: 0 },
  { line: [0, 0, 0, -1, -1], pay: 3, freeSpins: 0 },
  { line: [0, 0, 0, 0, -1], pay: 5, freeSpins: 0 },
  { line: [0, 0, 0, 0, 0], pay: 10, freeSpins: 0 },
  { line: [3, 3, 3, -1, -1], pay: 3, freeSpins: 0 },
  { line: [3, 3, 3, 3, -1], pay: 6, freeSpins: 0 },
  { line: [3, 3, 3, 3, 3], pay: 11, freeSpins: 0 },
  { line: [8, 8, 8, -1, -1], pay: 3, freeSpins: 0 },
  { line: [8, 8, 8, 8, -1], pay: 6, freeSpins: 0 },
  { line: [8, 8, 8, 8, 8], pay: 12, freeSpins: 0 },
  { line: [7, 7, 7, -1, -1], pay: 0, freeSpins: 2 },
  { line: [7, 7, 7, 7, -1], pay: 0, freeSpins: 4 },
  { line: [7, 7, 7, 7, 7], pay: 0, freeSpins: 6 },
  { line: [6, 6, 6, 6, 6], pay: 22, freeSpins: 0 },
  { line: [11, 11, 11, -1, -1], pay: 1, freeSpins: 0, mult: 2 },
  { line: [11, 11, 11, 11, -1], pay: 4, freeSpins: 0, mult: 2 },
  { line: [11, 11, 11, 11, 11], pay: 0, freeSpins: 0, mult: 2 },
];

const SCATTER_PAYTABLE = [
  { count: 3, pay: 1, freeSpins: 3, mult: 2 },
  { count: 4, pay: 4, freeSpins: 5, mult: 2 },
  { count: 5, pay: 12, freeSpins: 8, mult: 2 },
];

function decodeSymbOrder(hex: string) {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    const chunk = hex.slice(i, i + 8);
    if (chunk.length < 8) break;
    const b = chunk.match(/../g)!;
    out.push(parseInt(b.reverse().join(''), 16));
  }
  return out;
}

const REEL_STRIPS = [
  decodeSymbOrder(
    '080000000700000006000000090000000a0000000100000004000000020000000600000004000000060000000500000009000000060000000000000003000000080000000000000006000000060000000000000006000000'
  ),
  decodeSymbOrder(
    '0400000003000000000000000700000005000000020000000800000009000000000000000a00000000000000010000000600000000000000000000000300000000000000'
  ),
  decodeSymbOrder(
    '00000000070000000100000002000000030000000a0000000600000008000000090000000900000008000000040000000500000006000000000000000600000002000000000000000600000005000000'
  ),
  decodeSymbOrder(
    '000000000700000001000000020000000300000005000000040000000a000000080000000000000009000000000000000100000006000000000000000000000006000000'
  ),
  decodeSymbOrder(
    '0000000001000000020000000300000004000000070000000a0000000500000008000000060000000a00000001000000090000000800000006000000000000000600000000000000'
  ),
];

export const JACKPOTS = {
  mini: { label: 'MINI', seed: 500, contrib: 0.012, odds: 0.0012 },
  minor: { label: 'MINOR', seed: 2500, contrib: 0.015, odds: 0.0005 },
  major: { label: 'MAJOR', seed: 12000, contrib: 0.018, odds: 0.00015 },
  mega: { label: 'MEGA', seed: 50000, contrib: 0.022, odds: 0.000025 },
};

export const GAME_DEFAULTS = {
  maxLineBet: 20,
  maxActiveLines: 40,
  defaultActiveLines: 40,
  freeSpinStartMult: 2,
  freeSpinMultCap: 5,
  /** Max line+scatter win per spin (× total bet); jackpots extra */
  maxWinTimesBet: 40,
};

function canWildSubstitute(symbolId: number) {
  return WILD_SUB_IDS.has(symbolId);
}

function cloneLine(line: number[]) {
  return [...line];
}

function linesEqual(a: number[], b: number[], len = 5) {
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return false;
  return true;
}

function getWildPositions(line: number[]) {
  const pos: number[] = [];
  let counter = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== -1 && line[i] !== WILD_ID) {
      if (!USE_WILD_IN_FIRST && counter === 0) counter++;
      else if (canWildSubstitute(line[i])) pos.push(i);
      counter++;
    }
  }
  return pos;
}

function expandWildLines(baseLine: number[]) {
  const full = [cloneLine(baseLine)];
  if (!USE_WILD) return full;
  const wPoss = getWildPositions(baseLine);
  const count = wPoss.length;
  const total = 1 << count;
  for (let mask = 1; mask < total; mask++) {
    let bits = 0;
    for (let i = 0; i < count; i++) if (mask & (1 << i)) bits++;
    if (bits < 1 || bits > count) continue;
    const p = cloneLine(baseLine);
    for (let i = 0; i < count; i++) {
      if (mask & (1 << i)) p[wPoss[i]] = WILD_ID;
    }
    if (!linesEqual(p, baseLine) && !full.some((x) => linesEqual(x, p))) {
      full.push(p);
    }
  }
  return full;
}

function buildPaytableFull() {
  const full: Array<{
    line: number[];
    pay: number;
    freeSpins: number;
    mult?: number;
  }> = [];
  for (const entry of BASE_PAYTABLE) {
    const base = cloneLine(entry.line);
    full.push({ ...entry, line: base });
    for (const wl of expandWildLines(base)) {
      if (!linesEqual(wl, base)) full.push({ ...entry, line: wl });
    }
  }
  return full;
}

const PAYTABLE_FULL = buildPaytableFull();

function matchPayPattern(actual: number[], pattern: number[]) {
  for (let i = 0; i < COLS; i++) {
    const req = pattern[i];
    if (req < 0) continue;
    const sym = actual[i];
    if (sym === req) continue;
    if (sym === WILD_ID && canWildSubstitute(req)) continue;
    if (req === WILD_ID && sym === WILD_ID) continue;
    return false;
  }
  return true;
}

function symbolsOnPath(grid: number[][], path: number[]) {
  return path.map((row, col) => grid[row][col]);
}

function countScatters(grid: number[][]) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === SCATTER_ID) n++;
    }
  }
  return n;
}

function countSymbol(grid: number[][], id: number) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === id) n++;
    }
  }
  return n;
}

export function spinGrid(rng: () => number = Math.random) {
  const stops = REEL_STRIPS.map((strip) => Math.floor(rng() * strip.length));
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  for (let c = 0; c < COLS; c++) {
    const strip = REEL_STRIPS[c];
    const stop = stops[c];
    for (let r = 0; r < ROWS; r++) {
      grid[r][c] = strip[(stop + r) % strip.length];
    }
  }
  return grid;
}

export function evaluate(
  grid: number[][],
  activeLines: number,
  lineBet: number,
  betMult = 1,
  sessionWinMult = 1
) {
  const lineWins: Array<Record<string, unknown>> = [];
  let totalPay = 0;
  let totalFreeSpins = 0;
  let lineMultBoost = 1;

  for (let li = 0; li < activeLines && li < PAYLINE_PATHS.length; li++) {
    const path = PAYLINE_PATHS[li];
    const actual = symbolsOnPath(grid, path);
    let best: (typeof BASE_PAYTABLE)[0] & { path: number[]; actual: number[] } | null = null;

    for (const entry of PAYTABLE_FULL) {
      if (!matchPayPattern(actual, entry.line)) continue;
      if (
        !best ||
        entry.pay > best.pay ||
        (entry.pay === best.pay && entry.freeSpins > best.freeSpins) ||
        ((entry.mult || 0) > (best.mult || 0))
      ) {
        best = { ...entry, path: [...path], actual: [...actual] };
      }
    }

    if (best && (best.pay > 0 || best.freeSpins > 0 || (best.mult || 0) > 1)) {
      const coins = best.pay * lineBet * betMult;
      totalPay += coins;
      totalFreeSpins += best.freeSpins;
      if (best.mult && best.mult > lineMultBoost) lineMultBoost = best.mult;
      lineWins.push({
        lineIndex: li,
        path: [...path],
        pay: best.pay,
        coins,
        freeSpins: best.freeSpins,
        mult: best.mult || 1,
        symbols: best.actual,
      });
    }
  }

  const scatterCount = countScatters(grid);
  let scatterWin: Record<string, number> | null = null;
  let scatterMult = 1;
  for (const sp of SCATTER_PAYTABLE) {
    if (scatterCount >= sp.count) {
      scatterWin = {
        count: scatterCount,
        pay: sp.pay * lineBet * activeLines * betMult,
        freeSpins: sp.freeSpins,
        mult: sp.mult || 1,
      };
      scatterMult = sp.mult || 1;
    }
  }

  if (scatterWin) {
    totalPay += scatterWin.pay;
    totalFreeSpins += scatterWin.freeSpins;
    if (scatterMult > lineMultBoost) lineMultBoost = scatterMult;
  }

  const bonusOnGrid = countSymbol(grid, BONUS_ID);
  if (bonusOnGrid >= 3) {
    lineMultBoost = Math.max(lineMultBoost, Math.min(4, bonusOnGrid));
  }

  const effectiveMult = Math.min(6, sessionWinMult * lineMultBoost);
  totalPay = Math.floor(totalPay * effectiveMult);
  totalFreeSpins = Math.min(12, totalFreeSpins);

  const wildCount = countSymbol(grid, WILD_ID);

  return {
    lineWins,
    scatterWin,
    totalPay,
    totalFreeSpins,
    scatterCount,
    lineMultBoost,
    effectiveMult,
    bonusOnGrid,
    wildCount,
  };
}

export function defaultJackpots() {
  return {
    mini: JACKPOTS.mini.seed,
    minor: JACKPOTS.minor.seed,
    major: JACKPOTS.major.seed,
    mega: JACKPOTS.mega.seed,
  };
}

export function contributeJackpots(jackpots: Record<string, number>, bet: number) {
  for (const [tier, cfg] of Object.entries(JACKPOTS)) {
    jackpots[tier] += Math.floor(bet * cfg.contrib);
  }
}

/** Cap regular win so one spin cannot return hundreds of × bet */
export function capRegularWin(totalPay: number, totalBet: number) {
  const cap = Math.max(1, totalBet * GAME_DEFAULTS.maxWinTimesBet);
  return Math.min(totalPay, cap);
}

export function tryJackpotWin(
  jackpots: Record<string, number>,
  wildCount: number,
  rng: () => number = Math.random
) {
  if (wildCount >= 8) {
    const amt = jackpots.mega;
    jackpots.mega = JACKPOTS.mega.seed;
    return { tier: 'mega', label: 'MEGA', amount: amt };
  }
  const rolls: [string, number][] = [
    ['mega', JACKPOTS.mega.odds],
    ['major', JACKPOTS.major.odds],
    ['minor', JACKPOTS.minor.odds],
    ['mini', JACKPOTS.mini.odds],
  ];
  for (const [tier, odds] of rolls) {
    if (rng() < odds) {
      const amt = jackpots[tier];
      jackpots[tier] = JACKPOTS[tier as keyof typeof JACKPOTS].seed;
      return { tier, label: JACKPOTS[tier as keyof typeof JACKPOTS].label, amount: amt };
    }
  }
  return null;
}
