import { store } from '../env';
import { L } from '../i18n';
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
    setStatus(L.status.nothingSelected(), 'warn');
    return;
  }
  if (!hasDirectoryPicker()) {
    setStatus(L.status.noBrowser(), 'warn');
    return;
  }

  const root = await ensureRoot(false);
  if (!root) {
    setStatus(L.status.noFolder(), 'warn');
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

    setStatus(L.status.batchProgress({ current: i + 1, total: items.length, title: captured.title || item.id }));
    try {
      const result = await downloadPost(root, item.id, captured.title, captured.images);
      if (result.fail === 0) ok++;
      else failed++;
    } catch (e) {
      failed++;
      console.warn('[douyin-pic-spy] batch item failed:', item.id, e);
    }

    await delay(DELAY_MS);
  }

  const head = L.status.batchDone({ ok, missed, failed });
  const tail = missedTitles.length ? '\n' + L.status.missedList({ titles: missedTitles.join(', ') }) : '';
  setStatus(head + tail, missed || failed ? 'warn' : 'ok');
}
