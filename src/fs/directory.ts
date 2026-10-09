import { idbGet, idbSet } from './idb';
import type { DirHandle } from './types';

interface PickerWindow extends Window {
  showDirectoryPicker(opts?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<DirHandle>;
}

const ROOT_KEY = 'root';

function picker(): PickerWindow | null {
  const w = window as unknown as Partial<PickerWindow>;
  return typeof w.showDirectoryPicker === 'function' ? (w as PickerWindow) : null;
}

/** Chromium-only: `showDirectoryPicker` powers the "choose a folder" feature. */
export function hasDirectoryPicker(): boolean {
  return picker() !== null;
}

/**
 * Return the remembered target directory, re-requesting permission if needed.
 * With `forcePick`, prompt for a new folder and persist the handle.
 */
export async function getRootDir(forcePick: boolean): Promise<DirHandle | null> {
  const api = picker();
  if (!api) return null;

  if (forcePick) {
    const handle = await api.showDirectoryPicker({ id: 'dy-img-dir', mode: 'readwrite' });
    await idbSet(ROOT_KEY, handle);
    return handle;
  }

  const handle = await idbGet<DirHandle>(ROOT_KEY);
  if (!handle) return null;

  try {
    let permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted' ? handle : null;
  } catch {
    return null;
  }
}
