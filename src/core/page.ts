/** Which Douyin surface the script is currently running on. */

/** Own-profile tabs whose grid supports batch selection. */
const BATCH_TABS = new Set([
  'favorite_collection',
  'watch_later',
  'like',
  'recommend',
  'record',
]);

export function isCollectionPage(): boolean {
  if (!location.pathname.startsWith('/user/')) return false;
  const tab = new URLSearchParams(location.search).get('showTab');
  return tab !== null && BATCH_TABS.has(tab);
}

/** Run `fn` on every SPA navigation (pushState / replaceState / popstate). */
export function onNavigate(fn: () => void): () => void {
  const wrap = (type: 'pushState' | 'replaceState') => {
    const original = history[type];
    history[type] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args);
      try {
        fn();
      } catch {
        /* ignore */
      }
      return result;
    } as History[typeof type];
  };
  wrap('pushState');
  wrap('replaceState');
  window.addEventListener('popstate', fn);
  return () => window.removeEventListener('popstate', fn);
}

/** Extract `aweme_id` from a `/video/<id>` or `/note/<id>` link. */
export function idFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const match = href.match(/\/(?:video|note)\/(\d+)/);
  return match ? match[1] : null;
}
