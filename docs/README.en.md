# Douyin Pic Spy

English · [中文](../README.md)

A Tampermonkey userscript. Open an **image post** on the Douyin web app and download all of its pictures in one click, into a folder you choose. **Each post becomes its own subfolder.**

---

## Features

- **One-click download**: a pill button in the bottom-right corner of the post page. It does not cover the video.
- **Choose where files go**: uses the File System Access API. Pick a target folder once and it is remembered.
- **One folder per post**: `Target/Title_timestamp/01.jpg`, `02.jpg`, …
- **Original quality**: takes the original image URLs from Douyin's API, which are sharper than the page thumbnails.
- **Switchable folder naming**: `Title + time (default)` / `Title + ID` / `Title only` / `ID only`.
- **Auto-update**: the script header includes `@updateURL`, so new releases from the repository are picked up automatically.
- **Language**: the interface follows your browser language. Chinese-language browsers see Chinese; everything else sees English. There is no language setting.

## Install

### 1. Install a userscript manager

- [Tampermonkey](https://www.tampermonkey.net/) (recommended)
- or Violentmonkey / ScriptCat

### 2. Install the script

Use either option:

- **Direct install**: [`douyin-pic-spy.user.js`](https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js). The userscript manager opens an install page.
- **Manual**: download `douyin-pic-spy.user.js`, drag it into the browser window, then click **Install**.

> You need **Chrome or Edge** (see [Compatibility](ARCHITECTURE.en.md#compatibility)).

## Usage

1. Open the Douyin web app and go to any **image post** (`www.douyin.com/note/<id>` or a video detail page).
2. A pill button appears at the bottom right: `⬇ Download images | ⚙`.
3. The first time, click **⚙** to open settings, then **Choose folder** and grant access to a target folder. You only need to do this once.
4. Click **⬇ Download images**. A progress bubble appears above the button. When it finishes it shows `Done: N succeeded → folder/subfolder`.
5. Look in the target folder: `Your folder/Post title_20261009_161430/01.jpg` …

### Batch download

On your own profile, these tabs turn the button into **Batch download**:

| Tab | URL |
| --- | --- |
| Recommend | `douyin.com/user/self?showTab=recommend` |
| Likes | `douyin.com/user/self?showSubTab=video&showTab=like` |
| Favorites | `douyin.com/user/self?showSubTab=video&showTab=favorite_collection` |
| Watch history | `douyin.com/user/self?showSubTab=video&showTab=record` |
| Watch later | `douyin.com/user/self?showSubTab=video&showTab=watch_later` |

How to use it:

1. Scroll so the posts you want are loaded. Only posts that have been loaded while scrolling can be selected.
2. Click **Batch download** to enter selection mode, then click a cover to select a post.
3. Greyed-out covers cannot be selected. These are pure videos (which cannot be downloaded) or posts whose data has not been captured.
4. Click **Start download** at the bottom. Posts download one after another, each into its own subfolder. The summary shows how many succeeded, were not captured, or failed, and lists the titles of the posts that were not captured.
5. Click **Exit selection**, or **Cancel** in the bottom bar, to leave selection mode.

Note: some image posts may fail to extract and must be downloaded by hand.

### Settings

| Option | Description |
| --- | --- |
| Folder name | Naming rule for each post's subfolder. Default: `Title + time (default)` |
| Target folder | Choose and remember the save folder. The button shows the current folder name. |
| Clear post folder before re-downloading | If the same folder already exists, clear it first to avoid leftover images. In `Title + time` mode this is greyed out, because every download creates a new folder. |

Settings take effect immediately. Change them and click **Download images** again. No page refresh is needed.

## Documentation

- [Architecture](ARCHITECTURE.en.md): how it works, compatibility, module layout
- [Development guide](DEVELOPMENT.en.md): commands, release steps, troubleshooting

## Disclaimer

This project is for personal study and backup of content **you have access to**. Follow Douyin's user agreement and applicable laws. Do not use it for bulk scraping, redistribution, or anything that infringes on other people's rights. You are responsible for any consequences of using this script.

## License

[MIT](../LICENSE)
