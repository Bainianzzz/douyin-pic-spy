import { store } from '../env';
import { idFromHref } from '../core/page';
import { ICON_CHECK } from '../ui/icons';
import { setHint, setStatus } from '../ui/toast';
import { runBatch, type BatchItem } from './run';
import { BATCH_CSS } from './styles';

const CARD_SELECTOR = 'a[href*="/video/"], a[href*="/note/"]';
const MIN_CARD_SIZE = 140;

let active = false;
let observer: MutationObserver | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let scheduled = false;

const selected = new Set<string>();
let bar: HTMLElement | null = null;
let countEl: HTMLElement | null = null;
let startBtn: HTMLButtonElement | null = null;

export function isSelecting(): boolean {
  return active;
}

function isSelectable(id: string): boolean {
  const captured = store.byId[id];
  return !!(captured && captured.images.length);
}

function refreshCard(anchor: HTMLAnchorElement, id: string): void {
  const selectable = isSelectable(id);
  if (!selectable) {
    selected.delete(id);
    anchor.classList.remove('selected');
    anchor.classList.add('disabled');
  } else {
    anchor.classList.remove('disabled');
    anchor.classList.toggle('selected', selected.has(id));
  }
}

function decorate(anchor: HTMLAnchorElement): void {
  const id = idFromHref(anchor.getAttribute('href'));
  if (!id) return;

  const rect = anchor.getBoundingClientRect();
  if (rect.width < MIN_CARD_SIZE || rect.height < MIN_CARD_SIZE) return;

  const hasOverlay = !!anchor.querySelector(':scope > .dy-batch-mask');
  if (!hasOverlay) {
    anchor.classList.add('dy-batch-card');
    anchor.style.position = 'relative';

    const mask = document.createElement('div');
    mask.className = 'dy-batch-mask';
    const circle = document.createElement('div');
    circle.className = 'dy-batch-circle';
    circle.innerHTML = ICON_CHECK;
    anchor.append(mask, circle);
  }

  anchor.dataset.dyId = id;
  refreshCard(anchor, id);
}

function decorateAll(): void {
  document.querySelectorAll<HTMLAnchorElement>(CARD_SELECTOR).forEach(decorate);
}

function scheduleDecorate(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    decorateAll();
  });
}

function updateBar(): void {
  if (countEl) countEl.textContent = `已选 ${selected.size} 项`;
  if (startBtn) startBtn.disabled = selected.size === 0;
}

function onClick(event: MouseEvent): void {
  if (!active) return;
  const target = event.target as Element | null;
  const anchor = target?.closest?.(CARD_SELECTOR) as HTMLAnchorElement | null;
  if (!anchor || !anchor.classList.contains('dy-batch-card')) return;

  event.preventDefault();
  event.stopPropagation();

  const id = anchor.dataset.dyId;
  if (!id || !isSelectable(id)) return;

  if (selected.has(id)) selected.delete(id);
  else selected.add(id);

  refreshCard(anchor, id);
  updateBar();
}

function buildBar(): void {
  bar = document.createElement('div');
  bar.id = 'dy-batch-bar';

  countEl = document.createElement('span');
  countEl.className = 'count';

  startBtn = document.createElement('button');
  startBtn.id = 'dy-batch-start';
  startBtn.textContent = '开始下载';
  startBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'dy-batch-cancel';
  cancelBtn.textContent = '取消';

  bar.append(countEl, startBtn, cancelBtn);
  document.body.appendChild(bar);

  startBtn.addEventListener('click', () => {
    const items: BatchItem[] = [...selected].map((id) => ({
      id,
      title: store.byId[id]?.title || '',
    }));
    if (!items.length) {
      setStatus('还没有选择任何作品', 'warn');
      return;
    }
    exitSelection();
    void runBatch(items);
  });

  cancelBtn.addEventListener('click', () => exitSelection());
}

export function enterSelection(): void {
  if (active) return;
  active = true;

  GM_addStyle(BATCH_CSS);
  document.addEventListener('click', onClick, true);

  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true });
  interval = setInterval(decorateAll, 1200);

  decorateAll();
  buildBar();
  updateBar();
  setHint('点击封面选择要下载的作品', ['纯视频无法下载；', '部分图文可能提取失败，需手动下载']);
}

export function exitSelection(): void {
  if (!active) return;
  active = false;

  document.removeEventListener('click', onClick, true);
  observer?.disconnect();
  observer = null;
  if (interval) clearInterval(interval);
  interval = null;

  document.querySelectorAll<HTMLElement>('.dy-batch-card').forEach((card) => {
    card
      .querySelectorAll(':scope > .dy-batch-mask, :scope > .dy-batch-circle')
      .forEach((node) => node.remove());
    card.classList.remove('dy-batch-card', 'selected', 'disabled');
    delete card.dataset.dyId;
  });

  selected.clear();
  bar?.remove();
  bar = null;
  countEl = null;
  startBtn = null;
}
