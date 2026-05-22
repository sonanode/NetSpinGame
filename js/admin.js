import { onAuthStateChange, requireSession, signOutAndClear } from './auth.js';
import {
  adminAdjustCredits,
  adminAdjustWallet,
  adminListLedger,
  adminListMembers,
  adminListPending,
  adminOverview,
  adminResolveLedger,
  adminSetAdminFlag,
  adminSetRank,
  checkIsAdmin,
} from './admin-api.js';

const DEFAULT_PANEL = 'overview';
const VALID_PANELS = new Set(['overview', 'members', 'pending', 'ledger', 'staff']);
const PANEL_TITLES = {
  overview: 'Overview',
  members: 'Members',
  pending: 'Pending',
  ledger: 'Ledger',
  staff: 'Staff access',
};

const el = {
  panelTitle: document.getElementById('adminPanelTitle'),
  email: document.getElementById('adminEmail'),
  pendingBadge: document.getElementById('pendingBadge'),
  statMembers: document.getElementById('statMembers'),
  statPending: document.getElementById('statPending'),
  statWalletTotal: document.getElementById('statWalletTotal'),
  statCreditsTotal: document.getElementById('statCreditsTotal'),
  membersTable: document.getElementById('membersTable'),
  pendingTable: document.getElementById('pendingTable'),
  ledgerTable: document.getElementById('ledgerTable'),
  toast: document.getElementById('adminToast'),
  btnSignOut: document.getElementById('btnAdminSignOut'),
};

let session = null;
let toastTimer = null;

function fmt(n) {
  return Math.floor(Number(n) || 0).toLocaleString('en-US');
}

function fmtUsdt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function showToast(msg, isError = false) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.toggle('dash-toast-err', isError);
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3200);
}

function panelFromHash() {
  const id = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  return VALID_PANELS.has(id) ? id : DEFAULT_PANEL;
}

function syncHash(panel, replace = false) {
  const path = `${window.location.pathname}${window.location.search}#${panel}`;
  if (replace) history.replaceState({ panel }, '', path);
  else history.pushState({ panel }, '', path);
}

function showPanel(id, { updateHash = true, replaceHash = false } = {}) {
  const panel = VALID_PANELS.has(id) ? id : DEFAULT_PANEL;
  document.querySelectorAll('.dash-panel').forEach((p) => {
    const on = p.dataset.panel === panel;
    p.classList.toggle('on', on);
    p.hidden = !on;
  });
  document.querySelectorAll('.dash-ni[data-panel]').forEach((n) => {
    n.classList.toggle('on', n.dataset.panel === panel);
  });
  if (el.panelTitle) el.panelTitle.textContent = PANEL_TITLES[panel] || panel;
  document.title = `XZENZY Admin — ${PANEL_TITLES[panel]}`;
  if (updateHash) syncHash(panel, replaceHash);

  if (panel === 'members') loadMembers();
  if (panel === 'pending') loadPending();
  if (panel === 'ledger') loadLedger();
}

async function refreshOverview() {
  const o = await adminOverview();
  if (el.statMembers) el.statMembers.textContent = fmt(o.members);
  const pending = Number(o.pending) || 0;
  if (el.statPending) el.statPending.textContent = fmt(pending);
  if (el.statWalletTotal) el.statWalletTotal.textContent = fmtUsdt(o.total_wallet_usdt);
  if (el.statCreditsTotal) el.statCreditsTotal.textContent = fmt(o.total_credits);
  if (el.pendingBadge) {
    el.pendingBadge.hidden = pending === 0;
    el.pendingBadge.textContent = String(pending);
  }
}

