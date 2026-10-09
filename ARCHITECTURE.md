# 架构

[English](docs/ARCHITECTURE.en.md) · 中文

## 工作原理

抖音的图文数据有两个来源，脚本两者都覆盖：

1. **首屏 SSR**：直接打开 `/note/<id>` 时，数据内嵌在 `window._ROUTER_DATA` 里。脚本在 `document-start` 拦截该属性。
2. **运行时接口**：页面内点开作品时走 `aweme/detail`。脚本挂钩 `XMLHttpRequest` 与 `fetch`，递归扫描任意抖音 JSON 响应中的 `aweme_id + images`，按 id 归档。

两个来源都截不到，就明确报「未截获到图片数据」，不主动请求、不扫描页面图片，避免下到错图。

图片通过 `GM_xmlhttpRequest` 跨域获取为 Blob，再用 `FileSystemWritableFileStream` 写入你授权的目录。

## 兼容性

| 浏览器 | 自选文件夹 | 说明 |
| --- | --- | --- |
| Chrome / Edge | ✅ | 完整功能 |
| Firefox / Safari | ❌ | 不下载，提示「请用 Chrome / Edge」 |

「选择文件夹」依赖 [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API)，Firefox/Safari 尚未实现。

## 模块结构

```
src/
├── index.ts              # 入口：装抓取钩子 + 启动 UI
├── capture/              # 图片数据抓取
│   ├── router-data.ts    # 首屏 window._ROUTER_DATA 拦截
│   ├── xhr-hook.ts       # XMLHttpRequest 钩子
│   ├── fetch-hook.ts     # fetch 钩子
│   ├── absorb.ts         # 递归扫描 JSON
│   ├── register.ts       # 按 aweme_id 归档
│   └── best-urls.ts      # 原图地址优选
├── batch/                # 收藏页批量下载（选择态 / 串行执行 / 样式）
├── core/
│   ├── current.ts        # 当前作品解析（只认截获数据）
│   └── page.ts           # 页面判定与卡片 id 提取
├── download.ts           # 单作品写盘（单次与批量共用）
├── download-all.ts       # 单作品下载入口
├── fs/                   # File System Access + IndexedDB
├── net/                  # 图片下载与扩展名判定
├── ui/                   # 面板、气泡、样式、图标
├── utils/                # 命名与路径清洗
└── types.ts
```
