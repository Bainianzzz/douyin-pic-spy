# Architecture

English · [中文](../ARCHITECTURE.md)

## How it works

Douyin provides image-post data from two sources. The script covers both:

1. **Server-rendered first paint**: opening `/note/<id>` directly embeds the data in `window._ROUTER_DATA`. The script intercepts that property at `document-start`.
2. **Runtime API responses**: when a post is opened inside the page, the site calls `aweme/detail`. The script hooks `XMLHttpRequest` and `fetch`, recursively scans every Douyin JSON response for `aweme_id + images`, and stores the result keyed by id.

If neither source has captured a post, the script reports "no image data captured". It does not send extra requests and does not scrape the page, so it never downloads the wrong images.

Images are fetched across origins with `GM_xmlhttpRequest` as Blobs, then written into the folder you granted through `FileSystemWritableFileStream`.

## Compatibility

| Browser | Folder picker | Notes |
| --- | --- | --- |
| Chrome / Edge | ✅ | Full functionality |
| Firefox / Safari | ❌ | Does not download. Shows "Use Chrome / Edge". |

Choosing a folder relies on the [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API), which Firefox and Safari do not implement yet.

## Module layout

```
src/
├── index.ts              # Entry: installs capture hooks and starts the UI
├── capture/              # Image data capture
│   ├── router-data.ts    # Intercepts the first-paint window._ROUTER_DATA
│   ├── xhr-hook.ts       # XMLHttpRequest hook
│   ├── fetch-hook.ts     # fetch hook
│   ├── absorb.ts         # Recursive JSON scan
│   ├── register.ts       # Stores posts by aweme_id
│   └── best-urls.ts      # Picks the original image URL
├── batch/                # Batch download on profile tabs (selection, serial run, styles)
├── core/
│   ├── current.ts        # Resolves the current post (captured data only)
│   └── page.ts           # Page detection and card id extraction
├── download.ts           # Writes one post to disk (shared by single and batch)
├── download-all.ts       # Single-post download entry point
├── fs/                   # File System Access + IndexedDB
├── i18n/                 # typesafe-i18n dictionaries (en base, zh-CN) and language detection
├── net/                  # Image download and file extension detection
├── ui/                   # Panel, toast, styles, icons
├── utils/                # Folder naming and path sanitising
└── types.ts
```
