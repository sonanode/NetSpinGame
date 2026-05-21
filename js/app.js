import { audio } from './audio.js';
import {
  BET_MULTIPLIERS,
  COLS,
  GAME_DEFAULTS,
  JACKPOTS,
  PAYLINE_PATHS,
  ROWS,
  SPIN_TIMING,
  symbolImgUrl,
  SYMBOLS,
} from './config.js';
import { SlotEngine } from './engine.js';

const STORAGE_KEY = 'mk_neon_4x5_v2';
const JP_KEY = 'mk_jackpots_v1';

const el = {
  reels: document.getElementById('reels'),
  balance: document.getElementById('balance'),
  totalBet: document.getElementById('totalBet'),
  lineBet: document.getElementById('lineBet'),
  activeLines: document.getElementById('activeLines'),
  lastWin: document.getElementById('lastWin'),
  freeSpins: document.getElementById('freeSpins'),
  winMult: document.getElementById('winMult'),
  status: document.getElementById('status'),
  spinBtn: document.getElementById('spinBtn'),
  betDown: document.getElementById('betDown'),
  betUp: document.getElementById('betUp'),
  linesDown: document.getElementById('linesDown'),
  linesUp: document.getElementById('linesUp'),
  betMultBtns: document.getElementById('betMultBtns'),
  autoBtn: document.getElementById('autoBtn'),
  maxBetBtn: document.getElementById('maxBetBtn'),
  paytableBtn: document.getElementById('paytableBtn'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlayTitle'),
  overlayBody: document.getElementById('overlayBody'),
  overlayClose: document.getElementById('overlayClose'),
  bigWin: document.getElementById('bigWin'),
  bigWinTag: document.getElementById('bigWinTag'),
  bigWinAmount: document.getElementById('bigWinAmount'),
  bigWinSub: document.getElementById('bigWinSub'),
  jackpotWin: document.getElementById('jackpotWin'),
  jpWinTag: document.getElementById('jpWinTag'),
  jpWinAmount: document.getElementById('jpWinAmount'),
  lineCanvas: document.getElementById('lineCanvas'),
  soundToggle: document.getElementById('soundToggle'),
  jpMega: document.getElementById('jpMega'),
  jpMajor: document.getElementById('jpMajor'),
  jpMinor: document.getElementById('jpMinor'),
  jpMini: document.getElementById('jpMini'),
};

const engine = new SlotEngine();
const state = {
  balance: GAME_DEFAULTS.startBalance,
  lineBet: GAME_DEFAULTS.defaultLineBet,
  activeLines: GAME_DEFAULTS.defaultActiveLines,
  betMult: GAME_DEFAULTS.defaultBetMult,
  freeSpinsLeft: 0,
  sessionWinMult: 1,
  spinning: false,
  autoSpin: false,
  autoRemaining: 0,
  sound: true,
  grid: null,
  lastResult: null,
  jackpots: {},
};

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

function totalBet() {
  return state.lineBet * state.activeLines * state.betMult;
}

function loadJackpots() {
  try {
    const raw = localStorage.getItem(JP_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    mini: JACKPOTS.mini.seed,
    minor: JACKPOTS.minor.seed,
    major: JACKPOTS.major.seed,
    mega: JACKPOTS.mega.seed,
  };
}

function saveJackpots() {
  localStorage.setItem(JP_KEY, JSON.stringify(state.jackpots));
}

function renderJackpots() {
  el.jpMini.textContent = fmt(state.jackpots.mini);
  el.jpMinor.textContent = fmt(state.jackpots.minor);
  el.jpMajor.textContent = fmt(state.jackpots.major);
  el.jpMega.textContent = fmt(state.jackpots.mega);
}

function contributeJackpots(bet) {
  for (const [tier, cfg] of Object.entries(JACKPOTS)) {
    state.jackpots[tier] += Math.floor(bet * cfg.contrib);
  }
  saveJackpots();
  renderJackpots();
}

function tryJackpotWin(wildCount) {
  if (wildCount >= 8) {
    const amt = state.jackpots.mega;
    state.jackpots.mega = JACKPOTS.mega.seed;
    return { tier: 'mega', label: 'MEGA', amount: amt };
  }
  const rolls = [
    ['mega', JACKPOTS.mega.odds],
    ['major', JACKPOTS.major.odds],
    ['minor', JACKPOTS.minor.odds],
    ['mini', JACKPOTS.mini.odds],
  ];
  for (const [tier, odds] of rolls) {
    if (Math.random() < odds) {
      const amt = state.jackpots[tier];
      state.jackpots[tier] = JACKPOTS[tier].seed;
      return { tier, label: JACKPOTS[tier].label, amount: amt };
    }
  }
  return null;
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      balance: state.balance,
      lineBet: state.lineBet,
      activeLines: state.activeLines,
      betMult: state.betMult,
      sound: state.sound,
    })
  );
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (typeof d.balance === 'number') state.balance = d.balance;
    if (typeof d.lineBet === 'number') state.lineBet = d.lineBet;
    if (typeof d.activeLines === 'number') state.activeLines = d.activeLines;
    if (typeof d.betMult === 'number') state.betMult = d.betMult;
    if (typeof d.sound === 'boolean') state.sound = d.sound;
  } catch (_) {}
  state.jackpots = loadJackpots();
}

