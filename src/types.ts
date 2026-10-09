/** Shape of the raw Douyin payloads we scan. */

export interface DyImage {
  url_list?: string[];
  download_url_list?: string[];
}

export interface DyItem {
  aweme_id?: string | number;
  desc?: string;
  author?: { nickname?: string };
  images?: DyImage[];
}

/** A captured image post, stored per `aweme_id`. */
export interface Captured {
  title: string;
  author: string;
  images: string[];
  ts: number;
}

export interface Store {
  byId: Record<string, Captured>;
  last: string | null;
}

/** A post resolved from captured data, ready to download. */
export interface ImageBundle {
  id: string;
  title: string;
  author: string;
  images: string[];
}
