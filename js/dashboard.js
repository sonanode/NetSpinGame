import { onAuthStateChange, requireSession, signOut } from './auth.js';
import {
  CREDITS_PER_USDT,
  buyCredits,
  commissionMtd,
  countReferrals,
  depositUsdt,
  loadCommissions,
  loadLeaderboard,
  loadLedger,
  loadMemberProfile,
  loadNetwork,
  setReferrer,
  transferCredits,
  transferUsdt,
  updateDisplayName,
  updateSoundPref,
  withdrawUsdt,
} from './member-api.js';

const REF_KEY = 'xzenzy_ref';

const PANEL_TITLES = {
  dashboard: 'Dashboard',
  network: 'My Network',
  invite: 'Invite Member',
  deposit: 'Deposit (Crypto)',
  'transfer-bal': 'Transfer Balance',
  'transfer-cr': 'Transfer Credits',
  withdraw: 'Withdraw',
  buy: 'Buy Credits',
  leaderboard: 'Leaderboard',
  commission: 'Commission',
  profile: 'Profile',
  kyc: 'KYC / Security',
  settings: 'Settings',
};

const el = {
  panelTitle: document.getElementById('panelTitle'),
  memberId: document.getElementById('memberId'),
  memberRef: document.getElementById('memberRef'),
  memberRank: document.getElementById('memberRank'),
  memberAvatar: document.getElementById('memberAvatar'),
  welcomeName: document.getElementById('welcomeName'),
  statWallet: document.getElementById('statWallet'),
  statCredits: document.getElementById('statCredits'),
  statNetwork: document.getElementById('statNetwork'),
  statCommission: document.getElementById('statCommission'),
  txListHome: document.getElementById('txListHome'),
  commissionList: document.getElementById('commissionList'),
  commMtdPanel: document.getElementById('commMtdPanel'),
  networkTable: document.getElementById('networkTable'),
  networkTree: document.getElementById('networkTree'),
  leaderboardTable: document.getElementById('leaderboardTable'),
  inviteCode: document.getElementById('inviteCode'),
  inviteLink: document.getElementById('inviteLink'),
  profileDetail: document.getElementById('profileDetail'),
  kycDetail: document.getElementById('kycDetail'),
  setDisplayName: document.getElementById('setDisplayName'),
  setSound: document.getElementById('setSound'),
  buyPreview: document.getElementById('buyPreview'),
  buyUsdt: document.getElementById('buyUsdt'),
  btnSignOut: document.getElementById('btnSignOut'),
  toast: document.getElementById('dashToast'),
};

let session = null;
let profile = null;
let ledger = [];
let commissions = [];
let toastTimer = null;

function fmt(n) {
  return Math.floor(Number(n) || 0).toLocaleString('en-US');
}

function fmtUsdt(n) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function initials(name, email) {
  const n = (name || email || 'M').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function memberCode(userId) {
  return `XZ${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function shortId(userId) {
  return `#${userId.slice(0, 8).toUpperCase()}`;
}

function showToast(msg, isError = false) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.toggle('dash-toast-err', isError);
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3200);
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ledgerLabel(row) {
  const map = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    buy_credits: row.currency === 'CR' ? 'Buy credits' : 'Buy credits (USDT)',
    transfer_in: row.currency === 'CR' ? 'Credits received' : 'USDT received',
    transfer_out: row.currency === 'CR' ? 'Credits sent' : 'USDT sent',
    commission: 'Direct bonus',
  };
  return map[row.type] || row.type;
}

function renderLedgerRows(rows, target) {
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<p class="dash-empty">No activity yet.</p>';
    return;
  }
  target.innerHTML = rows
    .map((r) => {
      const sign =
        r.type === 'transfer_out' || r.type === 'withdraw' || (r.type === 'buy_credits' && r.currency === 'USDT')
          ? '−'
          : '+';
      const unit = r.currency === 'USDT' ? 'USDT' : 'Cr';
      const amt =
        r.currency === 'USDT'
          ? `${sign}${fmtUsdt(r.amount)} ${unit}`
          : `${sign}${fmt(r.amount)} ${unit}`;
      const cls =
        sign === '+' ? 'dash-tx-in' : r.status === 'pending' ? 'dash-tx-pending' : 'dash-tx-out';
      const meta = [formatDate(r.created_at), r.status !== 'completed' ? r.status : null, r.counterparty ? `From/to ${r.counterparty}` : null, r.note]
        .filter(Boolean)
        .join(' · ');
      return `
      <div class="dash-tx-row">
        <div>
          <div class="dash-tx-label">${ledgerLabel(r)}</div>
          <div class="dash-tx-meta">${meta}</div>
        </div>
        <div class="${cls}">${amt}</div>
      </div>`;
    })
    .join('');
}

