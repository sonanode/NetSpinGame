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

  /* admin-login.html: stay here so admin-login.js checks is_admin before admin.html */
  if (/admin-login\.html$/i.test(path)) return;

  const dest = new URL('dashboard.html', window.location.href);
  dest.hash = hash;
  dest.search = search;
  window.location.replace(dest.href);
})();