async function loadMembers(q = '') {
  try {
    const rows = await adminListMembers(q);
    if (!rows.length) {
      el.membersTable.innerHTML = '<p class="dash-empty">No members found.</p>';
      return;
    }
    el.membersTable.innerHTML = `
      <table class="dash-table">
        <thead><tr>
          <th>Code</th><th>Name</th><th>Email</th><th>USDT</th><th>Credits</th><th>Rank</th><th>Admin</th>
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (m) => `
            <tr>
              <td><strong>${m.member_code}</strong></td>
              <td>${m.display_name}</td>
              <td>${m.email || '—'}</td>
              <td>${fmtUsdt(m.wallet_usdt)}</td>
              <td>${fmt(m.balance)}</td>
              <td>${m.rank}</td>
              <td>${m.is_admin ? 'yes' : '—'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.membersTable.innerHTML = `<p class="dash-empty">${err.message}</p>`;
  }
}

async function loadPending() {
  try {
    const rows = await adminListPending();
    if (!rows.length) {
      el.pendingTable.innerHTML = '<p class="dash-empty">No pending items.</p>';
      return;
    }
    el.pendingTable.innerHTML = `
      <table class="dash-table">
        <thead><tr>
          <th>Member</th><th>Type</th><th>Amount</th><th>Note</th><th>When</th><th></th>
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${r.member_code}<br><span class="dash-tx-meta">${r.member_email || ''}</span></td>
              <td>${r.type}</td>
              <td>${fmtUsdt(r.amount)} ${r.currency}</td>
              <td>${r.note || r.counterparty || '—'}</td>
              <td>${fmtDate(r.created_at)}</td>
              <td class="admin-actions">
                <button type="button" class="admin-btn-sm admin-btn-ok" data-approve="${r.ledger_id}">Approve</button>
                <button type="button" class="admin-btn-sm admin-btn-no" data-reject="${r.ledger_id}">Reject</button>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
    el.pendingTable.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', () => resolve(btn.dataset.approve, true));
    });
    el.pendingTable.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', () => resolve(btn.dataset.reject, false));
    });
  } catch (err) {
    el.pendingTable.innerHTML = `<p class="dash-empty">${err.message}</p>`;
  }
}

async function resolve(id, approve) {
  try {
    await adminResolveLedger(id, approve);
    showToast(approve ? 'Approved.' : 'Rejected.');
    await refreshOverview();
    await loadPending();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadLedger() {
  try {
    const rows = await adminListLedger(50);
    if (!rows.length) {
      el.ledgerTable.innerHTML = '<p class="dash-empty">No ledger rows.</p>';
      return;
    }
    el.ledgerTable.innerHTML = `
      <table class="dash-table">
        <thead><tr><th>Code</th><th>Type</th><th>Amount</th><th>Status</th><th>Note</th><th>When</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${r.member_code}</td>
              <td>${r.type}</td>
              <td>${r.currency === 'USDT' ? fmtUsdt(r.amount) : fmt(r.amount)} ${r.currency}</td>
              <td>${r.status}</td>
              <td>${r.note || '—'}</td>
              <td>${fmtDate(r.created_at)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    el.ledgerTable.innerHTML = `<p class="dash-empty">${err.message}</p>`;
  }
}

function bindForms() {
  document.getElementById('formMemberSearch')?.addEventListener('submit', (e) => {
    e.preventDefault();
    loadMembers(document.getElementById('memberSearch')?.value || '');
  });

  document.getElementById('formAdjust')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('adjCode').value;
    const amount = Number(document.getElementById('adjAmount').value);
    const note = document.getElementById('adjNote').value;
    const type = document.getElementById('adjType').value;
    try {
      if (type === 'wallet') await adminAdjustWallet(code, amount, note);
      else await adminAdjustCredits(code, amount, note);
      showToast('Adjustment applied.');
      e.target.reset();
      await refreshOverview();
      if (panelFromHash() === 'members') await loadMembers();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formStaff')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await adminSetAdminFlag(
        document.getElementById('staffCode').value,
        document.getElementById('staffGrant').checked
      );
      showToast('Staff flag updated.');
      e.target.reset();
      document.getElementById('staffGrant').checked = true;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('formRank')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await adminSetRank(
        document.getElementById('rankCode').value,
        document.getElementById('rankVal').value
      );
      showToast('Rank saved.');
      e.target.reset();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function bindNav() {
  document.querySelectorAll('.dash-ni[data-panel]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel(link.dataset.panel);
    });
  });
  window.addEventListener('popstate', () => showPanel(panelFromHash(), { updateHash: false }));
  el.btnSignOut?.addEventListener('click', async () => {
    await signOutAndClear();
    window.location.replace('admin-login.html?signed_out=1');
  });
}

const ADMIN_LOGIN = 'admin-login.html';

function hasAuthTokensInUrl() {
  const h = window.location.hash || '';
  const s = window.location.search || '';
  return h.includes('access_token') || h.includes('code=') || s.includes('code=');
}

async function waitForSession(maxMs = 5000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const s = await requireSession();
    if (s) return s;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

async function boot() {
  session = hasAuthTokensInUrl() ? await waitForSession() : await requireSession();
  if (!session) {
    window.location.replace(ADMIN_LOGIN);
    return;
  }
  el.email.textContent = session.user.email || 'Admin';

  onAuthStateChange((s) => {
    if (!s) window.location.replace(`${ADMIN_LOGIN}?signed_out=1`);
  });

  try {
    const ok = await checkIsAdmin();
    if (!ok) {
      showToast('Not an administrator. Use admin-login with a staff account.', true);
      await signOutAndClear();
      setTimeout(() => window.location.replace(`${ADMIN_LOGIN}?signed_out=1`), 1600);
      return;
    }
  } catch (err) {
    showToast(err.message || 'Run schema-admin.sql in Supabase', true);
    setTimeout(() => window.location.replace(ADMIN_LOGIN), 2200);
    return;
  }

  bindNav();
  bindForms();
  try {
    await refreshOverview();
  } catch (err) {
    showToast(err.message, true);
  }
  showPanel(panelFromHash(), { replaceHash: true });
}

boot();
