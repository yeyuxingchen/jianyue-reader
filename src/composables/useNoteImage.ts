/**
 * 章节图片双向转换工具
 * 
 * 章节 markdown 源使用相对引用：![alt](.image/<filename>)
 * 但浏览器/编辑器无法解析相对路径，所以渲染时替换为 chimg:// 协议 URL
 * （chimg 在主进程里映射到 file://，避开 webSecurity 限制）
 * 保存时再还原为相对路径。
 */

import { ref } from 'vue'

// imageSrcMap: 相对路径 -> chimg:// 协议 URL
const imageSrcMap = new Map<string, string>()

// 当前章节在主进程注册表里的 id（chimg://<id>/... 用），避免把路径塞进 URL 被改写
export const currentChapterId = ref<string | null>(null)

/** 打开章节时把目录注册到主进程，拿到稳定 id；同一目录复用同一 id */
export async function ensureChapterRegistered(chapterDir: string) {
  try {
    const id = await window.services?.registerChapterDir?.(chapterDir)
    currentChapterId.value = id || null
  } catch {
    currentChapterId.value = null
  }
}

/** 将 markdown 中 .image/... 引用替换为 chimg:// URL，给编辑器用 */
export function expandChapterImageSrcs(md: string): string {
  if (imageSrcMap.size === 0) return md
  let result = md
  for (const [rel, abs] of imageSrcMap) {
    // 同时覆盖 ![alt](rel) 和 <img src="rel"> 两种形式
    result = result.split(`(${rel})`).join(`(${abs})`)
    result = result.split(`src="${rel}"`).join(`src="${abs}"`)
  }
  return result
}

/** 将 markdown 中 chimg:// 协议 URL 还原为 .image/... 相对引用，给磁盘用 */
export function collapseChapterImageSrcs(md: string): string {
  if (imageSrcMap.size === 0) return md
  let result = md
  for (const [rel, abs] of imageSrcMap) {
    result = result.split(`(${abs})`).join(`(${rel})`)
    result = result.split(`src="${abs}"`).join(`src="${rel}"`)
  }
  return result
}

/** 当前文件是否位于某个 epub 目录下（章节文件） */
export function isChapterFile(filePath: string | null, rootPath: string | null): boolean {
  if (!filePath || !rootPath) return false
  // 路径前缀匹配（兼容 / 与 \）
  const curNorm = filePath.replace(/\\/g, '/')
  const rootNorm = (rootPath + '/').replace(/\\/g, '/')
  return curNorm.startsWith(rootNorm)
}

/** 取得当前章节所在目录（epub 根目录），用于存图片 */
export function getChapterDir(filePath: string | null, rootPath: string | null): string | null {
  if (!filePath || !rootPath) return null
  const curNorm = filePath.replace(/\\/g, '/')
  const rootNorm = (rootPath + '/').replace(/\\/g, '/')
  if (!curNorm.startsWith(rootNorm)) return null
  return rootPath
}

/** 注册一张图片到映射表（重复注册会覆盖） */
export function registerChapterImage(rel: string, abs: string) {
  imageSrcMap.set(rel, abs)
}

/** 清空映射表（切换文件时调用） */
export function clearChapterImages() {
  imageSrcMap.clear()
}

/** 把章节 .image/<name> 拼成 chimg://<id> 协议 URL（id 由主进程注册返回，映射到真实目录） */
export function fileUrlForChapter(name: string): string | null {
  const id = currentChapterId.value
  if (!id) return null
  return `chimg://${id}/.image/${name}`
}

/**
 * 扫描 markdown 中的 .image/<name> 引用，重建映射。
 * 仅在打开章节时调用，避免误把用户自己写的相对路径吞了。
 */
export function rebuildChapterImageMap(md: string) {
  imageSrcMap.clear()
  // 匹配 ![alt](.image/xxx.ext) 和 <img src=".image/xxx.ext">
  const reMd = /!\[[^\]]*\]\(\.image\/([^)\s]+)\)/g
  const reHtml = /<img[^>]+src="\.image\/([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = reMd.exec(md)) !== null) {
    const rel = `.image/${m[1]}`
    if (imageSrcMap.has(rel)) continue
    const abs = fileUrlForChapter(m[1])
    if (abs) imageSrcMap.set(rel, abs)
  }
  while ((m = reHtml.exec(md)) !== null) {
    const rel = `.image/${m[1]}`
    if (imageSrcMap.has(rel)) continue
    const abs = fileUrlForChapter(m[1])
    if (abs) imageSrcMap.set(rel, abs)
  }
}

/**
 * 往当前章节插入一张图片。
 * - 自动检测是否在章节文件
 * - 非章节：走老的全局缓存流程
 * - 章节：存到 <chapterDir>/.image/，用相对引用，编辑器内展开为 file://
 * - 返回 { src, markdown }：src 是编辑器用的可渲染 URL，markdown 是要写进文档的语法
 */
export async function insertImageForCurrentFile(opts: {
  /** 从 base64 dataURL 插入（粘贴/拖拽） */
  base64DataUrl?: string
  /** 从本地文件路径插入（工具栏选图） */
  sourceFilePath?: string
  /** 当前文件路径 */
  filePath?: string | null
  /** 文件树根目录 */
  rootPath?: string | null
}): Promise<{ src: string; markdown: string } | null> {
  const chapterDir = getChapterDir(opts.filePath || null, opts.rootPath || null)
  if (chapterDir) {
    // 章节模式：存到 .image/，返回相对引用
    let result: { filePath: string; relativePath: string } | null = null
    if (opts.base64DataUrl) {
      result = await window.services?.saveChapterImage?.(chapterDir, opts.base64DataUrl)
    } else if (opts.sourceFilePath) {
      result = await window.services?.saveChapterImageFromFile?.(chapterDir, opts.sourceFilePath)
    }
    if (!result) return null
    // 确保目录已注册（拿到 chimg 用的 id），再拼可渲染 URL
    await ensureChapterRegistered(chapterDir)
    const absUrl = fileUrlForChapter(result.relativePath.slice('.image/'.length))
    if (absUrl) registerChapterImage(result.relativePath, absUrl)
    return {
      src: absUrl || result.relativePath,
      markdown: `![image](${result.relativePath})`,
    }
  }
  // 非章节：老的全局缓存流程
  if (opts.base64DataUrl) {
    const r = await window.services?.saveImageToCache?.(opts.base64DataUrl)
    if (!r) return null
    return {
      src: `cacheimg://${r.relativePath}`,
      markdown: `![image](cacheimg://${r.relativePath})`,
    }
  }
  return null
}
