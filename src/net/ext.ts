/** Pick a file extension from the blob MIME type, falling back to the URL path. */
export function extFrom(blob: Blob, url: string): string {
  const type = blob.type || '';
  if (type.indexOf('png') !== -1) return 'png';
  if (type.indexOf('webp') !== -1) return 'webp';
  if (type.indexOf('gif') !== -1) return 'gif';
  if (type.indexOf('avif') !== -1) return 'avif';
  if (type.indexOf('jpeg') !== -1 || type.indexOf('jpg') !== -1) return 'jpg';
  const fromUrl = (url.split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1];
  return (fromUrl || 'jpg').toLowerCase();
}
