# 开发指南

[English](docs/DEVELOPMENT.en.md) · 中文

源码是 **TypeScript**，按模块拆分，用 [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) 构建成单个 `.user.js` 产物。模块结构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 命令

```sh
npm install
npm run dev        # 本地开发，改代码自动热更新到浏览器
npm run build      # 构建：dist/douyin-pic-spy.user.js，并复制到仓库根目录
npm run typecheck  # 类型检查
npm run i18n       # 根据 src/i18n/*/index.ts 重新生成类型
```

## 国际化

文案使用 [typesafe-i18n](https://github.com/ivanhofer/typesafe-i18n)：

- 英文是基准语言，文案写在 `src/i18n/en/index.ts`，中文在 `src/i18n/zh-CN/index.ts`。
- 新增或修改文案后运行 `npm run i18n`，会重新生成 `src/i18n/i18n-types.ts` 等文件，两个语言的 key 必须一致，否则类型检查会报错。
- 代码中用 `L.panel.download()`、`L.status.doneOk({ ok, folder })` 调用。
- 语言只按浏览器语言自动识别：`zh*` 用中文，其余用英文。没有语言切换设置。
- 脚本头部的 `@name:en` 与 `@description:en` 在 `vite.config.ts` 中维护。

脚本头部元数据（`@match`、`@grant`、`@connect`、版本等）在 `vite.config.ts` 中维护，构建时自动生成，无需手改注释。

## 发布新版本

1. 同步递增 `vite.config.ts` 与 `package.json` 的 `version`
2. `npm run build`
3. 提交根目录的 `douyin-pic-spy.user.js`

## 常见问题

**点了下载没反应 / 没找到图片？**
先在浏览器里刷新并重新点开该图文作品，再点下载；确认 URL 是 `note/<id>` 或 `video/<id>`。仍提示「未截获到图片数据」，请提交 Issue 并附上作品链接。

**下载的图片是原图吗？**
脚本只取接口里的原图地址，不取页面缩略图；截获不到的作品不会下载。

**更新了脚本但浏览器还是旧版？**
Tampermonkey 会按 `@version` 自动检测更新；也可在油猴面板手动「检查更新」。脚本升级后**必须刷新页面**（**Cmd/Ctrl + Shift + R**）才生效：脚本在 `document-start` 注入，需重新加载页面才会运行新版本。
