import { getImages } from './core/current';
import { downloadPost, ensureRoot, hasDirectoryPicker } from './download';
import { setStatus } from './ui/toast';

let running = false;

/** Single-post download for the current page. */
export async function downloadAll(forcePick = false): Promise<void> {
  if (running) return;

  const bundle = getImages();
  if (!bundle) {
    setStatus('未截获到图片数据，请刷新页面后重新点开该作品', 'warn');
    return;
  }

  if (!hasDirectoryPicker()) {
    setStatus('当前浏览器不支持自选文件夹，请用 Chrome / Edge', 'warn');
    return;
  }

  running = true;
  setStatus('准备中…');
  try {
    const root = await ensureRoot(forcePick);
    if (!root) {
      setStatus('还没选目标文件夹，点「选择文件夹」授权一次', 'warn');
      return;
    }

    const result = await downloadPost(root, bundle.id, bundle.title, bundle.images);
    setStatus(`完成：成功 ${result.ok}${result.fail ? `，失败 ${result.fail}` : ''}\n→ ${root.name}/${result.dir}`);
  } catch (e) {
    const err = e as { name?: string; message?: string } | null;
    if (err?.name === 'AbortError') setStatus('已取消');
    else setStatus('出错：' + (err?.message ? err.message : String(e)), 'warn');
  } finally {
    running = false;
  }
}
