import type { Store } from './types';

interface MonkeyWindow extends Window {
  __dyImg?: Store;
}

const w = window as MonkeyWindow;

/** Captured posts, hung off `window` so every injected copy shares one store. */
export const store: Store = w.__dyImg || (w.__dyImg = { byId: {}, last: null });

/** Objects already walked by `absorbAny`, to avoid re-scanning the same graph. */
export const resolved = new WeakSet<object>();