function fillHeader() {
  const user = session.user;
  const name =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Member';
  const email = profile?.email || user.email || '';
  const code = memberCode(user.id);
  const wallet = Number(profile?.wallet_usdt ?? 0);
  const mtd = commissionMtd(commissions);

  el.welcomeName.textContent = name;
  el.memberId.textContent = shortId(user.id);
  el.memberRef.textContent = code;
  el.memberAvatar.textContent = initials(name, email);
  el.memberAvatar.title = email;
  el.memberRank.textContent = (profile?.rank || 'MEMBER').toUpperCase();

  el.statWallet.innerHTML = `${fmtUsdt(wallet)}<span class="dash-stat-unit">USDT</span>`;
  el.statCredits.innerHTML = `${fmt(profile?.balance ?? 0)}<span class="dash-stat-unit">Cr</span>`;

  if (el.inviteCode) el.inviteCode.value = code;
  if (el.inviteLink) {
    const base = window.location.origin + window.location.pathname.replace(/dashboard\.html.*$/, '');
    el.inviteLink.value = `${base}index.html?ref=${code}`;
  }
  if (el.setDisplayName) el.setDisplayName.value = profile?.display_name || '';
  if (el.setSound) el.setSound.checked = profile?.sound !== false;
}

async function refreshStats() {
  const userId = session.user.id;
  try {
    profile = await loadMemberProfile(userId);
    ledger = await loadLedger();
    commissions = await loadCommissions();
    const netCount = await countReferrals(userId);
    el.statNetwork.innerHTML = `${netCount}<span class="dash-stat-unit">members</span>`;
    const mtd = commissionMtd(commissions);
    el.statCommission.innerHTML = `${fmtUsdt(mtd)}<span class="dash-stat-unit">USDT</span>`;
    if (el.commMtdPanel) {
      el.commMtdPanel.innerHTML = `${fmtUsdt(mtd)} <span class="dash-stat-unit">USDT MTD</span>`;
    }
    fillHeader();
    renderLedgerRows(ledger.slice(0, 8), el.txListHome);
    renderLedgerRows(commissions, el.commissionList);
  } catch (err) {
    console.warn(err);
    showToast(err.message || 'Could not refresh data', true);
  }
}

function showPanel(id) {
  document.querySelectorAll('.dash-panel').forEach((p) => {
    const on = p.dataset.panel === id;
    p.classList.toggle('on', on);
    p.hidden = !on;
  });
  document.querySelectorAll('.dash-ni[data-panel]').forEach((n) => {
    n.classList.toggle('on', n.dataset.panel === id);
  });
  if (el.panelTitle) el.panelTitle.textContent = PANEL_TITLES[id] || id;

  if (id === 'network') renderNetwork();
  if (id === 'leaderboard') renderLeaderboard();
  if (id === 'profile') renderProfile();
  if (id === 'kyc') renderKyc();
}

async function renderNetwork() {
  try {
    const rows = await loadNetwork();
    const name =
      profile?.display_name || session.user.email?.split('@')[0] || 'You';
    if (el.networkTree) {
      const legs = ['Leg A', 'Leg B', 'Leg C'];
      el.networkTree.innerHTML = `
        <div class="dash-tb dash-tb-me">${name}</div>
        <div class="dash-lv"></div>
        <div class="dash-legs-row">
          ${legs
            .map((leg, i) => {
              const m = rows[i];
              if (m) {
                return `<div class="dash-leg-col"><div class="dash-lv"></div><div class="dash-tb dash-tb-fill">${m.display_name}<div class="dash-tb-sub">${m.member_code}</div></div></div>`;
              }
              return `<div class="dash-leg-col"><div class="dash-lv"></div><div class="dash-tb dash-tb-c">${leg}<div class="dash-tb-sub">Open</div></div></div>`;
            })
            .join('')}
        </div>`;
    }
    if (!rows.length) {
      el.networkTable.innerHTML = '<p class="dash-empty">No referrals yet — share your invite link.</p>';
      return;
    }
    el.networkTable.innerHTML = `
      <table class="dash-table">
        <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Joined</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr>
              <td>${r.member_code}</td>
              <td>${r.display_name}</td>
              <td>${fmt(r.balance)} Cr</td>
              <td>${formatDate(r.created_at)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.networkTable.innerHTML = `<p class="dash-empty">${err.message}. Run supabase/schema-member.sql in SQL Editor.</p>`;
  }
}

async function renderLeaderboard() {
  try {
    const rows = await loadLeaderboard();
    if (!rows.length) {
      el.leaderboardTable.innerHTML = '<p class="dash-empty">No rankings yet.</p>';
      return;
    }
    const myName = profile?.display_name || '';
    el.leaderboardTable.innerHTML = `
      <table class="dash-table">
        <thead><tr><th>#</th><th>Player</th><th>Credits</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr class="${r.display_name === myName ? 'dash-table-me' : ''}">
              <td>${r.rank_pos}</td>
              <td>${r.display_name}</td>
              <td>${fmt(r.balance)} Cr</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.leaderboardTable.innerHTML = `<p class="dash-empty">${err.message}</p>`;
  }
}

