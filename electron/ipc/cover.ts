/**
 * 封面相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { wrapHandler } from '../errorHandler'
import { COVERS_DIR, ensureDir } from '../config'

/**
 * 从 EPUB 的 OPF 元数据中解析封面图片路径
 */
function findCoverFromOpf(
  entries: any[],
  entryMap: Map<string, any>
): string | null {
  // 1. 从 container.xml 找到 OPF 路径
  let opfPath = ''
  const containerEntry = entryMap.get('META-INF/container.xml')
  if (containerEntry) {
    const containerXml = containerEntry.getData().toString('utf-8')
    const rootfileMatch = containerXml.match(/full-path\s*=\s*["']([^"']+)["']/i)
    if (rootfileMatch) {
      opfPath = rootfileMatch[1]
    }
  }

  // 2. 如果没找到 container.xml，尝试常见路径
  if (!opfPath) {
    const candidates = [
      'content.opf', 'OEBPS/content.opf', 'OPS/content.opf',
      'OEB/content.opf', 'EPUB/content.opf', 'Standard/content.opf',
    ]
    for (const c of candidates) {
      if (entryMap.has(c)) { opfPath = c; break }
    }
  }
  if (!opfPath) return null

  const opfEntry = entryMap.get(opfPath)
  if (!opfEntry) return null

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''
  const opfXml = opfEntry.getData().toString('utf-8')

  // === 方法 1: <meta name="cover" content="imageId" /> (EPUB2 标准) ===
  const coverMetaMatch = opfXml.match(/<meta\s+[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    || opfXml.match(/<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']cover["']/i)

  if (coverMetaMatch) {
    const coverId = coverMetaMatch[1]
    const idItemMatch = opfXml.match(
      new RegExp(`<item\\s+[^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, 'i')
    ) || opfXml.match(
      new RegExp(`<item\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["']`, 'i')
    )
    if (idItemMatch) {
      return resolveHref(opfDir, idItemMatch[1])
    }
    if (isImagePath(coverId)) {
      return resolveHref(opfDir, coverId)
    }
  }

  // === 方法 2: <meta name="Cover ThumbNail Image" content="path" /> ===
  const thumbMatch = opfXml.match(/<meta\s+[^>]*name\s*=\s*["']Cover\s+ThumbNail\s+Image["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    || opfXml.match(/<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']Cover\s+ThumbNail\s+Image["']/i)
  if (thumbMatch && isImagePath(thumbMatch[1])) {
    return resolveHref(opfDir, thumbMatch[1])
  }

  // === 方法 3: <item ... properties="cover-image" /> (EPUB3 标准) ===
  const epub3CoverMatch = opfXml.match(/<item\s+[^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']/i)
    || opfXml.match(/<item\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["']/i)
  if (epub3CoverMatch) {
    return resolveHref(opfDir, epub3CoverMatch[1])
  }

  // === 方法 4: <item id="cover-image" .../> 或 <item id="cover" .../> ===
  const coverIdPatterns = ['cover-image', 'cover', 'CoverImage', 'coverimage', 'front-cover-image']
  for (const idPat of coverIdPatterns) {
    const idMatch = opfXml.match(
      new RegExp(`<item\\s+[^>]*id\\s*=\\s*["']${idPat}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, 'i')
    ) || opfXml.match(
      new RegExp(`<item\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*id\\s*=\\s*["']${idPat}["']`, 'i')
    )
    if (idMatch) {
      const href = resolveHref(opfDir, idMatch[1])
      if (isImagePath(href)) return href
    }
  }

  // === 方法 5: 在 manifest 中找任何 id/文件名含 cover 的图片 ===
  const itemRegex = /<item\s+[^>]*(?:id|href)\s*=\s*["'][^"']*cover[^"']*["'][^>]*(?:href|id)\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(opfXml)) !== null) {
    if (isImagePath(m[1])) {
      return resolveHref(opfDir, m[1])
    }
  }

  return null
}

function resolveHref(opfDir: string, href: string): string {
  href = decodeURIComponent(href)
  if (!opfDir) return href
  const parts = (opfDir + href).split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.' && part !== '') resolved.push(part)
  }
  return resolved.join('/')
}

function isImagePath(p: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(p)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function registerCoverHandlers(): void {
  ipcMain.handle('cover:save', wrapHandler((_event, bookId: string, base64DataUrl: string) => {
    ensureDir(COVERS_DIR)
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64DataUrl)
    if (!matches) return null
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const filePath = path.join(COVERS_DIR, bookId + '.' + ext)
    fs.writeFileSync(filePath, base64DataUrl.substring(matches[0].length), { encoding: 'base64' })
    return filePath
  }, 'cover:save'))

  ipcMain.handle('cover:delete', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(COVERS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch (err) {
      console.error('cover:delete error:', err)
    }
  }, 'cover:delete'))

  ipcMain.handle('cover:exists', wrapHandler((_event, filePath: string) => {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }, 'cover:exists'))

  ipcMain.handle('cover:findEpubCover', wrapHandler((_event, bookId: string, filePath: string) => {
    try {
      ensureDir(COVERS_DIR)
      const zip = new AdmZip(filePath)
      const entries = zip.getEntries()
      const entryMap = new Map(entries.map(e => [e.entryName, e]))

      // === 策略 1: 解析 OPF 元数据找到封面引用 ===
      const coverPath = findCoverFromOpf(entries, entryMap)
      if (coverPath) {
        const entry = entryMap.get(coverPath)
        if (entry) {
          const ext = path.extname(coverPath).toLowerCase()
          const saveExt = ext === '.jpeg' ? '.jpg' : ext || '.jpg'
          const destPath = path.join(COVERS_DIR, bookId + saveExt)
          fs.writeFileSync(destPath, entry.getData())
          return destPath
        }
      }

      // === 策略 2: 按文件名匹配封面（兜底） ===
      const imgExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
      const isImage = (n: string) => imgExts.has(path.extname(n).toLowerCase())
      const isCoverName = (n: string) => {
        const lower = n.toLowerCase()
        return lower.includes('cover') || lower.includes('front') || lower.includes('conver')
      }

      const best = entries
        .filter(e => !e.isDirectory && isImage(e.entryName) && isCoverName(e.entryName))
        .sort((a, b) => b.header.size - a.header.size)[0]

      if (best) {
        const ext = path.extname(best.entryName).toLowerCase()
        const saveExt = ext === '.jpeg' ? '.jpg' : ext || '.jpg'
        const destPath = path.join(COVERS_DIR, bookId + saveExt)
        fs.writeFileSync(destPath, best.getData())
        return destPath
      }

      return null
    } catch {
      return null
    }
  }, 'cover:findEpubCover'))
}
