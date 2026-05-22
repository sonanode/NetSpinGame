/**
 * OAuth / magic-link returns may land on index, game, or admin-login.
 * Forward tokens to the correct app entry (member dashboard or admin console).
 */
(function () {
  const path = window.location.pathname;
  if (/\/dashboard\.html$/i.test(path) || /\/admin\.html$/i.test(path)) return;

  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const isAuthReturn =
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    hash.includes('type=recovery') ||
    hash.includes('error=') ||
    search.includes('code=');

  if (!isAuthReturn) return;

  const destFile = /admin-login\.html$/i.test(path) ? 'admin.html' : 'dashboard.html';
  const dest = new URL(destFile, window.location.href);
  dest.hash = hash;
  dest.search = search;
  window.location.replace(dest.href);
})();
