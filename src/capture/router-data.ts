import { absorbAny } from './absorb';

/**
 * First-paint SSR: opening `/note/<id>` directly inlines the post data in
 * `window._ROUTER_DATA`, set before our script's `document-start` runs. Trap
 * the assignment so the value is captured the moment Douyin writes it.
 */
export function installRouterDataHook(): void {
  try {
    let value: unknown;
    Object.defineProperty(window, '_ROUTER_DATA', {
      configurable: true,
      get() {
        return value;
      },
      set(next: unknown) {
        value = next;
        try {
          absorbAny(next);
        } catch {
          /* ignore */
        }
      },
    });
  } catch {
    /* property already locked: ignore */
  }
}

/** Pick up data already present in the DOM (SSR script tag or the trapped global). */
export function absorbScripts(): void {
  try {
    const renderData = document.getElementById('RENDER_DATA');
    if (renderData && renderData.textContent) {
      try {
        absorbAny(JSON.parse(decodeURIComponent(renderData.textContent)));
      } catch {
        /* ignore */
      }
    }
    const router = (window as unknown as { _ROUTER_DATA?: unknown })._ROUTER_DATA;
    if (router) absorbAny(router);
  } catch {
    /* ignore */
  }
}
