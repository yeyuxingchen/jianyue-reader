/**
 * EPUB 构建器
 * 将一个目录下的 .md 章节打包成 EPUB 3.0 文件。
 *
 * EPUB 本质上是一个 zip，包含：
 *   - mimetype (无压缩，内容固定为 "application/epub+zip")
 *   - META-INF/container.xml (指向 OEBPS/content.opf)
 *   - OEBPS/content.opf (元数据 / manifest / spine)
 *   - OEBPS/toc.ncx (EPUB 2 兼容用)
 *   - OEBPS/nav.xhtml (EPUB 3 导航)
 *   - OEBPS/stylesheet.css (基础样式)
 *   - OEBPS/chapter_N.xhtml (每个 .md 转成一个章节)
 */

import fs from 'fs'
import path from 'path'
// adm-zip 没有自带 .d.ts，运行时类型清晰
// @ts-expect-error 缺少 adm-zip 的类型声明
import AdmZip from 'adm-zip'
import { marked } from 'marked'

const MIME_TYPE = 'application/epub+zip'

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`

const STYLESHEET_CSS = `
@charset "UTF-8";
body { font-family: "Noto Serif CJK SC", "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", "Source Han Serif SC", serif; line-height: 1.7; margin: 1.2em; }
h1, h2, h3, h4, h5, h6 { font-weight: bold; line-height: 1.3; margin-top: 1.2em; margin-bottom: 0.6em; }
h1 { font-size: 1.6em; text-align: center; margin: 1em 0; padding-bottom: 0.3em; border-bottom: 1px solid #ccc; }
h2 { font-size: 1.35em; }
h3 { font-size: 1.15em; }
p { margin: 0.6em 0; text-indent: 0; }
blockquote { margin: 0.8em 1.2em; padding: 0.4em 0.8em; border-left: 3px solid #ccc; color: #555; background: rgba(0,0,0,0.02); }
code { font-family: "Cascadia Code", "Source Code Pro", Consolas, monospace; font-size: 0.9em; padding: 0.1em 0.3em; background: rgba(0,0,0,0.06); border-radius: 3px; }
pre { padding: 0.8em; background: rgba(0,0,0,0.05); border-radius: 4px; overflow-x: auto; }
pre code { background: transparent; padding: 0; }
ul, ol { padding-left: 1.6em; }
li { margin: 0.3em 0; }
img { max-width: 100%; }
hr { border: 0; border-top: 1px solid #ddd; margin: 1.2em 0; }
table { border-collapse: collapse; margin: 0.8em 0; }
th, td { border: 1px solid #ccc; padding: 0.4em 0.8em; }
`

interface Chapter {
  /** 章节标题（用于 spine 与 nav） */
  title: string
  /** 章节文件名（不含 .md） */
  name: string
  /** 章节内容（HTML） */
  html: string
  /** 章节 xhtml 文件名（OEBPS/chapter_1.xhtml） */
  xhtmlFile: string
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 从 markdown 的首个 H1 标题中提取章节标题，否则用文件名。
 */
function extractTitle(markdown: string, fallback: string): string {
  const m = markdown.match(/^\s*#\s+(.+?)\s*$/m)
  if (m) return m[1].trim()
  return fallback
}

/**
 * 移除 markdown 文本开头的第一个 H1 标题行（仅去掉该行，前后空白一并吃掉）。
 * 章节模板里会用一个带样式的 <h1> 渲染标题，避免在 HTML 中出现两次 h1。
 */
function stripFirstH1(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+(\r?\n|$)/, '')
}

/**
 * 扫描目录，收集所有 .md 章节（递归；按路径排序）。
 */
function collectChapters(rootDir: string): Chapter[] {
  const result: { absPath: string; relNoExt: string; name: string; markdown: string }[] = []

  function walk(dir: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        // 跳过子目录中的非章节内容；如需支持嵌套章节，可在此处递归
        // 这里仅取根级 .md，结构更简单清晰
        continue
      }
      if (ent.isFile() && /\.(md|markdown)$/i.test(ent.name)) {
        try {
          const md = fs.readFileSync(abs, 'utf-8')
          const relNoExt = path.relative(rootDir, abs).replace(/\.(md|markdown)$/i, '')
          result.push({
            absPath: abs,
            relNoExt,
            name: ent.name.replace(/\.(md|markdown)$/i, ''),
            markdown: md,
          })
        } catch (err) {
          console.warn('[epubBuilder] 读取失败:', abs, err)
        }
      }
    }
  }

  walk(rootDir)

  // 按相对路径排序（同一目录下按文件名，跨目录按完整相对路径）
  result.sort((a, b) => a.relNoExt.localeCompare(b.relNoExt, 'zh-Hans-CN'))

  return result.map((c, i) => {
    const title = extractTitle(c.markdown, c.name)
    // 去掉第一个 H1（章节标题）后再转 HTML，避免在章节页里出现两次 h1
    const html = marked.parse(stripFirstH1(c.markdown), { async: false }) as string
    return {
      title,
      name: c.name,
      html,
      xhtmlFile: `chapter_${i + 1}.xhtml`,
    }
  })
}

/**
 * 扫描所有章节 HTML 中 .image/ 相对引用，收集图片元数据 + 替换 HTML 中的 src。
 * 返回：
 *   - images: 去重后的图片列表（含绝对路径、扩展名、MIME、buffer）
 *   - processedChapters: 每个章节的 HTML 已被替换 .image/xxx 为 images/xxx
 */
interface CollectedImage {
  /** 原始相对引用，如 ".image/img_xxx.png" */
  rel: string
  /** epub zip 内部文件名，如 "images/img_xxx.png" */
  zipFile: string
  /** manifest id */
  id: string
  /** MIME */
  mediaType: string
  /** 源绝对路径 */
  srcAbs: string
  /** 文件 buffer */
  buffer: Buffer
}

const IMG_EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
}

/** 把内联 base64 data URL 解析为扩展名 + buffer（用于把 md 里的 base64 图片提取成相对引用文件） */
function parseDataUrl(dataUrl: string): { ext: string; mediaType: string; buffer: Buffer } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  const mediaType = m[1].toLowerCase()
  const extEntry = Object.entries(IMG_EXT_TO_MIME).find(([, v]) => v === mediaType)
  const ext = extEntry ? extEntry[0] : '.png'
  try {
    return { ext, mediaType, buffer: Buffer.from(m[2], 'base64') }
  } catch {
    return null
  }
}

function processChapterImages(
  chapters: Chapter[],
  rootDir: string
): { images: CollectedImage[]; processedChapters: Chapter[] } {
  const imageMap = new Map<string, CollectedImage>() // rel -> CollectedImage
  const imageDir = path.join(rootDir, '.image')
  let dataCounter = 0 // 为内联 base64 图片生成唯一序号

  const collectImage = (rel: string): CollectedImage | null => {
    if (imageMap.has(rel)) return imageMap.get(rel)!
    const name = rel.startsWith('.image/') ? rel.slice('.image/'.length) : rel
    const srcAbs = path.join(imageDir, name)
    if (!fs.existsSync(srcAbs)) {
      console.warn(`[epubBuilder] 章节引用的图片不存在: ${srcAbs}`)
      return null
    }
    const ext = path.extname(name).toLowerCase()
    const mediaType = IMG_EXT_TO_MIME[ext]
    if (!mediaType) {
      console.warn(`[epubBuilder] 不支持的图片类型: ${ext}`)
      return null
    }
    let buffer: Buffer
    try {
      buffer = fs.readFileSync(srcAbs)
    } catch (err) {
      console.warn(`[epubBuilder] 读取图片失败: ${srcAbs}`, err)
      return null
    }
    // 保留原始文件名；若出现冲突时使用书内统一的 images/<name>
    const info: CollectedImage = {
      rel,
      zipFile: `images/${name}`,
      id: `img-${escapeId(name)}`,
      mediaType,
      srcAbs,
      buffer,
    }
    imageMap.set(rel, info)
    return info
  }

  // 匹配 <img src=".image/xxx.ext"> 中的相对引用
  const imgRe = /<img\s+[^>]*src="\.image\/([^"]+)"[^>]*>/g
  // 匹配 markdown 风格的 ![alt](.image/xxx.ext)（被 marked 转成 <img>）
  // marked 通常会渲染成 <img src="...">，但有些旧 md 可能还残留原始语法，做兜底
  const mdRe = /!\[[^\]]*\]\(\.image\/([^)\s]+)\)/g
  // 匹配内联 base64 图片（data:image/...;base64,...），提取成相对引用文件
  const dataImgRe = /<img\s+[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/g

  const processedChapters = chapters.map((c) => {
    let html = c.html
    // 替换 <img>
    html = html.replace(imgRe, (_match, name) => {
      const info = collectImage(`.image/${name}`)
      if (!info) return _match
      return _match.replace(`src=".image/${name}"`, `src="${info.zipFile}"`)
    })
    // 兜底：替换残留的 markdown 语法
    html = html.replace(mdRe, (_match, name) => {
      const info = collectImage(`.image/${name}`)
      if (!info) return _match
      return `![image](${info.zipFile})`
    })
    // 提取内联 base64 图片为相对引用（避免 epub 内嵌大段 base64）
    html = html.replace(dataImgRe, (_match, dataUrl: string) => {
      if (imageMap.has(dataUrl)) {
        return _match.replace(dataUrl, imageMap.get(dataUrl)!.zipFile)
      }
      const parsed = parseDataUrl(dataUrl)
      if (!parsed) return _match
      const baseName = `img_${++dataCounter}${parsed.ext}`
      const info: CollectedImage = {
        rel: dataUrl,
        zipFile: `images/${baseName}`,
        id: `img-${escapeId(baseName)}`,
        mediaType: parsed.mediaType,
        srcAbs: '',
        buffer: parsed.buffer,
      }
      imageMap.set(dataUrl, info)
      return _match.replace(dataUrl, info.zipFile)
    })
    return { ...c, html }
  })

  return { images: Array.from(imageMap.values()), processedChapters }
}

function buildContentOpf(opts: {
  title: string
  language: string
  chapters: Chapter[]
  uuid: string
  date: string
  cover?: CoverInfo | null
  images?: CollectedImage[]
}): string {
  const manifestItems = opts.chapters
    .map(
      (c) =>
        `    <item id="${escapeId(c.name)}" href="${c.xhtmlFile}" media-type="application/xhtml+xml"/>`
    )
    .join('\n')

  const spineItems = opts.chapters
    .map((c) => `    <itemref idref="${escapeId(c.name)}"/>`)
    .join('\n')

  const coverManifestItem = opts.cover
    ? `\n    <item id="${opts.cover.id}" href="${opts.cover.opfFile}" media-type="${opts.cover.mediaType}" properties="cover-image"/>`
    : ''

  const coverMeta = opts.cover
    ? `\n    <meta name="cover" content="${opts.cover.id}"/>`
    : ''

  const imageManifestItems = (opts.images || [])
    .map(
      (img) =>
        `    <item id="${img.id}" href="${img.zipFile}" media-type="${img.mediaType}"/>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${coverMeta}
    <dc:identifier id="bookid">urn:uuid:${opts.uuid}</dc:identifier>
    <dc:title>${htmlEscape(opts.title)}</dc:title>
    <dc:language>${opts.language}</dc:language>
    <meta property="dcterms:modified">${opts.date}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="stylesheet.css" media-type="text/css"/>${coverManifestItem}
${imageManifestItems}
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>
`
}

function buildNcx(opts: { title: string; chapters: Chapter[]; uuid: string }): string {
  const navPoints = opts.chapters
    .map(
      (c, i) => `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${htmlEscape(c.title)}</text></navLabel>
      <content src="${c.xhtmlFile}"/>
    </navPoint>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${opts.uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${htmlEscape(opts.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`
}

function buildNav(opts: { chapters: Chapter[] }): string {
  const items = opts.chapters
    .map((c) => `      <li><a href="${c.xhtmlFile}">${htmlEscape(c.title)}</a></li>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>目录</title>
    <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>目录</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>
`
}

function buildChapterXhtml(opts: { chapter: Chapter; cssHref: string }): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${htmlEscape(opts.chapter.title)}</title>
    <link rel="stylesheet" type="text/css" href="${opts.cssHref}"/>
  </head>
  <body>
    <h1>${htmlEscape(opts.chapter.title)}</h1>
${opts.chapter.html}
  </body>
</html>
`
}

function escapeId(s: string): string {
  // ncx / opf 中 id 不能含特殊字符；做保守处理
  return s.replace(/[^A-Za-z0-9_\-]/g, '_')
}

function makeUuid(): string {
  // 不依赖外部包，生成 RFC4122 v4
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  )
}

function makeOpfDate(): string {
  // EPUB 要求 ISO 8601 with seconds, Z timezone: 2024-05-12T08:30:00Z
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * 主入口：构建 epub 缓冲区。
 */
export function buildEpubFromDir(rootDir: string): { buffer: Buffer; defaultFileName: string; chapterCount: number } {
  const chapters = collectChapters(rootDir)
  if (chapters.length === 0) {
    throw new Error('epub 目录下没有 .md 章节文件')
  }

  // 书名：取 epub 目录的父目录名（项目名），更具语义
  const projectName = path.basename(path.dirname(rootDir)) || '未命名书籍'
  const title = projectName
  const uuid = makeUuid()
  const date = makeOpfDate()

  // 查找封面（.image/cover.<ext>）
  const cover = findCover(rootDir)

  // 扫描所有章节的图片引用 → 复制到 OEBPS/images/ → 替换 HTML 中的 src
  const { images, processedChapters } = processChapterImages(chapters, rootDir)

  const zip = new AdmZip()

  // 1. mimetype 必须无压缩，且为 zip 的第一个条目
  zip.addFile('mimetype', Buffer.from(MIME_TYPE, 'utf-8'), '', 0)

  // 2. META-INF
  zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER_XML, 'utf-8'))

  // 3. OEBPS 内容
  zip.addFile('OEBPS/stylesheet.css', Buffer.from(STYLESHEET_CSS, 'utf-8'))
  zip.addFile('OEBPS/content.opf', Buffer.from(
    buildContentOpf({ title, language: 'zh-CN', chapters: processedChapters, uuid, date, cover, images }), 'utf-8'))
  zip.addFile('OEBPS/toc.ncx', Buffer.from(
    buildNcx({ title, chapters: processedChapters, uuid }), 'utf-8'))
  zip.addFile('OEBPS/nav.xhtml', Buffer.from(
    buildNav({ chapters: processedChapters }), 'utf-8'))

  // 封面
  if (cover) {
    zip.addFile(`OEBPS/${cover.opfFile}`, cover.buffer)
  }

  // 章节图片
  for (const img of images) {
    zip.addFile(`OEBPS/${img.zipFile}`, img.buffer)
  }

  for (const c of processedChapters) {
    zip.addFile(`OEBPS/${c.xhtmlFile}`, Buffer.from(
      buildChapterXhtml({ chapter: c, cssHref: 'stylesheet.css' }), 'utf-8'))
  }

  return {
    buffer: zip.toBuffer(),
    defaultFileName: `${projectName}.epub`,
    chapterCount: chapters.length,
  }
}

interface CoverInfo {
  /** zip 内文件名，如 "cover.jpg" */
  opfFile: string
  /** EPUB manifest 中的 id */
  id: string
  /** MIME 类型 */
  mediaType: string
  /** 原始文件 buffer */
  buffer: Buffer
}

const COVER_EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/**
 * 在 epub 目录的 .image 子目录中查找 cover.* 文件。
 */
function findCover(rootDir: string): CoverInfo | null {
  const imageDir = path.join(rootDir, '.image')
  if (!fs.existsSync(imageDir)) return null
  let entries: string[]
  try {
    entries = fs.readdirSync(imageDir)
  } catch {
    return null
  }
  const coverFile = entries.find((f) => /^cover\./i.test(f))
  if (!coverFile) return null
  const ext = path.extname(coverFile).toLowerCase()
  const mediaType = COVER_EXT_TO_MIME[ext]
  if (!mediaType) return null
  try {
    const buffer = fs.readFileSync(path.join(imageDir, coverFile))
    return {
      opfFile: `cover-image${ext}`,
      id: 'cover-image',
      mediaType,
      buffer,
    }
  } catch {
    return null
  }
}
