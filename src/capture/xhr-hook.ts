import { absorbAny } from './absorb';

const MAX_PAYLOAD = 8_000_000;

export function isDouyinJson(url: unknown): boolean {
  return typeof url === 'string' && url.indexOf('douyin.com') !== -1;
}

interface TaggedXhr extends XMLHttpRequest {
  __dyUrl?: string;
}

/** Runtime API traffic: hook XHR so `aweme/detail` responses are absorbed. */
export function installXhrHook(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (this: TaggedXhr, ...args: unknown[]) {
    try {
      this.__dyUrl = String(args[1]);
    } catch {
      /* ignore */
    }
    return (originalOpen as (...a: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.send = function (this: TaggedXhr, ...args: unknown[]) {
    try {
      this.addEventListener('load', function (this: XMLHttpRequest) {
        try {
          const self = this as TaggedXhr;
          if (!isDouyinJson(self.__dyUrl)) return;
          const contentType = self.getResponseHeader('content-type') || '';
          if (contentType.indexOf('json') === -1) return;
          const type = self.responseType;
          if (type && type !== 'text') return;
          const text = self.responseText;
          if (!text || text.length > MAX_PAYLOAD) return;
          absorbAny(JSON.parse(text));
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    return (originalSend as (...a: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.send;
}
