<p align="center">
  <img src="public/logo.png" width="120" alt="简阅 Logo" />
</p>

<h1 align="center">简阅</h1>

<p align="center">
  简而阅之 • 简而记之
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#开发指南">开发指南</a> ·
  <a href="#下载安装">下载安装</a> ·
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license" />
  <img src="https://img.shields.io/badge/electron-28-blue.svg" alt="electron" />
  <img src="https://img.shields.io/badge/vue-3.3-42b883.svg" alt="vue" />
  <img src="https://img.shields.io/badge/typescript-5.0-3178c6.svg" alt="typescript" />
</p>

---

## 功能特性

### 简阅 — 阅读引擎（基于 [foliate-js](https://github.com/nicm42/foliate-js)）

电子书阅读核心由 [foliate-js](https://github.com/nicm42/foliate-js) 驱动，这是一款纯 JavaScript 的 EPUB 渲染引擎。

| 能力 | 说明 |
|------|------|
| **多格式支持** | EPUB、TXT、MOBI、AZW3、CBZ、CBR，拖拽即可导入 |
| **智能编码检测** | TXT 自动识别 UTF-8 / GBK / GB2312 / GB18030，告别乱码 |
| **智能章节检测** | 自动识别中文章节（第X章/回/节/卷）、英文（Chapter X）、数字编号等 |
| **EPUB 封面提取** | 支持 OPF 元数据解析，兼容非标准封面文件名 |
| **12 套阅读主题** | 羊皮纸、竹林绿、暖沙、天青、深夜绿、墨夜金、深海蓝、烛火、冷白、薰衣草、深灰、护目黄 |
| **滚动 / 单页双模式** | 自由切换阅读布局 |
| **字体排版调节** | 字号、行高、字间距随心定制，支持自定义字体上传（TTF/OTF/WOFF/WOFF2） |
| **多色高亮划线** | 黄、绿、蓝、粉、下划线五种标注样式 |
| **备注系统** | 标注文字即时备注，悬停显示备注内容 |
| **书签管理** | 一键添加书签，侧边栏快速跳转 |
| **全文搜索** | 书内关键词检索，结果高亮定位 |
| **进度记忆** | 自动保存阅读位置，下次打开继续阅读 |
| **图片放大预览** | 点击书中图片即时放大 |
| **备注导出** | 一键导出全部备注为 Markdown 文件 |

### 简记 — 笔记引擎（基于 [Milkdown](https://milkdown.dev/)）

笔记编辑器由 [Milkdown](https://milkdown.dev/) 驱动，一款基于 ProseMirror 的所见即所得 Markdown 编辑器。

| 能力 | 说明 |
|------|------|
| **所见即所得编辑** | Markdown 语法实时渲染，流畅书写体验 |
| **镜像笔记浮窗** | 从阅读器中提取文字生成浮动笔记窗口，可拖拽、可置顶、可调透明度 |
| **源码模式** | 支持切换到 Markdown 源码编辑 |
| **笔记保存** | 自动编号保存为本地 Markdown 文件 |
| **笔记管理** | 侧边栏浏览所有笔记，快速定位与切换 |

### 模式切换

点击左上角 Logo 图标即可在 **简阅（阅读模式）** 和 **简记（笔记模式）** 之间切换。

### 悬浮阅读器

独立的浮动阅读窗口，可置顶、可调透明度，边工作边阅读。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **阅读引擎** | [foliate-js](https://github.com/nicm42/foliate-js) — 纯 JavaScript EPUB 渲染引擎 |
| **笔记引擎** | [Milkdown](https://milkdown.dev/) — 基于 ProseMirror 的 WYSIWYG Markdown 编辑器 |
| **前端框架** | [Vue 3](https://vuejs.org/) + [Pinia](https://pinia.vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) |
| **桌面框架** | [Electron](https://www.electronjs.org/) 28 |
| **构建工具** | [Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/) |
| **UI 图标** | [Lucide](https://lucide.dev/) |
| **样式** | 原生 CSS + CSS 变量主题系统 |

---

## 项目结构

```
简阅/
├── electron/                # Electron 主进程 & preload
│   ├── main.ts              # 主进程入口（IPC、窗口管理、文件操作）
│   └── preload.ts           # preload 脚本（上下文桥接）
├── src/
│   ├── components/
│   │   ├── book/            # 书籍卡片组件
│   │   ├── note/            # 笔记侧边栏组件
│   │   └── reader/          # 阅读器组件（Viewer、设置、浮动阅读器等）
│   ├── pages/
│   │   ├── Bookshelf.vue    # 书架页面
│   │   ├── Reader.vue       # 阅读器页面
│   │   ├── NoteEditor.vue   # 笔记编辑器页面
│   │   ├── FloatReader.vue  # 浮动阅读器窗口
│   │   └── FloatNote.vue    # 浮动笔记窗口
│   ├── services/
│   │   ├── foliateService.ts  # foliate-js 引擎封装
│   │   ├── fileService.ts     # 文件读取服务
│   │   └── kookitService.ts   # 格式转换服务
│   ├── stores/              # Pinia 状态管理
│   └── types/               # TypeScript 类型定义
├── public/                  # 静态资源
└── release/                 # 打包输出目录
```

---

## 开发指南

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### 安装依赖

```bash
pnpm install
```

### 启动开发

```bash
pnpm dev
```

### 构建打包

```bash
# Windows x64
pnpm electron:build:win:x64

# Windows ia32
pnpm electron:build:win:ia32

# Windows arm64
pnpm electron:build:win:arm64

# Linux x64
pnpm electron:build:linux:x64

# macOS arm64
pnpm electron:build:mac:arm64
```

构建产物输出在 `release/` 目录下。

---

## 下载安装

前往 [Releases](../../releases) 页面下载对应平台的安装包。

| 平台 | 格式 |
|------|------|
| Windows | `.exe`（NSIS 安装程序） |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

---

## License

[MIT](LICENSE)

<p align="center">
  如果觉得有用，欢迎给个 Star ⭐
</p>
