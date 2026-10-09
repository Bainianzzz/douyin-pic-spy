# 开发指南

源码是 **TypeScript**，按模块拆分，用 [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) 构建成单个 `.user.js` 产物。模块结构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 命令

```sh
npm install
npm run dev        # 本地开发，改代码自动热更新到浏览器
npm run build      # 构建：dist/douyin-pic-spy.user.js，并复制到仓库根目录
npm run typecheck  # 类型检查
```

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
