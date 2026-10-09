import { getImages } from './core/current';
import { downloadPost, ensureRoot, hasDirectoryPicker } from './download';
import { L } from './i18n';
import { setStatus } from './ui/toast';

let running = false;

/** Single-post download for the current page. */
export async function downloadAll(forcePick = false): Promise<void> {
  if (running) return;

  const bundle = getImages();
  if (!bundle) {
    setStatus(L.status.notCaptured(), 'warn');
    return;
  }

  if (!hasDirectoryPicker()) {
    setStatus(L.status.noBrowser(), 'warn');
    return;
  }

  running = true;
  setStatus(L.status.preparing());
  try {
    const root = await ensureRoot(forcePick);
    if (!root) {
      setStatus(L.status.noFolder(), 'warn');
      return;
    }

    const result = await downloadPost(root, bundle.id, bundle.title, bundle.images);
    const folder = `${root.name}/${result.dir}`;
    setStatus(result.fail ? L.status.doneFail({ ok: result.ok, fail: result.fail, folder }) : L.status.doneOk({ ok: result.ok, folder }));
  } catch (e) {
    const err = e as { name?: string; message?: string } | null;
    if (err?.name === 'AbortError') setStatus(L.status.cancelled());
    else setStatus(L.status.error({ message: err?.message ? err.message : String(e) }), 'warn');
  } finally {
    running = false;
  }
}