function renderProfile() {
  if (!profile) return;
  el.profileDetail.innerHTML = `
    <p><span class="dash-dt">Display name</span><span class="dash-dd">${profile.display_name || '—'}</span></p>
    <p><span class="dash-dt">Email</span><span class="dash-dd">${profile.email || '—'}</span></p>
    <p><span class="dash-dt">Member ID</span><span class="dash-dd">${el.memberId?.textContent || '—'}</span></p>
    <p><span class="dash-dt">Referral code</span><span class="dash-dd">${el.memberRef?.textContent || '—'}</span></p>
    <p><span class="dash-dt">USDT wallet</span><span class="dash-dd">${fmtUsdt(profile.wallet_usdt)} USDT</span></p>
    <p><span class="dash-dt">Game credits</span><span class="dash-dd">${fmt(profile.balance)} Cr</span></p>
    <p><span class="dash-dt">Bet settings</span><span class="dash-dd">Line ${profile.line_bet} · ${profile.active_lines} lines · ×${profile.bet_mult}</span></p>
    <p><span class="dash-dt">Joined</span><span class="dash-dd">${formatDate(profile.created_at)}</span></p>
  `;
}

function renderKyc() {
  const user = session.user;
  const verified = user.email_confirmed_at ? 'Verified' : 'Pending confirmation';
  el.kycDetail.innerHTML = `
    <p><span class="dash-dt">Email</span><span class="dash-dd">${user.email || '—'}</span></p>
    <p><span class="dash-dt">Email status</span><span class="dash-dd">${verified}</span></p>
    <p><span class="dash-dt">Account ID</span><span class="dash-dd">${user.id}</span></p>
    <p class="dash-hint" style="margin-top:12px">To change your password, use <strong>Forgot password</strong> on the sign-in page. Full KYC document upload will be added in a later update.</p>
    <a href="index.html" class="dash-btn-a dash-btn-sec" style="margin-top:12px;display:inline-flex">Go to sign in</a>
  `;
}

async function applyPendingReferrer() {
  const code = localStorage.getItem(REF_KEY);
  if (!code || profile?.referrer_id) return;
  try {
    const ok = await setReferrer(code);
    if (ok) {
      localStorage.removeItem(REF_KEY);
      showToast('Referrer linked successfully.');
    }
  } catch (_) {
    /* invalid code — ignore */
  }
}

function bindForms() {
  document.getElementById('formDeposit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('depAmount').value);
    const ref = document.getElementById('depRef').value;
    try {
      await depositUsdt(amount, ref);
      showToast(amount <= 500 ? 'Deposit credited to wallet.' : 'Deposit submitted (pending review).');
      e.target.reset();
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formWithdraw')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await withdrawUsdt(
        Number(document.getElementById('wdAmount').value),
        document.getElementById('wdAddress').value
      );
      showToast('Withdrawal requested.');
      e.target.reset();
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formBuy')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usdt = Number(document.getElementById('buyUsdt').value);
    try {
      const cr = await buyCredits(usdt);
      showToast(`Purchased ${fmt(cr)} credits.`);
      e.target.reset();
      if (el.buyPreview) el.buyPreview.textContent = '0';
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formTransferUsdt')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await transferUsdt(
        document.getElementById('tuCode').value,
        Number(document.getElementById('tuAmount').value)
      );
      showToast('USDT sent.');
      e.target.reset();
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formTransferCr')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await transferCredits(
        document.getElementById('tcCode').value,
        Number(document.getElementById('tcAmount').value)
      );
      showToast('Credits sent.');
      e.target.reset();
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formSettings')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await updateDisplayName(el.setDisplayName.value);
      await updateSoundPref(el.setSound.checked);
      showToast('Settings saved.');
      await refreshStats();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  el.buyUsdt?.addEventListener('input', () => {
    const u = Number(el.buyUsdt.value) || 0;
    if (el.buyPreview) el.buyPreview.textContent = fmt(Math.floor(u * CREDITS_PER_USDT));
  });

  document.getElementById('btnCopyCode')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el.inviteCode?.value || '');
    showToast('Code copied.');
  });
  document.getElementById('btnCopyLink')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(el.inviteLink?.value || '');
    showToast('Link copied.');
  });
}

function bindNav() {
  document.querySelectorAll('.dash-ni[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel));
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.goto));
  });
  el.btnSignOut?.addEventListener('click', async () => {
    await signOut();
    window.location.replace('index.html');
  });
}

function captureReferralOnLanding() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
}

async function boot() {
  captureReferralOnLanding();
  session = await requireSession();
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  onAuthStateChange((s) => {
    if (!s) window.location.replace('index.html');
  });

  bindNav();
  bindForms();

  try {
    profile = await loadMemberProfile(session.user.id);
    await applyPendingReferrer();
    await refreshStats();
  } catch (err) {
    console.warn(err);
    profile = {
      display_name: session.user.email?.split('@')[0],
      email: session.user.email,
      balance: 0,
      wallet_usdt: 0,
      line_bet: 1,
      active_lines: 40,
      bet_mult: 1,
      sound: true,
      created_at: session.user.created_at,
    };
    fillHeader();
    showToast('Run schema-member.sql in Supabase for full wallet features.', true);
  }
}

boot();
