import { store } from '../env';
import type { ImageBundle } from '../types';

export function currentAwemeId(): string | null {
  const match = location.pathname.match(/\/(?:video|note)\/(\d+)/);
  if (match) return match[1];
  const modal = new URLSearchParams(location.search).get('modal_id');
  return modal || null;
}

/**
 * Resolve the current post from captured data only.
 *
 * There is deliberately no fallback: if nothing was intercepted for the
 * current id, the result is `null` and the caller reports it rather than
 * guessing from the page.
 */
export function getImages(): ImageBundle | null {
  const id = currentAwemeId();
  if (!id) return null;

  const captured = store.byId[id];
  if (!captured || !captured.images.length) return null;

  return {
    id,
    title: captured.title,
    author: captured.author,
    images: captured.images.slice(),
  };
}
