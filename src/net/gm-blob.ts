/** Fetch a URL as a Blob, bypassing cross-origin limits via GM_xmlhttpRequest. */
export function gmBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'blob',
      timeout: 60_000,
      onload: (response) => {
        if (response.status >= 200 && response.status < 300 && response.response) {
          resolve(response.response as Blob);
        } else {
          reject(new Error('HTTP ' + response.status));
        }
      },
      onerror: () => reject(new Error('network error')),
      ontimeout: () => reject(new Error('timeout')),
    });
  });
}
