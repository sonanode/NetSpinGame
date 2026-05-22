/**
 * OAuth / magic-link returns may land on index or game (old Supabase URLs).
 * Forward tokens to dashboard.html so post-login always goes there.
 */
(function () {
  if (/\/dashboard\.html$/i.test(window.location.pathname)) return;

  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const isAuthReturn =
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    hash.includes('type=recovery') ||
    hash.includes('error=') ||
    search.includes('code=');

  if (!isAuthReturn) return;

  const dest = new URL('dashboard.html', window.location.href);
  dest.hash = hash;
  dest.search = search;
  window.location.replace(dest.href);
})();
