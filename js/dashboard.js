import { onAuthStateChange, requireSession, signOut } from './auth.js';
import { getSupabase } from './supabase-client.js';

function clearAuthHashFromUrl() {
  if (!window.location.hash) return;
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  );
}

const el = {
  memberId: document.getElementById('memberId'),
  memberRef: document.getElementById('memberRef'),
  memberRank: document.getElementById('memberRank'),
  memberAvatar: document.getElementById('memberAvatar'),
  welcomeName: document.getElementById('welcomeName'),
  statWallet: document.getElementById('statWallet'),
  statCredits: document.getElementById('statCredits'),
  statNetwork: document.getElementById('statNetwork'),
  statCommission: document.getElementById('statCommission'),
  treeMe: document.getElementById('treeMe'),
  treeMeSub: document.getElementById('treeMeSub'),
  rankProgress: document.getElementById('rankProgress'),
  rankProgressBar: document.getElementById('rankProgressBar'),
  txList: document.getElementById('txList'),
  btnSignOut: document.getElementById('btnSignOut'),
  navProfile: document.getElementById('navProfile'),
  profileModal: document.getElementById('profileModal'),
  profileBody: document.getElementById('profileBody'),
  profileClose: document.getElementById('profileClose'),
  toast: document.getElementById('dashToast'),
};

let profile = null;
let toastTimer = null;

function fmt(n) {
  return Math.floor(Number(n) || 0).toLocaleString('en-US');
}

function initials(name, email) {
  const n = (name || email || 'M').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function memberCode(userId) {
  return `NS${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function shortId(userId) {
  return `#${userId.slice(0, 8).toUpperCase()}`;
}

function showToast(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
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

async function loadProfile(userId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected to Supabase');

  const { data, error } = await sb
    .from('profiles')
    .select(
      'email, display_name, balance, line_bet, active_lines, bet_mult, created_at, updated_at'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function renderActivity() {
  if (!profile) return;
  const rows = [
    {
      label: 'Account created',
      meta: formatDate(profile.created_at),
      amt: 'Member',
      cls: 'dash-tx-in',
    },
    {
      label: 'Game credits (Neon Vegas)',
      meta: `Line bet ${profile.line_bet} · ${profile.active_lines} lines · ×${profile.bet_mult}`,
      amt: `${fmt(profile.balance)} Cr`,
      cls: 'dash-tx-cr',
    },
    {
      label: 'Wallet & commissions',
      meta: 'Deposit, P2P, trinary bonus — coming soon',
      amt: '—',
      cls: '',
    },
  ];

  el.txList.innerHTML = rows
    .map(
      (r) => `
    <div class="dash-tx-row">
      <div>
        <div class="dash-tx-label">${r.label}</div>
        <div class="dash-tx-meta">${r.meta}</div>
      </div>
      <div class="${r.cls || ''}" style="font-weight:600;color:rgba(255,255,255,0.5)">${r.amt}</div>
    </div>`
    )
    .join('');
}

function fillDashboard(session) {
  const user = session.user;
  const name =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Member';
  const email = profile?.email || user.email || '';
  const code = memberCode(user.id);

  el.welcomeName.textContent = name;
  el.memberId.textContent = shortId(user.id);
  el.memberRef.textContent = code;
  el.memberAvatar.textContent = initials(name, email);
  el.memberAvatar.title = email;

  el.statWallet.innerHTML = `0<span class="dash-stat-unit">USDT</span>`;
  el.statCredits.innerHTML = `${fmt(profile?.balance ?? 0)}<span class="dash-stat-unit">Cr</span>`;
  el.statNetwork.innerHTML = `0<span class="dash-stat-unit">members</span>`;
  el.statCommission.innerHTML = `0<span class="dash-stat-unit">USDT</span>`;

  if (el.treeMe) {
    el.treeMe.innerHTML = `You<div class="dash-tb-sub">${name}</div>`;
  }
  if (el.treeMeSub) el.treeMeSub.textContent = 'Member';

  el.rankProgress.textContent = '0%';
  el.rankProgressBar.style.width = '0%';

  renderActivity();
}

function openProfileModal() {
  if (!profile) return;
  el.profileBody.innerHTML = `
    <p><strong>Display name:</strong> ${profile.display_name || '—'}</p>
    <p><strong>Email:</strong> ${profile.email || '—'}</p>
    <p><strong>Member ID:</strong> ${el.memberId?.textContent || '—'}</p>
    <p><strong>Referral code:</strong> ${el.memberRef?.textContent || '—'}</p>
    <p><strong>Game balance:</strong> ${fmt(profile.balance)} credits</p>
    <p><strong>Joined:</strong> ${formatDate(profile.created_at)}</p>
  `;
  el.profileModal.classList.add('open');
}

function bindUi() {
  document.querySelectorAll('[data-soon]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('This feature is coming soon.');
    });
  });

  el.btnSignOut?.addEventListener('click', async () => {
    await signOut();
    window.location.replace('index.html');
  });

  el.navProfile?.addEventListener('click', openProfileModal);
  el.profileClose?.addEventListener('click', () => {
    el.profileModal.classList.remove('open');
  });
  el.profileModal?.addEventListener('click', (e) => {
    if (e.target === el.profileModal) el.profileModal.classList.remove('open');
  });
}

async function boot() {
  const session = await requireSession();
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  clearAuthHashFromUrl();
  onAuthStateChange((s) => {
    if (!s) window.location.replace('index.html');
  });

  bindUi();

  try {
    profile = await loadProfile(session.user.id);
    fillDashboard(session);
  } catch (err) {
    console.warn(err);
    profile = {
      display_name: session.user.email?.split('@')[0],
      email: session.user.email,
      balance: 0,
      line_bet: 1,
      active_lines: 40,
      bet_mult: 1,
      created_at: session.user.created_at,
    };
    fillDashboard(session);
    showToast('Could not load full profile — showing basic info.');
  }
}

boot();
