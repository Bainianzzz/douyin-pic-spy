import type { DirHandle } from './types';

/** Remove existing files so a re-download does not leave stale images behind. */
export async function clearDir(dir: DirHandle): Promise<void> {
  try {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file') {
        try {
          await dir.removeEntry(entry.name);
        } catch {
          /* skip undeletable entry */
        }
      }
    }
  } catch {
    /* directory not iterable: ignore */
  }
}

export async function writeFile(dir: DirHandle, name: string, blob: Blob): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}
