import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const REPO = 'https://github.com/Bainianzzz/douyin-pic-spy';
const RAW = 'https://raw.githubusercontent.com/Bainianzzz/douyin-pic-spy/main/douyin-pic-spy.user.js';

export default defineConfig({
  build: {
    minify: false,
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
  plugins: [
    monkey({
      entry: 'src/index.ts',
      userscript: {
        name: {
          '': '抖音图文图片下载器',
          en: 'Douyin Pic Spy',
        },
        namespace: REPO,
        version: '2.5.0',
        description: {
          '': '在抖音网页版作品页一键下载全部图片，按作品打包进你指定的文件夹（仅图文作者图，不含推荐流/头像）',
          en: 'Download all images from a Douyin image post into a folder you choose, one subfolder per post.',
        },
        author: 'Bainianzzz',
        homepageURL: REPO,
        supportURL: `${REPO}/issues`,
        downloadURL: RAW,
        updateURL: RAW,
        license: 'MIT',
        match: ['https://www.douyin.com/*'],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue', 'GM_addStyle'],
        connect: [
          'douyin.com',
          '*.douyin.com',
          'douyinpic.com',
          '*.douyinpic.com',
          'byteimg.com',
          '*.byteimg.com',
          'bytecdn.cn',
          '*.bytecdn.cn',
          '*',
        ],
        'run-at': 'document-start',
        noframes: true,
      },
      build: {
        fileName: 'douyin-pic-spy.user.js',
        metaFileName: false,
      },
    }),
  ],
});
