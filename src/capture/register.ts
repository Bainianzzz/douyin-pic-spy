import { store } from '../env';
import type { DyItem } from '../types';
import { bestUrls } from './best-urls';

/** Store one captured post keyed by its `aweme_id`. */
export function register(item: DyItem): void {
  if (!item || !item.aweme_id) return;

  const images: string[] = [];
  if (Array.isArray(item.images)) {
    for (const im of item.images) {
      const urls = bestUrls(im);
      if (urls.length) images.push(urls[0]);
    }
  }
  if (!images.length) return;

  const id = String(item.aweme_id);
  store.byId[id] = {
    title: String(item.desc || '').trim(),
    author: item.author && item.author.nickname ? String(item.author.nickname) : '',
    images,
    ts: Date.now(),
  };
  store.last = id;
}
