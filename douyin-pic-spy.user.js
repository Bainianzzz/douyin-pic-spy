// ==UserScript==
// @name            抖音图文图片下载器
// @name:en         Douyin Pic Spy
// @namespace       https://github.com/Bainianzzz/douyin-pic-spy
// @version         2.5.0
// @author          Bainianzzz
// @description     在抖音网页版作品页一键下载全部图片，按作品打包进你指定的文件夹（仅图文作者图，不含推荐流/头像）
// @description:en  Download all images from a Douyin image post into a folder you choose, one subfolder per post.
// @license         MIT
// @homepageURL     https://github.com/Bainianzzz/douyin-pic-spy
// @supportURL      https://github.com/Bainianzzz/douyin-pic-spy/issues
// @downloadURL     https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js
// @updateURL       https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js
// @match           https://www.douyin.com/*
// @connect         douyin.com
// @connect         *.douyin.com
// @connect         douyinpic.com
// @connect         *.douyinpic.com
// @connect         byteimg.com
// @connect         *.byteimg.com
// @connect         bytecdn.cn
// @connect         *.bytecdn.cn
// @connect         *
// @grant           GM_addStyle
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_xmlhttpRequest
// @run-at          document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const w = window;
  const store = w.__dyImg || (w.__dyImg = { byId: {}, last: null });
  const resolved = new WeakSet();
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
    const images = [];
    if (Array.isArray(item.images)) {
      for (const im of item.images) {
        const urls = bestUrls(im);
        if (urls.length) images.push(urls[0]);
      }
    }
    if (!images.length) return;
    const id = String(item.aweme_id);
    store.byId[id] = {
      title: String(item.desc || "").trim(),
      author: item.author && item.author.nickname ? String(item.author.nickname) : "",
      images,
      ts: Date.now()
    };
    store.last = id;
  }
  const MAX_DEPTH = 14;
  function absorbAny(node, depth = 0) {
    try {
      if (!node || depth > MAX_DEPTH) return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) absorbAny(node[i], depth + 1);
        return;
      }
      if (typeof node !== "object") return;
      const obj = node;
      if (resolved.has(obj)) return;
      resolved.add(obj);
      const item = obj;
      if (item.aweme_id && Array.isArray(item.images) && item.images.length) {
        register(item);
      }
      for (const key in obj) {
        const value = obj[key];
        if (value && typeof value === "object") absorbAny(value, depth + 1);
      }
    } catch {
    }
  }
  const MAX_PAYLOAD$1 = 8e6;
  function isDouyinJson(url) {
    return typeof url === "string" && url.indexOf("douyin.com") !== -1;
  }
  function installXhrHook() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(...args) {
      try {
        this.__dyUrl = String(args[1]);
      } catch {
      }
      return originalOpen.apply(this, args);
    };
    XMLHttpRequest.prototype.send = function(...args) {
      try {
        this.addEventListener("load", function() {
          try {
            const self = this;
            if (!isDouyinJson(self.__dyUrl)) return;
            const contentType = self.getResponseHeader("content-type") || "";
            if (contentType.indexOf("json") === -1) return;
            const type = self.responseType;
            if (type && type !== "text") return;
            const text = self.responseText;
            if (!text || text.length > MAX_PAYLOAD$1) return;
            absorbAny(JSON.parse(text));
          } catch {
          }
        });
      } catch {
      }
      return originalSend.apply(this, args);
    };
  }
  const MAX_PAYLOAD = 8e6;
  function installFetchHook() {
    if (!window.fetch) return;
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const promise = originalFetch.apply(this, args);
      try {
        const first = args[0];
        const url = typeof first === "string" ? first : first?.url || "";
        if (isDouyinJson(url)) {
          promise.then((response) => {
            try {
              const contentType = response.headers.get("content-type") || "";
              if (contentType.indexOf("json") === -1) return;
              response.clone().text().then((text) => {
                if (text && text.length < MAX_PAYLOAD) {
                  try {
                    absorbAny(JSON.parse(text));
                  } catch {
                  }
                }
              }).catch(() => {
              });
            } catch {
            }
          }).catch(() => {
          });
        }
      } catch {
      }
      return promise;
    };
  }
  function installRouterDataHook() {
    try {
      let value;
      Object.defineProperty(window, "_ROUTER_DATA", {
        configurable: true,
        get() {
          return value;
        },
        set(next) {
          value = next;
          try {
            absorbAny(next);
          } catch {
          }
        }
      });
    } catch {
    }
  }
  function absorbScripts() {
    try {
      const renderData = document.getElementById("RENDER_DATA");
      if (renderData && renderData.textContent) {
        try {
          absorbAny(JSON.parse(decodeURIComponent(renderData.textContent)));
        } catch {
        }
      }
      const router = window._ROUTER_DATA;
      if (router) absorbAny(router);
    } catch {
    }
  }
  const BATCH_TABS = new Set([
    "favorite_collection",
    "watch_later",
    "like",
    "recommend",
    "record"
  ]);
  function isCollectionPage() {
    if (!location.pathname.startsWith("/user/")) return false;
    const tab = new URLSearchParams(location.search).get("showTab");
    return tab !== null && BATCH_TABS.has(tab);
  }
  function onNavigate(fn) {
    const wrap2 = (type) => {
      const original = history[type];
      history[type] = function(...args) {
        const result = original.apply(this, args);
        try {
          fn();
        } catch {
        }
        return result;
      };
    };
    wrap2("pushState");
    wrap2("replaceState");
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }
  function idFromHref(href) {
    if (!href) return null;
    const match = href.match(/\/(?:video|note)\/(\d+)/);
    return match ? match[1] : null;
  }
  var p = (e) => !!e;
  var n = (e) => Array.from(new Set(e));
  var Nr = (e, o, ...s) => {
    for (let i of s) {
      let t = l(o, i);
      if (t) return t;
    }
    return e;
  }, l = (e, o) => {
    let s = o().map((r) => r.toLowerCase()), i = n(s.flatMap((r) => [r, r.split("-")[0]])), t = e.map((r) => r.toLowerCase());
    return i.map((r) => {
      let c = t.findIndex((x) => x === r);
      return c >= 0 && e[c];
    }).find(p);
  };
  const removeEmptyValues = (object) => Object.fromEntries(
Object.entries(object).map(([key, value]) => key !== "i" && value && value != "0" && [key, value]).filter(Boolean)
  );
  const trimAllValues = (part) => Object.fromEntries(Object.keys(part).map((key) => {
    const val = part[key];
    return [
      key,
      Array.isArray(val) ? val.map((v) => v === null || v === void 0 ? void 0 : v.trim()) : val === !!val ? val : val === null || val === void 0 ? void 0 : val.trim()
    ];
  }));
  const parseArgumentPart = (text) => {
    const [keyPart = "", ...formatterKeys] = text.split("|");
    const [keyWithoutType = "", type] = keyPart.split(":");
    const [key, isOptional] = keyWithoutType.split("?");
    return { k: key, i: type, n: isOptional === "", f: formatterKeys };
  };
  const isBasicPluralPart = (part) => !!(part.o || part.r);
  const parsePluralPart = (content, lastAccessor) => {
    let [key, values] = content.split(":");
    if (!values) {
      values = key;
      key = lastAccessor;
    }
    const entries = values.split("|");
    const [zero, one, two, few, many, rest] = entries;
    const nrOfEntries = entries.filter((entry) => entry !== void 0).length;
    if (nrOfEntries === 1) {
      return { k: key, r: zero };
    }
    if (nrOfEntries === 2) {
      return { k: key, o: zero, r: one };
    }
    if (nrOfEntries === 3) {
      return { k: key, z: zero, o: one, r: two };
    }
    return { k: key, z: zero, o: one, t: two, f: few, m: many, r: rest };
  };
  const REGEX_SWITCH_CASE = /^\{.*\}$/;
  const parseCases = (text) => Object.fromEntries(removeOuterBrackets(text).split(",").map((part) => part.split(":")).reduce((accumulator, entry) => {
    if (entry.length === 2) {
      return [...accumulator, entry.map((entry2) => entry2.trim())];
    }
    accumulator[accumulator.length - 1][1] += "," + entry[0];
    return accumulator;
  }, []));
  const REGEX_BRACKETS_SPLIT = /(\{(?:[^{}]+|\{(?:[^{}]+)*\})*\})/g;
  const removeOuterBrackets = (text) => text.substring(1, text.length - 1);
  const parseRawText = (rawText, optimize = true, firstKey = "", lastKey = "") => rawText.split(REGEX_BRACKETS_SPLIT).map((part) => {
    if (!part.match(REGEX_BRACKETS_SPLIT)) {
      return part;
    }
    const content = removeOuterBrackets(part);
    if (content.startsWith("{")) {
      return parsePluralPart(removeOuterBrackets(content), lastKey);
    }
    const parsedPart = parseArgumentPart(content);
    lastKey = parsedPart.k || lastKey;
    !firstKey && (firstKey = lastKey);
    return parsedPart;
  }).map((part) => {
    if (typeof part === "string")
      return part;
    if (!part.k)
      part.k = firstKey || "0";
    const trimmed = trimAllValues(part);
    return optimize ? removeEmptyValues(trimmed) : trimmed;
  });
  const applyFormatters = (formatters, formatterKeys, initialValue) => formatterKeys.reduce((value, formatterKey) => {
    var _a, _b;
    return (_b = formatterKey.match(REGEX_SWITCH_CASE) ? ((cases) => {
      var _a2;
      return (_a2 = cases[value]) !== null && _a2 !== void 0 ? _a2 : cases["*"];
    })(parseCases(formatterKey)) : (_a = formatters[formatterKey]) === null || _a === void 0 ? void 0 : _a.call(formatters, value)) !== null && _b !== void 0 ? _b : value;
  }, initialValue);
  const getPlural = (pluralRules, { z, o, t, f, m, r }, value) => {
    switch (z && value == 0 ? "zero" : pluralRules.select(value)) {
      case "zero":
        return z;
      case "one":
        return o;
      case "two":
        return t;
      case "few":
        return f !== null && f !== void 0 ? f : r;
      case "many":
        return m !== null && m !== void 0 ? m : r;
      default:
        return r;
    }
  };
  const REGEX_PLURAL_VALUE_INJECTION = /\?\?/g;
  const applyArguments = (textParts, pluralRules, formatters, args) => textParts.map((part) => {
    if (typeof part === "string") {
      return part;
    }
    const { k: key = "0", f: formatterKeys = [] } = part;
    const value = args[key];
    if (isBasicPluralPart(part)) {
      return ((typeof value === "boolean" ? value ? part.o : part.r : getPlural(pluralRules, part, value)) || "").replace(REGEX_PLURAL_VALUE_INJECTION, value);
    }
    const formattedValue = formatterKeys.length ? applyFormatters(formatters, formatterKeys, value) : value;
    return ("" + (formattedValue !== null && formattedValue !== void 0 ? formattedValue : "")).trim();
  }).join("");
  const translate = (textParts, pluralRules, formatters, args) => {
    const firstArg = args[0];
    const isObject = firstArg && typeof firstArg === "object" && firstArg.constructor === Object;
    const transformedArgs = args.length === 1 && isObject ? firstArg : args;
    return applyArguments(textParts, pluralRules, formatters, transformedArgs);
  };
  const getPartsFromString = (cache, text) => cache[text] || (cache[text] = parseRawText(text));
  const getTranslateInstance = (locale2, formatters) => {
    const cache = {};
    const pluralRules = new Intl.PluralRules(locale2);
    return (text, ...args) => translate(getPartsFromString(cache, text), pluralRules, formatters, args);
  };
  function i18nObject$1(locale2, translations, formatters = {}) {
    return createProxy(translations, getTranslateInstance(locale2, formatters));
  }
  const wrap = (proxyObject = {}, translateFn) => typeof proxyObject === "string" ? translateFn.bind(null, proxyObject) : Object.assign(Object.defineProperty(() => "", "name", { writable: true }), proxyObject);
  const createProxy = (proxyObject, translateFn) => new Proxy(wrap(proxyObject, translateFn), {
    get: (target, key) => {
      if (key === Symbol.iterator)
        return [][Symbol.iterator].bind(Object.values(target).map((entry) => wrap(entry, translateFn)));
      return createProxy(target[key], translateFn);
    }
  });
  const baseLocale = "en";
  const locales = [
    "en",
    "zh-CN"
  ];
  const loadedLocales = {};
  const loadedFormatters = {};
  const i18nObject = (locale2) => i18nObject$1(
    locale2,
    loadedLocales[locale2],
    loadedFormatters[locale2]
  );
  const initFormatters = (locale2) => {
    const formatters = {
};
    return formatters;
  };
  const en = {
    panel: {
      download: "Download images",
      batch: "Batch download",
      exitSelect: "Exit selection",
      settings: "Settings",
      settingsTitle: "Settings",
      downloadTitle: "Download all images of this post",
      naming: "Folder name",
      modeTitleTime: "Title + time (default)",
      modeTitleId: "Title + ID",
      modeTitle: "Title only",
      modeId: "ID only",
      target: "Target folder",
      choose: "Choose folder",
      clean: "Clear the post folder before re-downloading",
      cleanDisabled: "Timestamp mode always creates a new folder, no need to clear"
    },
    status: {
      preparing: "Preparing…",
      clearing: "Clearing old files…",
      downloading: "Downloading {current}/{total} …",
      doneOk: "Done: {ok} succeeded\n→ {folder}",
      doneFail: "Done: {ok} succeeded, {fail} failed\n→ {folder}",
      notCaptured: "No image data captured. Refresh the page and reopen this post.",
      noFolder: 'No target folder yet. Click "Choose folder" to grant access once.',
      noBrowser: "Batch and folder saving need Chrome or Edge",
      cancelled: "Cancelled",
      error: "Error: {message}",
      chooseFailed: "Failed to choose folder: {message}",
      nothingSelected: "No posts selected",
      batchProgress: "Batch {current}/{total}: {title}",
      batchDone: "Batch done: {ok} succeeded · {missed} not captured · {failed} failed",
      missedList: "Not captured: {titles}",
      selectHint: "Click a cover to select posts to download",
      selectNote1: "Pure videos cannot be downloaded;",
      selectNote2: "some image posts may fail and need manual download",
      selected: "Selected: {count}",
      start: "Start download",
      cancel: "Cancel"
    }
  };
  const zhCN = {
    panel: {
      download: "下载图片",
      batch: "批量下载",
      exitSelect: "退出选择",
      settings: "设置",
      settingsTitle: "设置",
      downloadTitle: "下载当前作品的全部图片",
      naming: "命名方式",
      modeTitleTime: "标题_时间（默认）",
      modeTitleId: "标题_ID",
      modeTitle: "仅标题",
      modeId: "仅ID",
      target: "目标位置",
      choose: "选择文件夹",
      clean: "重下前清空该作品文件夹",
      cleanDisabled: "标题_时间 模式每次生成新文件夹，无需清空"
    },
    status: {
      preparing: "准备中…",
      clearing: "清空旧文件…",
      downloading: "下载中 {current}/{total} …",
      doneOk: "完成：成功 {ok}\n→ {folder}",
      doneFail: "完成：成功 {ok}，失败 {fail}\n→ {folder}",
      notCaptured: "未截获到图片数据，请刷新页面后重新点开该作品",
      noFolder: "还没选目标文件夹，点「选择文件夹」授权一次",
      noBrowser: "批量下载与选择文件夹需要 Chrome / Edge",
      cancelled: "已取消",
      error: "出错：{message}",
      chooseFailed: "选择文件夹失败：{message}",
      nothingSelected: "还没有选择任何作品",
      batchProgress: "批量 {current}/{total}：{title}",
      batchDone: "批量完成：成功 {ok} · 未截获 {missed} · 失败 {failed}",
      missedList: "未截获：{titles}",
      selectHint: "点击封面选择要下载的作品",
      selectNote1: "纯视频无法下载；",
      selectNote2: "部分图文可能提取失败，需手动下载",
      selected: "已选 {count} 项",
      start: "开始下载",
      cancel: "取消"
    }
  };
  const localeTranslations = {
    en,
    "zh-CN": zhCN
  };
  const loadLocale = (locale2) => {
    if (loadedLocales[locale2]) return;
    loadedLocales[locale2] = localeTranslations[locale2];
    loadFormatters(locale2);
  };
  const loadFormatters = (locale2) => void (loadedFormatters[locale2] = initFormatters());
  const browserLocales = () => {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    return langs.map((lang) => lang.toLowerCase().startsWith("zh") ? "zh-CN" : lang);
  };
  const locale = Nr(baseLocale, locales, browserLocales);
  loadLocale(locale);
  const L = i18nObject(locale);
  const ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
  const refs = {
    statusEl: null,
    pickBtn: null,
    gearBtn: null
  };
  let timer;
  function setStatus(text, kind = "info") {
    const el = refs.statusEl;
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = kind;
    el.classList.add("show");
    clearTimeout(timer);
    if (kind === "ok" || kind === "warn") {
      timer = setTimeout(() => {
        el.classList.remove("show");
      }, 8e3);
    }
  }
  function setHint(title, subLines) {
    const el = refs.statusEl;
    if (!el) return;
    el.textContent = "";
    const main = document.createElement("div");
    main.textContent = title;
    el.appendChild(main);
    subLines.forEach((line) => {
      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = line;
      el.appendChild(sub);
    });
    el.dataset.kind = "info";
    el.classList.add("show");
    clearTimeout(timer);
  }
  function setDirLabel(name) {
    const btn = refs.pickBtn;
    if (!btn) return;
    btn.textContent = name || L.panel.choose();
    btn.title = name || L.panel.choose();
  }
  const DB_NAME = "dy_img_dl";
  const STORE_NAME = "kv";
  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function idbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function idbSet(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  const ROOT_KEY = "root";
  function picker() {
    const w2 = window;
    return typeof w2.showDirectoryPicker === "function" ? w2 : null;
  }
  function hasDirectoryPicker() {
    return picker() !== null;
  }
  async function getRootDir(forcePick) {
    const api = picker();
    if (!api) return null;
    if (forcePick) {
      const handle2 = await api.showDirectoryPicker({ id: "dy-img-dir", mode: "readwrite" });
      await idbSet(ROOT_KEY, handle2);
      return handle2;
    }
    const handle = await idbGet(ROOT_KEY);
    if (!handle) return null;
    try {
      let permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission !== "granted") permission = await handle.requestPermission({ mode: "readwrite" });
      return permission === "granted" ? handle : null;
    } catch {
      return null;
    }
  }
  async function clearDir(dir) {
    try {
      for await (const entry of dir.values()) {
        if (entry.kind === "file") {
          try {
            await dir.removeEntry(entry.name);
          } catch {
          }
        }
      }
    } catch {
    }
  }
  async function writeFile(dir, name, blob) {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  function extFrom(blob, url) {
    const type = blob.type || "";
    if (type.indexOf("png") !== -1) return "png";
    if (type.indexOf("webp") !== -1) return "webp";
    if (type.indexOf("gif") !== -1) return "gif";
    if (type.indexOf("avif") !== -1) return "avif";
    if (type.indexOf("jpeg") !== -1 || type.indexOf("jpg") !== -1) return "jpg";
    const fromUrl = (url.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1];
    return (fromUrl || "jpg").toLowerCase();
  }
  function gmBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        responseType: "blob",
        timeout: 6e4,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300 && response.response) {
            resolve(response.response);
          } else {
            reject(new Error("HTTP " + response.status));
          }
        },
        onerror: () => reject(new Error("network error")),
        ontimeout: () => reject(new Error("timeout"))
      });
    });
  }
  function sanitize(name) {
    return String(name || "").replace(/[\\/:*?"<>|\r\n\t]/g, "_").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim().slice(0, 80) || "untitled";
  }
  const DEFAULT_FOLDER_MODE = "title_time";
  function folderMode() {
    return GM_getValue("folderMode", DEFAULT_FOLDER_MODE);
  }
  function pad2(n2) {
    return String(n2).padStart(2, "0");
  }
  function stamp() {
    const d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "_" + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }
  function folderName(id, title) {
    switch (folderMode()) {
      case "id":
        return sanitize(id);
      case "title":
        return sanitize(title);
      case "title_id":
        return sanitize((title ? title + "_" : "") + id).slice(0, 120);
      default:
        return sanitize((title ? title + "_" : "") + stamp()).slice(0, 120);
    }
  }
  async function ensureRoot(forcePick) {
    let root = await getRootDir(forcePick);
    if (!root) root = await getRootDir(true);
    if (root) setDirLabel(root.name);
    return root;
  }
  async function downloadPost(root, id, title, images) {
    const dir = await root.getDirectoryHandle(folderName(id, title), { create: true });
    if (GM_getValue("cleanBefore", true)) {
      await clearDir(dir);
    }
    const pad = String(images.length).length;
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await gmBlob(images[i]);
        const ext = extFrom(blob, images[i]);
        await writeFile(dir, String(i + 1).padStart(pad, "0") + "." + ext, blob);
        ok++;
      } catch (e) {
        fail++;
        console.warn("[douyin-pic-spy] image failed:", images[i], e);
      }
    }
    return { ok, fail, dir: dir.name };
  }
  const DELAY_MS = 400;
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function runBatch(items) {
    if (!items.length) {
      setStatus(L.status.nothingSelected(), "warn");
      return;
    }
    if (!hasDirectoryPicker()) {
      setStatus(L.status.noBrowser(), "warn");
      return;
    }
    const root = await ensureRoot(false);
    if (!root) {
      setStatus(L.status.noFolder(), "warn");
      return;
    }
    let ok = 0;
    let failed = 0;
    let missed = 0;
    const missedTitles = [];
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
        console.warn("[douyin-pic-spy] batch item failed:", item.id, e);
      }
      await delay(DELAY_MS);
    }
    const head = L.status.batchDone({ ok, missed, failed });
    const tail = missedTitles.length ? "\n" + L.status.missedList({ titles: missedTitles.join(", ") }) : "";
    setStatus(head + tail, missed || failed ? "warn" : "ok");
  }
  const BATCH_CSS = `
.dy-batch-card{position:relative}
.dy-batch-mask{position:absolute;inset:0;background:rgba(128,128,128,.6);
  pointer-events:none;z-index:5;display:none}
.dy-batch-circle{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;
  border:2px solid #fff;background:rgba(0,0,0,.25);z-index:6;pointer-events:none;
  display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.dy-batch-circle svg{width:14px;height:14px;display:none}
.dy-batch-card.selected .dy-batch-circle{background:#fe2c55;border-color:#fe2c55}
.dy-batch-card.selected .dy-batch-circle svg{display:block}
.dy-batch-card.disabled .dy-batch-mask{display:block}
.dy-batch-card.disabled .dy-batch-circle{display:none}
#dy-batch-bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;
  display:flex;align-items:center;gap:12px;background:#111;color:#fff;padding:10px 16px;
  border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);
  font:13px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
#dy-batch-bar .count{white-space:nowrap}
#dy-batch-bar button{border:none;border-radius:999px;padding:8px 16px;cursor:pointer;
  font-size:13px;font-weight:600}
#dy-batch-start{background:#fe2c55;color:#fff}
#dy-batch-start:disabled{background:#555;color:#aaa;cursor:not-allowed}
#dy-batch-cancel{background:transparent;color:#bbb}
#dy-batch-cancel:hover{color:#fff}
`;
  const CARD_SELECTOR = 'a[href*="/video/"], a[href*="/note/"]';
  const MIN_CARD_SIZE = 140;
  let active = false;
  let observer = null;
  let interval = null;
  let scheduled = false;
  const selected = new Set();
  let bar = null;
  let countEl = null;
  let startBtn = null;
  function isSelecting() {
    return active;
  }
  function isSelectable(id) {
    const captured = store.byId[id];
    return !!(captured && captured.images.length);
  }
  function refreshCard(anchor, id) {
    const selectable = isSelectable(id);
    if (!selectable) {
      selected.delete(id);
      anchor.classList.remove("selected");
      anchor.classList.add("disabled");
    } else {
      anchor.classList.remove("disabled");
      anchor.classList.toggle("selected", selected.has(id));
    }
  }
  function decorate(anchor) {
    const id = idFromHref(anchor.getAttribute("href"));
    if (!id) return;
    const rect = anchor.getBoundingClientRect();
    if (rect.width < MIN_CARD_SIZE || rect.height < MIN_CARD_SIZE) return;
    const hasOverlay = !!anchor.querySelector(":scope > .dy-batch-mask");
    if (!hasOverlay) {
      anchor.classList.add("dy-batch-card");
      anchor.style.position = "relative";
      const mask = document.createElement("div");
      mask.className = "dy-batch-mask";
      const circle = document.createElement("div");
      circle.className = "dy-batch-circle";
      circle.innerHTML = ICON_CHECK;
      anchor.append(mask, circle);
    }
    anchor.dataset.dyId = id;
    refreshCard(anchor, id);
  }
  function decorateAll() {
    document.querySelectorAll(CARD_SELECTOR).forEach(decorate);
  }
  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateAll();
    });
  }
  function updateBar() {
    if (countEl) countEl.textContent = L.status.selected({ count: selected.size });
    if (startBtn) startBtn.disabled = selected.size === 0;
  }
  function onClick(event) {
    if (!active) return;
    const target = event.target;
    const anchor = target?.closest?.(CARD_SELECTOR);
    if (!anchor || !anchor.classList.contains("dy-batch-card")) return;
    event.preventDefault();
    event.stopPropagation();
    const id = anchor.dataset.dyId;
    if (!id || !isSelectable(id)) return;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    refreshCard(anchor, id);
    updateBar();
  }
  function buildBar() {
    bar = document.createElement("div");
    bar.id = "dy-batch-bar";
    countEl = document.createElement("span");
    countEl.className = "count";
    startBtn = document.createElement("button");
    startBtn.id = "dy-batch-start";
    startBtn.textContent = L.status.start();
    startBtn.disabled = true;
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "dy-batch-cancel";
    cancelBtn.textContent = L.status.cancel();
    bar.append(countEl, startBtn, cancelBtn);
    document.body.appendChild(bar);
    startBtn.addEventListener("click", () => {
      const items = [...selected].map((id) => ({
        id,
        title: store.byId[id]?.title || ""
      }));
      if (!items.length) {
        setStatus(L.status.nothingSelected(), "warn");
        return;
      }
      exitSelection();
      void runBatch(items);
    });
    cancelBtn.addEventListener("click", () => exitSelection());
  }
  function enterSelection() {
    if (active) return;
    active = true;
    GM_addStyle(BATCH_CSS);
    document.addEventListener("click", onClick, true);
    observer = new MutationObserver(scheduleDecorate);
    observer.observe(document.body, { childList: true, subtree: true });
    interval = setInterval(decorateAll, 1200);
    decorateAll();
    buildBar();
    updateBar();
    setHint(L.status.selectHint(), [L.status.selectNote1(), L.status.selectNote2()]);
  }
  function exitSelection() {
    if (!active) return;
    active = false;
    document.removeEventListener("click", onClick, true);
    observer?.disconnect();
    observer = null;
    if (interval) clearInterval(interval);
    interval = null;
    document.querySelectorAll(".dy-batch-card").forEach((card) => {
      card.querySelectorAll(":scope > .dy-batch-mask, :scope > .dy-batch-circle").forEach((node) => node.remove());
      card.classList.remove("dy-batch-card", "selected", "disabled");
      delete card.dataset.dyId;
    });
    selected.clear();
    bar?.remove();
    bar = null;
    countEl = null;
    startBtn = null;
  }
  function currentAwemeId() {
    const match = location.pathname.match(/\/(?:video|note)\/(\d+)/);
    if (match) return match[1];
    const modal = new URLSearchParams(location.search).get("modal_id");
    return modal || null;
  }
  function getImages() {
    const id = currentAwemeId();
    if (!id) return null;
    const captured = store.byId[id];
    if (!captured || !captured.images.length) return null;
    return {
      id,
      title: captured.title,
      author: captured.author,
      images: captured.images.slice()
    };
  }
  let running = false;
  async function downloadAll(forcePick = false) {
    if (running) return;
    const bundle = getImages();
    if (!bundle) {
      setStatus(L.status.notCaptured(), "warn");
      return;
    }
    if (!hasDirectoryPicker()) {
      setStatus(L.status.noBrowser(), "warn");
      return;
    }
    running = true;
    setStatus(L.status.preparing());
    try {
      const root = await ensureRoot(forcePick);
      if (!root) {
        setStatus(L.status.noFolder(), "warn");
        return;
      }
      const result = await downloadPost(root, bundle.id, bundle.title, bundle.images);
      const folder = `${root.name}/${result.dir}`;
      setStatus(result.fail ? L.status.doneFail({ ok: result.ok, fail: result.fail, folder }) : L.status.doneOk({ ok: result.ok, folder }));
    } catch (e) {
      const err = e;
      if (err?.name === "AbortError") setStatus(L.status.cancelled());
      else setStatus(L.status.error({ message: err?.message ? err.message : String(e) }), "warn");
    } finally {
      running = false;
    }
  }
  const CSS = `
#dy-img-dl-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;
  display:flex;flex-direction:column;align-items:flex-end;gap:8px;
  font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#111}
#dy-img-dl-panel *{box-sizing:border-box}
#dy-img-dl-pill{display:flex;align-items:stretch;background:#fe2c55;border-radius:24px;
  overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.25)}
#dy-img-dl-btn{display:flex;align-items:center;gap:6px;background:transparent;color:#fff;
  border:none;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600}
#dy-img-dl-btn:hover{background:rgba(255,255,255,.14)}
#dy-img-dl-gear{display:flex;align-items:center;justify-content:center;width:46px;
  background:transparent;color:#fff;border:none;
  border-left:1px solid rgba(255,255,255,.35);cursor:pointer;padding:0}
#dy-img-dl-pill svg{display:block;width:18px;height:18px}
#dy-img-dl-gear svg{width:18px;height:18px}
#dy-img-dl-gear:hover{background:rgba(255,255,255,.14)}
#dy-img-dl-gear.active{background:rgba(0,0,0,.2)}
#dy-img-dl-toast{display:none;max-width:300px;background:rgba(20,20,20,.92);color:#fff;
  font-size:12px;padding:8px 12px;border-radius:10px;white-space:pre-wrap;
  box-shadow:0 6px 18px rgba(0,0,0,.25)}
#dy-img-dl-toast.show{display:block}
#dy-img-dl-toast[data-kind="warn"]{background:rgba(170,34,34,.95)}
#dy-img-dl-toast .sub{color:rgba(255,255,255,.55);font-size:11px;margin-top:2px}
#dy-img-dl-box{background:#fff;border-radius:12px;padding:10px 12px;
  box-shadow:0 6px 18px rgba(0,0,0,.25);width:270px;display:none}
#dy-img-dl-box.open{display:block}
#dy-img-dl-box .row{display:flex;align-items:center;justify-content:space-between;margin:6px 0;gap:8px}
#dy-img-dl-box select{border:1px solid #ddd;border-radius:6px;padding:3px 6px;font-size:12px;max-width:150px}
#dy-img-dl-box button.mini{border:1px solid #ddd;background:#f7f7f7;border-radius:6px;
  padding:4px 8px;font-size:12px;cursor:pointer}
#dy-img-dl-box button.mini:hover{background:#eee}
#dy-img-dl-pick{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
  function errorMessage(e) {
    const err = e;
    return err && err.message ? err.message : String(e);
  }
  function buildUI() {
    if (document.getElementById("dy-img-dl-panel")) return;
    GM_addStyle(CSS);
    const panel = document.createElement("div");
    panel.id = "dy-img-dl-panel";
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
    refs.statusEl = panel.querySelector("#dy-img-dl-toast");
    refs.pickBtn = panel.querySelector("#dy-img-dl-pick");
    refs.gearBtn = panel.querySelector("#dy-img-dl-gear");
    const box = panel.querySelector("#dy-img-dl-box");
    const modeSel = panel.querySelector("#dy-img-dl-mode");
    const clean = panel.querySelector("#dy-img-dl-clean");
    modeSel.value = folderMode();
    clean.checked = GM_getValue("cleanBefore", true) !== false;
    const syncClean = () => {
      const isTimestamp = modeSel.value === DEFAULT_FOLDER_MODE;
      clean.disabled = isTimestamp;
      const row = clean.closest(".row");
      if (row) {
        row.style.opacity = isTimestamp ? ".45" : "1";
        row.title = isTimestamp ? L.panel.cleanDisabled() : "";
      }
    };
    syncClean();
    const downloadBtn = panel.querySelector("#dy-img-dl-btn");
    const downloadLabel = downloadBtn.querySelector("span");
    const syncLabel = () => {
      if (isSelecting()) downloadLabel.textContent = L.panel.exitSelect();
      else if (isCollectionPage()) downloadLabel.textContent = L.panel.batch();
      else downloadLabel.textContent = L.panel.download();
    };
    downloadBtn.addEventListener("click", () => {
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
    refs.gearBtn?.addEventListener("click", () => {
      const open = box.classList.toggle("open");
      refs.gearBtn?.classList.toggle("active", open);
    });
    modeSel.addEventListener("change", () => {
      GM_setValue("folderMode", modeSel.value);
      syncClean();
    });
    clean.addEventListener("change", () => {
      GM_setValue("cleanBefore", clean.checked);
    });
    refs.pickBtn?.addEventListener("click", async () => {
      try {
        const handle = await getRootDir(true);
        if (handle) setDirLabel(handle.name);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setStatus(L.status.chooseFailed({ message: errorMessage(e) }), "warn");
        }
      }
    });
    idbGet("root").then((handle) => {
      if (handle) setDirLabel(handle.name);
    }).catch(() => {
    });
  }
  function boot() {
    if (document.body) {
      buildUI();
      absorbScripts();
    } else {
      setTimeout(boot, 300);
    }
  }
  installRouterDataHook();
  installXhrHook();
  installFetchHook();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();