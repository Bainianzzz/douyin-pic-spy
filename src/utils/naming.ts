import { sanitize } from './sanitize';

export type FolderMode = 'title_time' | 'title_id' | 'title' | 'id';

export const DEFAULT_FOLDER_MODE: FolderMode = 'title_time';

export function folderMode(): FolderMode {
  return GM_getValue<FolderMode>('folderMode', DEFAULT_FOLDER_MODE);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local timestamp, e.g. `20261009_161430`. */
export function stamp(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    '_' +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
}

export function folderName(id: string, title: string): string {
  switch (folderMode()) {
    case 'id':
      return sanitize(id);
    case 'title':
      return sanitize(title) || sanitize(id);
    case 'title_id':
      return sanitize((title ? title + '_' : '') + id).slice(0, 120);
    default:
      return sanitize((title ? title + '_' : '') + stamp()).slice(0, 120);
  }
}
