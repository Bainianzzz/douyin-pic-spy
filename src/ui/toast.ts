import { L } from '../i18n';
import { refs } from './refs';

export type StatusKind = 'info' | 'warn' | 'ok';

let timer: ReturnType<typeof setTimeout> | undefined;

/** Show a transient status bubble above the pill. */
export function setStatus(text: string, kind: StatusKind = 'info'): void {
  const el = refs.statusEl;
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(timer);
  if (kind === 'ok' || kind === 'warn') {
    timer = setTimeout(() => {
      el.classList.remove('show');
    }, 8000);
  }
}

/** Bubble with a main line and grey secondary lines. */
export function setHint(title: string, subLines: string[]): void {
  const el = refs.statusEl;
  if (!el) return;
  el.textContent = '';
  const main = document.createElement('div');
  main.textContent = title;
  el.appendChild(main);
  subLines.forEach((line) => {
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = line;
    el.appendChild(sub);
  });
  el.dataset.kind = 'info';
  el.classList.add('show');
  clearTimeout(timer);
}

/** Update the folder button label to the remembered directory name. */
export function setDirLabel(name?: string | null): void {
  const btn = refs.pickBtn;
  if (!btn) return;
  btn.textContent = name || L.panel.choose();
  btn.title = name || L.panel.choose();
}
