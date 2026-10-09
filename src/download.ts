import { getRootDir, hasDirectoryPicker } from './fs/directory';
import { clearDir, writeFile } from './fs/write';
import type { DirHandle } from './fs/types';
import { extFrom } from './net/ext';
import { gmBlob } from './net/gm-blob';
import { setDirLabel, setStatus } from './ui/toast';
import { folderName } from './utils/naming';

export { hasDirectoryPicker };

/** Resolve the target directory, prompting for one if nothing is remembered. */
export async function ensureRoot(forcePick: boolean): Promise<DirHandle | null> {
  let root = await getRootDir(forcePick);
  if (!root) root = await getRootDir(true);
  if (root) setDirLabel(root.name);
  return root;
}

export interface PostResult {
  ok: number;
  fail: number;
  dir: string;
}

/** Write one post's images into its own subfolder. Reused by single + batch. */
export async function downloadPost(
  root: DirHandle,
  id: string,
  title: string,
  images: string[],
): Promise<PostResult> {
  const dir = await root.getDirectoryHandle(folderName(id, title), { create: true });

  if (GM_getValue<boolean>('cleanBefore', true)) {
    await clearDir(dir);
  }

  const pad = String(images.length).length;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < images.length; i++) {
    try {
      const blob = await gmBlob(images[i]);
      const ext = extFrom(blob, images[i]);
      await writeFile(dir, String(i + 1).padStart(pad, '0') + '.' + ext, blob);
      ok++;
    } catch (e) {
      fail++;
      console.warn('[douyin-pic-spy] image failed:', images[i], e);
    }
  }

  return { ok, fail, dir: dir.name };
}
