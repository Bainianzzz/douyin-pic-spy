/**
 * Tampermonkey GM_* API declarations.
 *
 * These globals are injected by the userscript engine; the script declares the
 * narrow subset it actually uses instead of pulling a full types package.
 */

interface GMXmlhttpResponse {
  status: number;
  response: unknown;
  responseText: string;
  responseHeaders: string;
  finalUrl: string;
}

interface GMXmlhttpRequestDetails {
  method?: string;
  url: string;
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer' | 'document' | 'stream';
  timeout?: number;
  headers?: Record<string, string>;
  data?: string;
  onload?: (response: GMXmlhttpResponse) => void;
  onerror?: (response: GMXmlhttpResponse) => void;
  ontimeout?: (response: GMXmlhttpResponse) => void;
}

declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_addStyle(css: string): HTMLStyleElement;
declare function GM_xmlhttpRequest(details: GMXmlhttpRequestDetails): void;