async function ensureAudio() {
  audio.setEnabled(state.sound);
  await audio.unlock();
}

function updateHud() {
  el.balance.textContent = fmt(state.balance);
  el.totalBet.textContent = fmt(totalBet());
  el.lineBet.textContent = String(state.lineBet);
  el.activeLines.textContent = String(state.activeLines);
  el.freeSpins.textContent =
    state.freeSpinsLeft > 0 ? `${state.freeSpinsLeft} FREE` : '—';
  el.winMult.textContent =
    state.freeSpinsLeft > 0
      ? `×${state.sessionWinMult}`
      : state.lastResult?.effectiveMult > 1
        ? `×${state.lastResult.effectiveMult}`
        : '×1';
  el.spinBtn.textContent = state.spinning
    ? '...'
    : state.freeSpinsLeft > 0
      ? 'FREE SPIN'
      : 'SPIN';
  el.spinBtn.disabled = state.spinning;
  const lock = state.spinning || state.freeSpinsLeft > 0;
  el.betDown.disabled = lock;
  el.betUp.disabled = lock;
  el.linesDown.disabled = lock;
  el.linesUp.disabled = lock;
  el.maxBetBtn.disabled = lock;
  el.autoBtn.classList.toggle('active', state.autoSpin);
  el.autoBtn.textContent = state.autoSpin
    ? `AUTO (${state.autoRemaining || '∞'})`
    : 'AUTO';
  document.querySelectorAll('#betMultBtns button').forEach((b) => {
    b.disabled = lock;
    b.classList.toggle('active', Number(b.dataset.mult) === state.betMult);
  });
}

function buildBetMultButtons() {
  el.betMultBtns.innerHTML = '';
  BET_MULTIPLIERS.forEach((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `×${m}`;
    b.dataset.mult = m;
    b.classList.toggle('active', m === state.betMult);
    b.onclick = async () => {
      await ensureAudio();
      audio.playBuy();
      state.betMult = m;
      save();
      updateHud();
    };
    el.betMultBtns.appendChild(b);
  });
}

function buildReels() {
  el.reels.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'reel-col';
    const view = document.createElement('div');
    view.className = 'reel-view';
    for (let r = 0; r < ROWS; r++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      cell.appendChild(img);
      view.appendChild(cell);
    }
    col.appendChild(view);
    el.reels.appendChild(col);
  }
}

function setCellImage(cell, symbolId, blur = false) {
  const sym = SYMBOLS[symbolId];
  const img = cell.querySelector('img');
  if (!sym || !img) return;
  img.src = symbolImgUrl(sym);
  img.classList.toggle('blur', blur);
}

function renderGrid(grid, winningCells = new Set()) {
  state.grid = grid;
  for (let c = 0; c < COLS; c++) {
    const col = el.reels.children[c];
    for (let r = 0; r < ROWS; r++) {
      const cell = col.querySelector(`.cell[data-row="${r}"]`);
      const key = `${r},${c}`;
      cell.classList.toggle('win', winningCells.has(key));
      setCellImage(cell, grid[r][c]);
    }
  }
  drawWinLines();
}

function winningCellKeys(result) {
  const set = new Set();
  if (!result || !state.grid) return set;
  for (const w of result.lineWins) {
    w.path.forEach((row, col) => set.add(`${row},${col}`));
  }
  if (result.scatterCount >= 3) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.grid[r][c] === 10) set.add(`${r},${c}`);
      }
    }
  }
  return set;
}

