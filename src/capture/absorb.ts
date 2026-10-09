import { resolved } from '../env';
import type { DyItem } from '../types';
import { register } from './register';

const MAX_DEPTH = 14;

/**
 * Walk any Douyin JSON shape and register every node that carries
 * `aweme_id` + `images`. Covers `aweme_detail`, list responses, and
 * prefetched feed payloads without knowing the exact envelope.
 */
export function absorbAny(node: unknown, depth = 0): void {
  try {
    if (!node || depth > MAX_DEPTH) return;

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) absorbAny(node[i], depth + 1);
      return;
    }
    if (typeof node !== 'object') return;

    const obj = node as Record<string, unknown>;
    if (resolved.has(obj)) return;
    resolved.add(obj);

    const item = obj as unknown as DyItem;
    if (item.aweme_id && Array.isArray(item.images) && item.images.length) {
      register(item);
    }

    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') absorbAny(value, depth + 1);
    }
  } catch {
    /* malformed payload: ignore */
  }
}
