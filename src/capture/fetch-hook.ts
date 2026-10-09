import { absorbAny } from './absorb';
import { isDouyinJson } from './xhr-hook';

const MAX_PAYLOAD = 8_000_000;

/** Runtime API traffic over fetch (the site mixes fetch and XHR). */
export function installFetchHook(): void {
  if (!window.fetch) return;

  const originalFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: unknown[]) {
    const promise = (originalFetch as (...a: unknown[]) => Promise<Response>).apply(this, args);
    try {
      const first = args[0];
      const url = typeof first === 'string' ? first : (first as Request | undefined)?.url || '';
      if (isDouyinJson(url)) {
        promise
          .then((response) => {
            try {
              const contentType = response.headers.get('content-type') || '';
              if (contentType.indexOf('json') === -1) return;
              response
                .clone()
                .text()
                .then((text) => {
                  if (text && text.length < MAX_PAYLOAD) {
                    try {
                      absorbAny(JSON.parse(text));
                    } catch {
                      /* ignore */
                    }
                  }
                })
                .catch(() => {});
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return promise;
  } as typeof window.fetch;
}
