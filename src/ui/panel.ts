import { enterSelection, exitSelection, isSelecting } from '../batch/selection';
import { isCollectionPage, onNavigate } from '../core/page';
import { downloadAll } from '../download-all';
import { getRootDir } from '../fs/directory';
import { L } from '../i18n';
import { idbGet } from '../fs/idb';
import type { DirHandle } from '../fs/types';
import { DEFAULT_FOLDER_MODE, folderMode } from '../utils/naming';
import { ICON_DOWNLOAD, ICON_GEAR } from './icons';
import { refs } from './refs';
import { CSS } from './styles';
import { setDirLabel, setStatus } from './toast';

function errorMessage(e: unknown): string {
  const err = e as { message?: string } | null;
  return err && err.message ? err.message : String(e);
}

export function buildUI(): void {
  if (document.getElementById('dy-img-dl-panel')) return;

  GM_addStyle(CSS);

  const panel = document.createElement('div');
  panel.id = 'dy-img-dl-panel';
  panel.innerHTML = `
    <div id="dy-img-dl-box">
      <div class="row"><span>${L.panel.naming()}</span>
        <select id="dy-img-dl-mode">
          <option value="title_time">${L.panel.modeTitleTime()}</option>
          <option value="title_id">${L.panel.modeTitleId()}</option>
          <option value="title">${L.panel.modeTitle()}</option>
          <option value="id">${L.panel.modeId()}</option>
        </select></div>
      <div class="row"><span>${L.panel.target()}</span>
        <button class="mini" id="dy-img-dl-pick">${L.panel.choose()}</button></div>
      <div class="row"><label><input type="checkbox" id="dy-img-dl-clean"> ${L.panel.clean()}</label></div>
    </div>
    <div id="dy-img-dl-toast"></div>
    <div id="dy-img-dl-pill">
      <button id="dy-img-dl-btn" title="${L.panel.downloadTitle()}">${ICON_DOWNLOAD}<span>${L.panel.download()}</span></button>
      <button id="dy-img-dl-gear" title="${L.panel.settings()}">${ICON_GEAR}</button>
    </div>`;

  document.body.appendChild(panel);

  refs.statusEl = panel.querySelector('#dy-img-dl-toast');
  refs.pickBtn = panel.querySelector('#dy-img-dl-pick');
  refs.gearBtn = panel.querySelector('#dy-img-dl-gear');

  const box = panel.querySelector('#dy-img-dl-box') as HTMLElement;
  const modeSel = panel.querySelector('#dy-img-dl-mode') as HTMLSelectElement;
  const clean = panel.querySelector('#dy-img-dl-clean') as HTMLInputElement;

  modeSel.value = folderMode();
  clean.checked = GM_getValue<boolean>('cleanBefore', true) !== false;

  const syncClean = () => {
    const isTimestamp = modeSel.value === DEFAULT_FOLDER_MODE;
    clean.disabled = isTimestamp;
    const row = clean.closest('.row') as HTMLElement | null;
    if (row) {
      row.style.opacity = isTimestamp ? '.45' : '1';
      row.title = isTimestamp ? L.panel.cleanDisabled() : '';
    }
  };
  syncClean();

  const downloadBtn = panel.querySelector('#dy-img-dl-btn') as HTMLButtonElement;
  const downloadLabel = downloadBtn.querySelector('span') as HTMLElement;

  const syncLabel = () => {
    if (isSelecting()) downloadLabel.textContent = L.panel.exitSelect();
    else if (isCollectionPage()) downloadLabel.textContent = L.panel.batch();
    else downloadLabel.textContent = L.panel.download();
  };

  downloadBtn.addEventListener('click', () => {
    if (isSelecting()) {
      exitSelection();
    } else if (isCollectionPage()) {
      enterSelection();
    } else {
      void downloadAll(false);
    }
    syncLabel();
  });

  syncLabel();
  setInterval(syncLabel, 800);
  onNavigate(syncLabel);

  refs.gearBtn?.addEventListener('click', () => {
    const open = box.classList.toggle('open');
    refs.gearBtn?.classList.toggle('active', open);
  });

  modeSel.addEventListener('change', () => {
    GM_setValue('folderMode', modeSel.value);
    syncClean();
  });

  clean.addEventListener('change', () => {
    GM_setValue('cleanBefore', clean.checked);
  });

  refs.pickBtn?.addEventListener('click', async () => {
    try {
      const handle = await getRootDir(true);
      if (handle) setDirLabel(handle.name);
    } catch (e) {
      if ((e as { name?: string } | null)?.name !== 'AbortError') {
        setStatus(L.status.chooseFailed({ message: errorMessage(e) }), 'warn');
      }
    }
  });

  idbGet<DirHandle>('root')
    .then((handle) => {
      if (handle) setDirLabel(handle.name);
    })
    .catch(() => {});
}
