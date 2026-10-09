# Douyin Pic Spy · 抖音图文图片下载器

一个 Tampermonkey 油猴脚本：在抖音网页版打开**图文作品**，一键把该作品的全部图片下载到你指定的文件夹，**每个作品自动打包成一个子文件夹**。

---

## 特性

- **一键下载**：作品页右下角按钮，点一下即可，不遮挡视频。
- **自选保存位置**：基于 File System Access API，选择一次目标文件夹后长期记住。
- **按作品分文件夹**：`目标目录/标题_时间戳/01.jpg`、`02.jpg` …… 结构清晰。
- **抓取原图**：优先从抖音接口拿到原图地址，画质高于页面缩略图。
- **命名可切换**：`标题_时间（默认）` / `标题_ID` / `仅标题` / `仅ID`。
- **自动更新**：脚本头内置 `@updateURL`，随仓库更新。

## 安装

### 1. 安装脚本管理器

- [Tampermonkey 篡改猴](https://www.tampermonkey.net/)（推荐）
- 或 Violentmonkey / ScriptCat

### 2. 安装脚本

点击下面任一方式：

- **直接安装**：[`douyin-pic-spy.user.js`](https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js)（点击后脚本管理器会弹出安装页）
- **手动**：下载 `douyin-pic-spy.user.js`，拖进浏览器窗口 → 点击「安装」

> 需要浏览器为 **Chrome / Edge**（原因见「兼容性」）。

## 使用

1. 打开抖音网页版，进入任意**图文作品**页（`www.douyin.com/note/<id>` 或视频详情页）。
2. 右下角出现胶囊按钮 `⬇ 下载图片 ｜ ⚙`。
3. 首次使用点击 **⚙** 打开设置 → **选择文件夹**，授权目标目录（只需一次）。
4. 点击 **⬇ 下载图片**。按钮上方出现进度气泡，完成后提示 `完成：成功 N → 目录/子文件夹`。
5. 到目标目录查看：`你的目录/作品标题_20261009_161430/01.jpg` …

### 收藏页批量下载

在 `douyin.com/user/self?showTab=favorite_collection` 页面，按钮会变成 **批量下载**：

1. 滚动页面，让列表加载出要下载的作品（只有滚到过的作品才会被截获）。
2. 点 **批量下载** 进入选择态，点封面选择作品；灰掉的是纯视频或未截获的作品，不可选。
3. 底部点 **开始下载**，作品按顺序串行下载，每个作品一个子文件夹；结束时汇总成功、未截获、失败的数量。
4. 再点 **退出选择** 或底部 **取消** 退出选择态。

### 设置项

| 选项 | 说明 |
| --- | --- |
| 命名方式 | 子文件夹命名规则，默认 `标题_时间（默认）` |
| 目标位置 | 选择并记住保存目录，按钮上显示当前目录名 |
| 重下前清空该作品文件夹 | 同名文件夹重下前先清空，避免残留旧图；`标题_时间` 模式下自动置灰（每次生成新文件夹） |

设置**即时生效**，改完直接点「下载图片」即可，无需刷新页面。

## 工作原理

抖音的图文数据有两个来源，脚本两者都覆盖：

1. **首屏 SSR**：直接打开 `/note/<id>` 时，数据内嵌在 `window._ROUTER_DATA` 里。脚本在 `document-start` 拦截该属性。
2. **运行时接口**：页面内点开作品时走 `aweme/detail`。脚本挂钩 `XMLHttpRequest` 与 `fetch`，递归扫描任意抖音 JSON 响应中的 `aweme_id + images`，按 id 归档。
3. **不兜底**：两个来源都截不到，就明确报「未截获到图片数据」，不主动请求、不扫描页面图片，避免下到错图。

图片通过 `GM_xmlhttpRequest` 跨域获取为 Blob，再用 `FileSystemWritableFileStream` 写入你授权的目录。

## 兼容性

| 浏览器 | 自选文件夹 | 说明 |
| --- | --- | --- |
| Chrome / Edge | ✅ | 完整功能，推荐 |
| Firefox | ❌ | 退化为逐张普通下载，不建子文件夹 |
| Safari | ❌ | 同上 |

「选择文件夹」依赖 [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API)，Firefox/Safari 尚未实现。

## 常见问题

**点了下载没反应 / 没找到图片？**
先在浏览器里刷新并重新点开该图文作品，再点下载；确认 URL 是 `note/<id>` 或 `video/<id>`。仍提示「未截获到图片数据」，请提交 Issue 并附上作品链接。

**下载的图片比页面模糊？**
脚本优先取接口里的原图地址，通常最清晰；若某作品接口未返回，会退化为页面图。

**更新了脚本但浏览器还是旧版？**
Tampermonkey 会按 `@version` 自动检测更新；也可在油猴面板手动「检查更新」。
脚本升级后**必须刷新页面**（**Cmd/Ctrl + Shift + R**）才生效：脚本在 `document-start` 注入，需重新加载页面才会运行新版本。

## 开发

源码是 **TypeScript**，按模块拆分，用 [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) 构建成单个 `.user.js` 产物。

```sh
npm install
npm run dev        # 本地开发，改代码自动热更新到浏览器
npm run build      # 构建：dist/douyin-pic-spy.user.js，并复制到仓库根目录
npm run typecheck  # 类型检查
```

目录结构：

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

脚本头部元数据（`@match`、`@grant`、`@connect`、版本等）在 `vite.config.ts` 中维护，构建时自动生成，无需手改注释。

发布新版本：同步递增 `vite.config.ts` 与 `package.json` 的 `version` → `npm run build` → 提交根目录的 `douyin-pic-spy.user.js`。

## 免责声明

本项目仅供个人学习与备份**自己有权访问的内容**使用。请遵守抖音的用户协议及相关法律法规，勿用于批量爬取、二次分发或任何侵犯他人权益的场景。使用者自行承担因使用本脚本产生的一切后果。

## 许可

[MIT](LICENSE)
