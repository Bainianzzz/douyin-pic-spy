import type { DyImage } from '../types';

/** Prefer the original (`download_url_list`) URL over the display `url_list`. */
export function bestUrls(im: DyImage | null | undefined): string[] {
  const dl = im && im.download_url_list;
  const ul = im && im.url_list;
  const out: string[] = [];
  if (Array.isArray(dl)) out.push(...dl);
  if (Array.isArray(ul)) out.push(...ul);
  return out.filter(Boolean);
}
