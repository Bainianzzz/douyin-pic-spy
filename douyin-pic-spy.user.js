// ==UserScript==
// @name         抖音图文图片下载器
// @name:en      Douyin Pic Spy
// @namespace    https://github.com/Bainianzzz/douyin-pic-spy
// @version      2.3.1
// @description  在抖音网页版作品页一键下载全部图片，按作品打包进你指定的文件夹（仅图文作者图，不含推荐流/头像）
// @description:en  Download all images from a Douyin image post into a folder you choose, one subfolder per post.
// @author       Bainianzzz
// @homepageURL  https://github.com/Bainianzzz/douyin-pic-spy
// @supportURL   https://github.com/Bainianzzz/douyin-pic-spy/issues
// @downloadURL  https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js
// @updateURL    https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js
// @license      MIT
// @match        https://www.douyin.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      douyin.com
// @connect      *.douyin.com
// @connect      douyinpic.com
// @connect      *.douyinpic.com
// @connect      byteimg.com
// @connect      *.byteimg.com
// @connect      bytecdn.cn
// @connect      *.bytecdn.cn
// @connect      *
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const store = (window.__dyImg = window.__dyImg || { byId: {}, last: null });
  const RESOLVED = new WeakSet();

  /* =====================================================================
   * 1. 数据吸收：递归找任何带 aweme_id + images 的对象，按 id 归档
   * ===================================================================== */
  function bestUrls(im) {
    const dl = im && im.download_url_list;
    const ul = im && im.url_list;
    const out = [];
    if (Array.isArray(dl)) out.push(...dl);
    if (Array.isArray(ul)) out.push(...ul);
    return out.filter(Boolean);
  }

  function register(item) {
    if (!item || !item.aweme_id) return;
    const imgs = [];
    if (Array.isArray(item.images)) {
      for (const im of item.images) {
        const u = bestUrls(im);
        if (u.length) imgs.push(u[0]);
      }
    }
    if (!imgs.length) return;
    store.byId[String(item.aweme_id)] = {
      title: String(item.desc || '').trim(),
      author: item.author && item.author.nickname ? String(item.author.nickname) : '',
      images: imgs,
      ts: Date.now(),
    };
    store.last = String(item.aweme_id);
  }

  function absorbAny(node, depth) {
    depth = depth || 0;
    try {
      if (!node || depth > 14) return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) absorbAny(node[i], depth + 1);
        return;
      }
      if (typeof node !== 'object') return;
      if (RESOLVED.has(node)) return;
      RESOLVED.add(node);
      if (node.aweme_id && Array.isArray(node.images) && node.images.length) {
        register(node);
      }
      for (const k in node) {
        const v = node[k];
        if (v && typeof v === 'object') absorbAny(v, depth + 1);
      }
    } catch (e) { /* ignore */ }
  }

  /* ---- 首屏 SSR：拦截 window._ROUTER_DATA ---- */
  try {
    let _rd;
    Object.defineProperty(window, '_ROUTER_DATA', {
      configurable: true,
      get() { return _rd; },
      set(v) {
        _rd = v;
        try { absorbAny(v); } catch (e) {}
      },
    });
  } catch (e) {}

  function absorbScripts() {
    try {
      const rd = document.getElementById('RENDER_DATA');
      if (rd && rd.textContent) {
        try { absorbAny(JSON.parse(decodeURIComponent(rd.textContent))); } catch (e) {}
      }
      if (window._ROUTER_DATA) absorbAny(window._ROUTER_DATA);
    } catch (e) {}
  }

  /* ---- 运行时接口：XHR / fetch ---- */
  function isDouyinJson(url) {
    return typeof url === 'string' && url.indexOf('douyin.com') !== -1;
  }

  (function hookXHR() {
    const XO = XMLHttpRequest.prototype.open;
    const XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) {
      try { this.__dyUrl = String(u); } catch (e) {}
      return XO.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      try {
        this.addEventListener('load', function () {
          try {
            if (!isDouyinJson(this.__dyUrl)) return;
            const ct = (this.getResponseHeader && this.getResponseHeader('content-type')) || '';
            if (ct.indexOf('json') === -1) return;
            const t = this.responseType;
            if (t && t !== 'text') return;
            const text = this.responseText;
            if (!text || text.length > 8000000) return;
            absorbAny(JSON.parse(text));
          } catch (e) {}
        });
      } catch (e) {}
      return XS.apply(this, arguments);
    };
  })();

  (function hookFetch() {
    if (!window.fetch) return;
    const F = window.fetch;
    window.fetch = function () {
      const args = arguments;
      const p = F.apply(this, args);
      try {
        const a0 = args[0];
        const u = typeof a0 === 'string' ? a0 : (a0 && a0.url) || '';
        if (isDouyinJson(u)) {
          p.then(function (r) {
            try {
              const ct = r.headers.get('content-type') || '';
              if (ct.indexOf('json') === -1) return;
              r.clone().text().then(function (tx) {
                if (tx && tx.length < 8000000) { try { absorbAny(JSON.parse(tx)); } catch (e) {} }
              }).catch(function () {});
            } catch (e) {}
          }).catch(function () {});
        }
      } catch (e) {}
      return p;
    };
  })();

  /* ---- 当前 id 抓不到时，主动拉一次详情 ---- */
  async function fetchDetail(id) {
    if (!id) return false;
    const u = 'https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383'
      + '&channel=channel_pc_web&aweme_id=' + encodeURIComponent(id)
      + '&screen_width=1920&screen_height=1080';
    try {
      const r = await fetch(u, { credentials: 'include' });
      const ct = r.headers.get('content-type') || '';
      if (ct.indexOf('json') !== -1) {
        const tx = await r.text();
        try { absorbAny(JSON.parse(tx)); } catch (e) {}
      }
    } catch (e) {}
    return !!store.byId[String(id)];
  }

  /* =====================================================================
   * 2. 当前作品 id 与图片
   * ===================================================================== */
  function currentAwemeId() {
    const m = location.pathname.match(/\/(?:video|note)\/(\d+)/);
    if (m) return m[1];
    const q = new URLSearchParams(location.search).get('modal_id');
    return q || null;
  }

  function collectFromDOM() {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('img').forEach(function (img) {
      const s = img.currentSrc || img.src || '';
      if (s.indexOf('douyinpic.com') === -1 && s.indexOf('byteimg.com') === -1) return;
      if (img.closest && img.closest('[class*="avatar"],[class*="Avatar"],[data-e2e*="avatar"],[data-e2e*="avatar"],header,nav')) return;
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w && h && (w < 300 || h < 300)) return;
      const clean = s.split('?')[0];
      if (seen.has(clean)) return;
      seen.add(clean);
      out.push(clean);
    });
    return out;
  }

  function getImages() {
    const id = currentAwemeId();
    let cap = id ? store.byId[id] : null;
    let usedId = id;
    if (!cap && !id && store.last) { cap = store.byId[store.last]; usedId = store.last; }
    if (cap && cap.images.length) {
      return { id: usedId, title: cap.title, author: cap.author, images: cap.images.slice(), source: 'api' };
    }
    const title = (document.title || '').replace(/\s*[-–|].*$/, '').trim();
    return { id: id || String(Date.now()), title, author: '', images: collectFromDOM(), source: 'dom' };
  }

  /* =====================================================================
   * 3. 目标文件夹（IndexedDB 记住句柄）
   * ===================================================================== */
  const DB = 'dy_img_dl', STORE = 'kv';
  function idb() {
    return new Promise(function (res, rej) {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  async function idbGet(k) {
    const db = await idb();
    return new Promise(function (res, rej) {
      const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(k);
      t.onsuccess = function () { res(t.result); };
      t.onerror = function () { rej(t.error); };
    });
  }
  async function idbSet(k, v) {
    const db = await idb();
    return new Promise(function (res, rej) {
      const t = db.transaction(STORE, 'readwrite').objectStore(STORE).put(v, k);
      t.onsuccess = function () { res(); };
      t.onerror = function () { rej(t.error); };
    });
  }

  async function getRootDir(forcePick) {
    if (forcePick) {
      const h = await window.showDirectoryPicker({ id: 'dy-img-dir', mode: 'readwrite' });
      await idbSet('root', h);
      return h;
    }
    const h = await idbGet('root');
    if (!h) return null;
    try {
      let p = await h.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted') p = await h.requestPermission({ mode: 'readwrite' });
      return p === 'granted' ? h : null;
    } catch (e) { return null; }
  }

  /* =====================================================================
   * 4. 工具
   * ===================================================================== */
  function sanitize(name) {
    return String(name || '')
      .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/, '')
      .trim()
      .slice(0, 80) || 'untitled';
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function stamp() {
    const d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate())
      + '_' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  function folderName(id, title) {
    const mode = GM_getValue('folderMode', 'title_time');
    if (mode === 'id') return sanitize(id);
    if (mode === 'title') return sanitize(title) || sanitize(id);
    if (mode === 'title_id') return sanitize((title ? title + '_' : '') + id).slice(0, 120);
    return sanitize((title ? title + '_' : '') + stamp()).slice(0, 120);
  }

  function gmBlob(url) {
    return new Promise(function (res, rej) {
      GM_xmlhttpRequest({
        method: 'GET', url: url, responseType: 'blob', timeout: 60000,
        onload: function (r) {
          (r.status >= 200 && r.status < 300 && r.response) ? res(r.response) : rej(new Error('HTTP ' + r.status));
        },
        onerror: function () { rej(new Error('network error')); },
        ontimeout: function () { rej(new Error('timeout')); },
      });
    });
  }

  function extFrom(blob, url) {
    const t = blob.type || '';
    if (t.indexOf('png') !== -1) return 'png';
    if (t.indexOf('webp') !== -1) return 'webp';
    if (t.indexOf('gif') !== -1) return 'gif';
    if (t.indexOf('avif') !== -1) return 'avif';
    if (t.indexOf('jpeg') !== -1 || t.indexOf('jpg') !== -1) return 'jpg';
    const m = (url.split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1];
    return (m || 'jpg').toLowerCase();
  }

  async function clearDir(dir) {
    try {
      for await (const entry of dir.values()) {
        if (entry.kind === 'file') { try { await dir.removeEntry(entry.name); } catch (e) {} }
      }
    } catch (e) {}
  }

  async function writeFile(dir, name, blob) {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  }

  /* =====================================================================
   * 5. 下载主流程
   * ===================================================================== */
  let running = false;
  async function downloadAll(forcePick) {
    if (running) return;
    let g = getImages();

    if ((g.source === 'dom' || !g.images.length) && g.id && /^\d+$/.test(g.id)) {
      setStatus('正在解析作品数据…');
      await fetchDetail(g.id);
      g = getImages();
    }

    if (!g.images.length) { setStatus('未找到图片，请先打开一个图文作品再点下载', 'warn'); return; }
    if (!window.showDirectoryPicker) { fallbackDownload(g.title, g.images); return; }

    running = true;
    setStatus('准备中…');
    try {
      let root = await getRootDir(forcePick);
      if (!root) root = await getRootDir(true);
      if (!root) { setStatus('还没选目标文件夹，点「选择文件夹」授权一次', 'warn'); return; }
      setDirLabel(root.name);

      const dir = await root.getDirectoryHandle(folderName(g.id, g.title), { create: true });
      if (GM_getValue('cleanBefore', true)) { setStatus('清空旧文件…'); await clearDir(dir); }

      const pad = String(g.images.length).length;
      let ok = 0, fail = 0;
      for (let i = 0; i < g.images.length; i++) {
        setStatus('下载中 ' + (i + 1) + '/' + g.images.length + ' …');
        try {
          const blob = await gmBlob(g.images[i]);
          const ext = extFrom(blob, g.images[i]);
          await writeFile(dir, String(i + 1).padStart(pad, '0') + '.' + ext, blob);
          ok++;
        } catch (e) { fail++; console.warn('[抖音图片下载] 失败:', g.images[i], e); }
      }
      const tag = g.source === 'api' ? '' : '（DOM 兜底，可能含页面其他图）';
      setStatus('完成：成功 ' + ok + (fail ? '，失败 ' + fail : '') + tag + '\n→ ' + root.name + '/' + dir.name);
    } catch (e) {
      if (e && e.name === 'AbortError') setStatus('已取消');
      else setStatus('出错：' + (e && e.message ? e.message : e), 'warn');
    } finally {
      running = false;
    }
  }

  function fallbackDownload(title, images) {
    const base = sanitize(title);
    images.forEach(function (url, i) {
      const a = document.createElement('a');
      a.href = url;
      a.download = base + '_' + String(i + 1).padStart(2, '0');
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    setStatus('已触发下载（当前浏览器不支持自选文件夹，建议用 Chrome/Edge）', 'warn');
  }

  /* =====================================================================
   * 6. 界面
   * ===================================================================== */
  let statusEl, statusTimer, pickBtn, gearBtn;
  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.kind = kind || 'info';
    statusEl.classList.add('show');
    clearTimeout(statusTimer);
    if (kind === 'ok' || kind === 'warn') {
      statusTimer = setTimeout(function () { statusEl.classList.remove('show'); }, 8000);
    }
  }

  function setDirLabel(name) {
    if (!pickBtn) return;
    pickBtn.textContent = name || '选择文件夹';
    pickBtn.title = name || '选择目标文件夹';
  }

  function buildUI() {
    if (document.getElementById('dy-img-dl-panel')) return;

    const ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      + '<polyline points="7 10 12 15 17 10"/>'
      + '<line x1="12" y1="15" x2="12" y2="3"/></svg>';
    const ICON_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>'
      + '<circle cx="12" cy="12" r="3"/></svg>';

    GM_addStyle([
      '#dy-img-dl-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;',
      'display:flex;flex-direction:column;align-items:flex-end;gap:8px;',
      'font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#111}',
      '#dy-img-dl-panel *{box-sizing:border-box}',
      '#dy-img-dl-pill{display:flex;align-items:stretch;background:#fe2c55;border-radius:24px;',
      'overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.25)}',
      '#dy-img-dl-btn{display:flex;align-items:center;gap:6px;background:transparent;color:#fff;',
      'border:none;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600}',
      '#dy-img-dl-btn:hover{background:rgba(255,255,255,.14)}',
      '#dy-img-dl-gear{display:flex;align-items:center;justify-content:center;width:46px;',
      'background:transparent;color:#fff;border:none;',
      'border-left:1px solid rgba(255,255,255,.35);cursor:pointer;padding:0}',
      '#dy-img-dl-pill svg{display:block;width:18px;height:18px}',
      '#dy-img-dl-gear svg{width:18px;height:18px}',
      '#dy-img-dl-gear:hover{background:rgba(255,255,255,.14)}',
      '#dy-img-dl-gear.active{background:rgba(0,0,0,.2)}',
      '#dy-img-dl-toast{display:none;max-width:300px;background:rgba(20,20,20,.92);color:#fff;',
      'font-size:12px;padding:8px 12px;border-radius:10px;white-space:pre-wrap;',
      'box-shadow:0 6px 18px rgba(0,0,0,.25)}',
      '#dy-img-dl-toast.show{display:block}',
      '#dy-img-dl-toast[data-kind="warn"]{background:rgba(170,34,34,.95)}',
      '#dy-img-dl-box{background:#fff;border-radius:12px;padding:10px 12px;',
      'box-shadow:0 6px 18px rgba(0,0,0,.25);width:270px;display:none}',
      '#dy-img-dl-box.open{display:block}',
      '#dy-img-dl-box .row{display:flex;align-items:center;justify-content:space-between;margin:6px 0;gap:8px}',
      '#dy-img-dl-box select{border:1px solid #ddd;border-radius:6px;padding:3px 6px;font-size:12px;max-width:150px}',
      '#dy-img-dl-box button.mini{border:1px solid #ddd;background:#f7f7f7;border-radius:6px;',
      'padding:4px 8px;font-size:12px;cursor:pointer}',
      '#dy-img-dl-box button.mini:hover{background:#eee}',
      '#dy-img-dl-pick{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#dy-img-dl-hint{font-size:11px;color:#999;margin-top:4px}',
    ].join(''));

    const panel = document.createElement('div');
    panel.id = 'dy-img-dl-panel';
    panel.innerHTML = ''
      + '<div id="dy-img-dl-box">'
      + '  <div class="row"><span>命名方式</span>'
      + '    <select id="dy-img-dl-mode">'
      + '      <option value="title_time">标题_时间（默认）</option>'
      + '      <option value="title_id">标题_ID</option>'
      + '      <option value="title">仅标题</option>'
      + '      <option value="id">仅ID</option>'
      + '    </select></div>'
      + '  <div class="row"><span>目标位置</span>'
      + '    <button class="mini" id="dy-img-dl-pick">选择文件夹</button></div>'
      + '  <div class="row"><label><input type="checkbox" id="dy-img-dl-clean"> 重下前清空该作品文件夹</label></div>'
      + '  <div id="dy-img-dl-hint">每个作品一个子文件夹，图片按序号命名。</div>'
      + '</div>'
      + '<div id="dy-img-dl-toast"></div>'
      + '<div id="dy-img-dl-pill">'
      + '  <button id="dy-img-dl-btn" title="下载当前作品的全部图片">' + ICON_DOWNLOAD + '<span>下载图片</span></button>'
      + '  <button id="dy-img-dl-gear" title="设置">' + ICON_GEAR + '</button>'
      + '</div>';

    document.body.appendChild(panel);
    statusEl = panel.querySelector('#dy-img-dl-toast');
    pickBtn = panel.querySelector('#dy-img-dl-pick');
    gearBtn = panel.querySelector('#dy-img-dl-gear');

    const box = panel.querySelector('#dy-img-dl-box');
    const modeSel = panel.querySelector('#dy-img-dl-mode');
    const clean = panel.querySelector('#dy-img-dl-clean');
    modeSel.value = GM_getValue('folderMode', 'title_time');
    clean.checked = GM_getValue('cleanBefore', true) !== false;

    function syncClean() {
      const isTs = modeSel.value === 'title_time';
      clean.disabled = isTs;
      clean.closest('.row').style.opacity = isTs ? '.45' : '1';
      clean.closest('.row').title = isTs ? '标题_时间 模式每次生成新文件夹，无需清空' : '';
    }
    syncClean();

    panel.querySelector('#dy-img-dl-btn').addEventListener('click', function () {
      downloadAll(false);
    });
    gearBtn.addEventListener('click', function () {
      const open = box.classList.toggle('open');
      gearBtn.classList.toggle('active', open);
    });
    modeSel.addEventListener('change', function () {
      GM_setValue('folderMode', modeSel.value);
      syncClean();
    });
    clean.addEventListener('change', function () { GM_setValue('cleanBefore', clean.checked); });
    panel.querySelector('#dy-img-dl-pick').addEventListener('click', async function () {
      try {
        const h = await getRootDir(true);
        if (h) setDirLabel(h.name);
      } catch (e) {
        if (!(e && e.name === 'AbortError')) setStatus('选择文件夹失败：' + (e && e.message ? e.message : e), 'warn');
      }
    });

    idbGet('root').then(function (h) { if (h) setDirLabel(h.name); }).catch(function () {});
  }

  function boot() {
    if (document.body) { buildUI(); absorbScripts(); }
    else setTimeout(boot, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