function drawWinLines() {
  const canvas = el.lineCanvas;
  const rect = el.reels.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const result = state.lastResult;
  if (!result?.lineWins?.length) return;
  const colW = rect.width / COLS;
  const rowH = rect.height / ROWS;
  result.lineWins.forEach((w, i) => {
    ctx.strokeStyle = `hsla(${280 + i * 12}, 100%, 65%, 0.95)`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    w.path.forEach((row, col) => {
      const x = col * colW + colW / 2;
      const y = row * rowH + rowH / 2;
      if (col === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function animateReels(finalGrid) {
  return new Promise((resolve) => {
    const cols = [...el.reels.children];
    const speed = state.autoSpin ? SPIN_TIMING.autoFactor : 1;
    audio.startSpinLoop();

    cols.forEach((col, ci) => {
      col.classList.add('spinning');
      const strip = engine.getStripForReel(ci);
      const stopMs = Math.round(
        (SPIN_TIMING.firstReelMs + ci * SPIN_TIMING.staggerPerReelMs) * speed
      );
      let frame = 0;
      const tick = setInterval(() => {
        frame++;
        for (let r = 0; r < ROWS; r++) {
          const cell = col.querySelector(`.cell[data-row="${r}"]`);
          const sym = strip[(frame + r + ci * 4) % strip.length];
          setCellImage(cell, sym, true);
        }
      }, SPIN_TIMING.frameIntervalMs);

      setTimeout(() => {
        clearInterval(tick);
        col.classList.remove('spinning');
        for (let r = 0; r < ROWS; r++) {
          setCellImage(
            col.querySelector(`.cell[data-row="${r}"]`),
            finalGrid[r][ci],
            false
          );
        }
        audio.playReelStop(ci);
        if (ci === cols.length - 1) {
          audio.stopSpinLoop();
          setTimeout(resolve, SPIN_TIMING.postStopPauseMs);
        }
      }, stopMs);
    });
  });
}

function showBigWin(tag, amount, sub = '') {
  el.bigWinTag.textContent = tag;
  el.bigWinAmount.textContent = fmt(amount);
  el.bigWinSub.textContent = sub;
  el.bigWin.classList.add('show');
  setTimeout(() => el.bigWin.classList.remove('show'), 3200);
}

function showJackpotOverlay(label, amount) {
  el.jpWinTag.textContent = `${label} JACKPOT!`;
  el.jpWinAmount.textContent = fmt(amount);
  el.jackpotWin.classList.add('show');
  setTimeout(() => el.jackpotWin.classList.remove('show'), 4000);
}

async function doSpin() {
  if (state.spinning) return;
  const bet = totalBet();
  const isFree = state.freeSpinsLeft > 0;

  if (!isFree && state.balance < bet) {
    el.status.textContent = 'Insufficient balance';
    state.autoSpin = false;
    updateHud();
    return;
  }

  await ensureAudio();
  if (state.freeSpinsLeft > 0) audio.startBgm(true);
  else audio.startBgm(false);

  state.spinning = true;
  el.status.textContent = 'Spinning...';
  el.lastWin.textContent = '0';
  audio.playClick();
  updateHud();

  if (!isFree) {
    state.balance -= bet;
    contributeJackpots(bet);
  } else {
    state.freeSpinsLeft--;
  }

  const grid = engine.spinGrid();
  await animateReels(grid);

  const sessionMult = isFree ? state.sessionWinMult : 1;
  const result = engine.evaluate(
    grid,
    state.activeLines,
    state.lineBet,
    state.betMult,
    sessionMult
  );
  state.lastResult = result;

  let totalWin = result.totalPay;
  const jp = tryJackpotWin(result.wildCount);
  if (jp) {
    totalWin += jp.amount;
    audio.playBigWin();
    audio.playBonus();
    showJackpotOverlay(jp.label, jp.amount);
    saveJackpots();
    renderJackpots();
  }

  if (totalWin > 0 || result.totalFreeSpins > 0) {
    state.balance += totalWin;
    el.lastWin.textContent = fmt(totalWin);

    if (jp) {
      /* already played */
    } else if (totalWin >= bet * GAME_DEFAULTS.bigWinMultiplier) {
      audio.playBigWin();
      showBigWin(
        'BIG WIN',
        totalWin,
        result.effectiveMult > 1 ? `×${result.effectiveMult} multiplier` : ''
      );
    } else {
      audio.playWin();
      setTimeout(() => audio.playCoins(), 200);
    }

    if (result.scatterWin || result.totalFreeSpins > 0) {
      audio.playBonus();
      const sm = result.scatterWin?.mult || 1;
      state.sessionWinMult = Math.max(
        state.sessionWinMult,
        sm,
        GAME_DEFAULTS.freeSpinStartMult
      );
      state.freeSpinsLeft += result.totalFreeSpins;
      if (result.scatterCount >= 3) {
        showBigWin(
          'FREE SPINS',
          result.totalFreeSpins,
          `Win multiplier ×${state.sessionWinMult}`
        );
      }
    }

    if (result.lineMultBoost > 1 && !result.scatterWin) {
      audio.playBonus();
    }

    if (isFree && totalWin > 0) {
      state.sessionWinMult = Math.min(
        GAME_DEFAULTS.freeSpinMultCap,
        state.sessionWinMult + 1
      );
    }

    const parts = [];
    if (result.lineWins.length) parts.push(`${result.lineWins.length} lines`);
    if (result.effectiveMult > 1) parts.push(`×${result.effectiveMult}`);
    if (result.scatterCount >= 3) parts.push(`${result.scatterCount} scatters`);
    if (result.totalFreeSpins) parts.push(`+${result.totalFreeSpins} FS`);
    el.status.textContent = `WIN! ${parts.join(' · ')}`;
  } else {
    if (!isFree) state.sessionWinMult = GAME_DEFAULTS.freeSpinStartMult;
    el.status.textContent = 'No win — spin again!';
  }

  if (state.freeSpinsLeft === 0 && isFree) {
    state.sessionWinMult = 1;
    audio.startBgm(false);
  }

  renderGrid(grid, winningCellKeys(result));
  state.spinning = false;
  save();
  updateHud();

  if (state.autoSpin && (state.autoRemaining > 0 || state.autoRemaining === -1)) {
    if (state.autoRemaining > 0) state.autoRemaining--;
    if (state.balance >= totalBet() || state.freeSpinsLeft > 0) {
      setTimeout(doSpin, 800);
    } else {
      state.autoSpin = false;
      el.status.textContent = 'Auto stopped — low balance';
      updateHud();
    }
  }
}

function paytableHtml() {
  return `
    <p><strong>4×5 · 40 paylines</strong> — Payouts × line bet × bet multiplier.</p>
    <h4>Win multiplier</h4>
    <ul>
      <li>3+ Scatter: starts free spins with ×2–×5 boost</li>
      <li>3+ Bonus symbols on grid: up to ×5 on that spin</li>
      <li>5× Bonus on a line: ×5 instant</li>
      <li>During free spins: multiplier rises +1 after each winning free spin (max ×10)</li>
    </ul>
    <h4>Free spins</h4>
    <ul>
      <li>3 Scatter — 8 FS · 4 — 12 FS · 5 — 20 FS</li>
      <li>FreeSpin symbol lines — 5 / 8 / 12 FS</li>
    </ul>
    <h4>Jackpots (progressive)</h4>
    <ul>
      <li>Each bet feeds Mini / Minor / Major / Mega</li>
      <li>Random hit any spin · screen-filling win</li>
      <li>15+ Wilds on screen forces MEGA</li>
    </ul>
    <h4>Sounds (kit WAV)</h4>
    <p>Background, spin, win, coins, big win, bonus, button, choose, buy, reel stop + Neon BG in free spins.</p>
  `;
}

function bindEvents() {
  el.spinBtn.onclick = () => {
    state.autoSpin = false;
    doSpin();
  };

  el.betDown.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.lineBet = Math.max(1, state.lineBet - 1);
    save();
    updateHud();
  };
  el.betUp.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.lineBet = Math.min(GAME_DEFAULTS.maxLineBet, state.lineBet + 1);
    save();
    updateHud();
  };
  el.linesDown.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.activeLines = Math.max(1, state.activeLines - 1);
    save();
    updateHud();
  };
  el.linesUp.onclick = async () => {
    await ensureAudio();
    audio.playChoose();
    state.activeLines = Math.min(PAYLINE_PATHS.length, state.activeLines + 1);
    save();
    updateHud();
  };

  el.maxBetBtn.onclick = async () => {
    await ensureAudio();
    audio.playBuy();
    state.lineBet = GAME_DEFAULTS.maxLineBet;
    state.activeLines = PAYLINE_PATHS.length;
    state.betMult = BET_MULTIPLIERS[BET_MULTIPLIERS.length - 1];
    save();
    updateHud();
  };

  el.autoBtn.onclick = () => {
    if (state.autoSpin) {
      state.autoSpin = false;
      updateHud();
      return;
    }
    const n = prompt('Auto spins (10, 25, 50, 0=unlimited):', '25');
    if (n === null) return;
    const v = parseInt(n, 10);
    state.autoRemaining = v === 0 ? -1 : Math.max(1, v || 25);
    state.autoSpin = true;
    updateHud();
    doSpin();
  };

  el.paytableBtn.onclick = () => {
    el.overlayTitle.textContent = 'Paytable & Features';
    el.overlayBody.innerHTML = paytableHtml();
    el.overlay.classList.add('open');
  };

  el.overlayClose.onclick = () => el.overlay.classList.remove('open');
  el.overlay.onclick = (e) => {
    if (e.target === el.overlay) el.overlay.classList.remove('open');
  };

  el.soundToggle.onchange = async () => {
    state.sound = el.soundToggle.checked;
    audio.setEnabled(state.sound);
    if (state.sound) await audio.unlock();
    save();
  };

  window.addEventListener('resize', () => {
    if (state.grid) drawWinLines();
  });
}

function init() {
  load();
  audio.setEnabled(state.sound);
  buildBetMultButtons();
  buildReels();
  renderJackpots();
  const grid = engine.spinGrid();
  renderGrid(grid);
  bindEvents();
  el.soundToggle.checked = state.sound;
  document.body.addEventListener('click', () => audio.unlock(), { once: true });
  updateHud();
  el.status.textContent = '4×5 Neon Vegas — Spin to win!';
}

init();
