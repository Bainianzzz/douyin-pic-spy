import { store } from '../env';
import { downloadPost, ensureRoot, hasDirectoryPicker } from '../download';
import { setStatus } from '../ui/toast';

export interface BatchItem {
  id: string;
  title: string;
}

const DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download the selected posts serially, one subfolder each.
 *
 * Posts whose data was never intercepted are counted as `missed` and listed in
 * the final report; nothing is guessed.
 */
export async function runBatch(items: BatchItem[]): Promise<void> {
  if (!items.length) {
    setStatus('还没有选择任何作品', 'warn');
    return;
  }
  if (!hasDirectoryPicker()) {
    setStatus('批量下载需要 Chrome / Edge（支持自选文件夹）', 'warn');
    return;
  }

  const root = await ensureRoot(false);
  if (!root) {
    setStatus('还没选目标文件夹，点「选择文件夹」授权一次', 'warn');
    return;
  }

  let ok = 0;
  let failed = 0;
  let missed = 0;
  const missedTitles: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const captured = store.byId[item.id];

    if (!captured || !captured.images.length) {
      missed++;
      missedTitles.push(captured?.title || item.title || item.id);
      continue;
    }

    setStatus(`批量 ${i + 1}/${items.length}：${captured.title || item.id}`);
    try {
      const result = await downloadPost(root, item.id, captured.title, captured.images);
      if (result.fail === 0) ok++;
      else failed++;
    } catch (e) {
      failed++;
      console.warn('[抖音图片下载] 批量失败:', item.id, e);
    }

    await delay(DELAY_MS);
  }

  const head = `批量完成：成功 ${ok} · 未截获 ${missed} · 失败 ${failed}`;
  const tail = missedTitles.length ? `\n未截获：${missedTitles.join('、')}` : '';
  setStatus(head + tail, missed || failed ? 'warn' : 'ok');
}
