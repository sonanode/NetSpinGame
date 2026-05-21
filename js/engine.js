import {
  BASE_PAYTABLE,
  BONUS_ID,
  COLS,
  PAYLINE_PATHS,
  REEL_STRIPS,
  ROWS,
  SCATTER_ID,
  SCATTER_PAYTABLE,
  SYMBOLS,
  USE_WILD,
  USE_WILD_IN_FIRST,
  WILD_ID,
} from './config.js';

function canWildSubstitute(symbolId) {
  const s = SYMBOLS[symbolId];
  return s && s.wildSub;
}

function cloneLine(line) {
  return [...line];
}

function linesEqual(a, b, len = 5) {
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return false;
  return true;
}

function getWildPositions(line) {
  const pos = [];
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

function expandWildLines(baseLine) {
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

export function buildPaytableFull() {
  const full = [];
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

function matchPayPattern(actual, pattern) {
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

function symbolsOnPath(grid, path) {
  return path.map((row, col) => grid[row][col]);
}

function countScatters(grid) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === SCATTER_ID) n++;
    }
  }
  return n;
}

function countSymbol(grid, id) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === id) n++;
    }
  }
  return n;
}

export class SlotEngine {
  constructor() {
    this.reelStops = REEL_STRIPS.map(() => 0);
    this.paytableFull = PAYTABLE_FULL;
  }

  spinGrid(rng = Math.random) {
    const stops = REEL_STRIPS.map((strip) => Math.floor(rng() * strip.length));
    this.reelStops = stops;
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

  evaluate(grid, activeLines, lineBet, betMult = 1, sessionWinMult = 1) {
    const lineWins = [];
    let totalPay = 0;
    let totalFreeSpins = 0;
    let lineMultBoost = 1;

    for (let li = 0; li < activeLines && li < PAYLINE_PATHS.length; li++) {
      const path = PAYLINE_PATHS[li];
      const actual = symbolsOnPath(grid, path);
      let best = null;

      for (const entry of this.paytableFull) {
        if (!matchPayPattern(actual, entry.line)) continue;
        if (
          !best ||
          entry.pay > best.pay ||
          (entry.pay === best.pay && entry.freeSpins > best.freeSpins) ||
          ((entry.mult || 0) > (best.mult || 0))
        ) {
          best = { ...entry, lineIndex: li, path, actual: [...actual] };
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
    let scatterWin = null;
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
      lineMultBoost = Math.max(lineMultBoost, bonusOnGrid);
    }

    const effectiveMult = sessionWinMult * lineMultBoost;
    totalPay = Math.floor(totalPay * effectiveMult);

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

  getStripForReel(col) {
    return REEL_STRIPS[col];
  }
}
