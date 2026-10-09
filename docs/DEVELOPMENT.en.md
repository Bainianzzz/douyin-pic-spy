# Development guide

English · [中文](../DEVELOPMENT.md)

The source is **TypeScript**, split into modules, and built into a single `.user.js` file with [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey). For the module layout, see [ARCHITECTURE.en.md](ARCHITECTURE.en.md).

## Commands

```sh
npm install
npm run dev        # Local dev server, hot-reloads the script in the browser
npm run build      # Build dist/douyin-pic-spy.user.js and copy it to the repository root
npm run typecheck  # Type check
npm run i18n       # Regenerate types from src/i18n/*/index.ts
```

## Internationalisation

Strings use [typesafe-i18n](https://github.com/ivanhofer/typesafe-i18n):

- English is the base language. Strings live in `src/i18n/en/index.ts`, and the Chinese ones in `src/i18n/zh-CN/index.ts`.
- After adding or changing a string, run `npm run i18n`. This regenerates `src/i18n/i18n-types.ts` and related files. Both languages must have the same keys, or the type check fails.
- In code, call functions such as `L.panel.download()` and `L.status.doneOk({ ok, folder })`.
- The language is detected from the browser only: any `zh*` language uses Chinese, everything else uses English. There is no language setting.
- The `@name:en` and `@description:en` header fields are maintained in `vite.config.ts`.

The rest of the script header (`@match`, `@grant`, `@connect`, version, and so on) is also maintained in `vite.config.ts`. It is generated at build time, so do not edit the comment block by hand.

## Releasing a new version

1. Bump `version` in both `vite.config.ts` and `package.json`.
2. Run `npm run build`.
3. Commit the root `douyin-pic-spy.user.js`.

## Troubleshooting

**Clicking download does nothing, or no images are found?**
Refresh the browser, reopen the image post, then click download again. Confirm the URL is `note/<id>` or `video/<id>`. If it still says "no image data captured", open an issue and include the post URL.

**Are the downloaded images the originals?**
The script only takes the original image URLs from Douyin's API. It does not use page thumbnails. A post whose data was not captured is not downloaded.

**The script updated but the browser still runs the old version?**
Tampermonkey checks `@version` for updates. You can also choose "Check for updates" in the Tampermonkey panel. After an upgrade you **must refresh the page** (**Cmd/Ctrl + Shift + R**). The script is injected at `document-start`, so the page has to reload to run the new version.
