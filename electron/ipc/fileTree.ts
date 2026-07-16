/**
 * 文件目录相关 IPC 处理器
 * 用于简记模式下的"文件目录"面板：
 *   - 扫描目录树（只展示 .md 文件与目录）
 *   - 创建章节（.md 文件）
 *   - 创建目录
 *   - 重命名文件 / 目录
 *   - 创建 epub 目录（特殊目录，用于最终打包 epub）
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { isPathAllowed, addAuthorizedDir } from '../security'
import { ensureDir } from '../config'
import { wrapHandler } from '../errorHandler'
import { buildEpubFromDir } from '../epubBuilder'

export interface FileNode {
  /** 节点名（章节为不含 .md 的名称；目录为目录名） */
  name: string
  /** 类型：chapter=md 文件，directory=普通目录，epub=epub 目录 */
  type: 'chapter' | 'directory' | 'epub'
  /** 绝对路径 */
  path: string
  /** 子节点（仅目录） */
  children?: FileNode[]
}

const HIDDEN_PREFIX = '.'
const MAX_DEPTH = 10

/**
 * 递归扫描目录，生成 FileNode 树。
 * 仅列出 .md 文件与子目录；隐藏目录（以 . 开头）跳过。
 */
function scanTree(dirPath: string, depth: number = 0): FileNode[] {
  if (depth > MAX_DEPTH) return []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }

  const result: FileNode[] = []

  // 先目录后文件；同名排序
  const dirs: fs.Dirent[] = []
  const files: fs.Dirent[] = []
  for (const e of entries) {
    if (e.name.startsWith(HIDDEN_PREFIX)) continue
    if (e.isDirectory()) {
      dirs.push(e)
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      files.push(e)
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))

  for (const dir of dirs) {
    const fullPath = path.join(dirPath, dir.name)
    const children = scanTree(fullPath, depth + 1)
    const isEpub = dir.name === 'epub'
    result.push({
      name: dir.name,
      type: isEpub ? 'epub' : 'directory',
      path: fullPath,
      children,
    })
  }

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name)
    const name = file.name.replace(/\.md$/i, '')
    result.push({
      name,
      type: 'chapter',
      path: fullPath,
    })
  }

  return result
}

export function registerFileTreeHandlers(): void {
  /**
   * 扫描指定目录，列出其中的 .md 文件与子目录（递归）。
   * 自动授权该目录（用户主动选择，视为已授权）。
   */
  ipcMain.handle('fs:scanFileTree', wrapHandler((_event, rootPath: string) => {
    if (!rootPath) return []
    const validPath = path.resolve(rootPath)
    if (!fs.existsSync(validPath) || !fs.statSync(validPath).isDirectory()) {
      return []
    }
    if (!isPathAllowed(validPath)) {
      // 静默拒绝，避免对未授权目录扫描
      return []
    }
    addAuthorizedDir(validPath)
    return scanTree(validPath, 0)
  }, 'fs:scanFileTree'))

  /**
   * 在父目录下创建新章节（空 .md 文件）。
   * @param parentDir 父目录绝对路径
   * @param name 章节名（不含 .md 后缀）
   */
  ipcMain.handle('fs:createChapter', wrapHandler((_event, parentDir: string, name: string) => {
    const cleanName = (name || '').trim().replace(/[\\/:*?"<>|]/g, '_')
    if (!cleanName) return null
    const dir = path.resolve(parentDir)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error('父目录不存在')
    }
    if (!isPathAllowed(dir)) {
      throw new Error('父目录未被授权')
    }
    addAuthorizedDir(dir)
    const filePath = path.join(dir, `${cleanName}.md`)
    if (fs.existsSync(filePath)) {
      throw new Error('文件已存在')
    }
    // 默认带一个 # 标题，方便用户继续编辑
    const content = `# ${cleanName}\n\n`
    fs.writeFileSync(filePath, content, { encoding: 'utf-8' })
    return { name: cleanName, path: filePath, type: 'chapter' }
  }, 'fs:createChapter'))

  /**
   * 在父目录下创建新目录。
   * @param parentDir 父目录绝对路径
   * @param name 目录名
   */
  ipcMain.handle('fs:createDirectory', wrapHandler((_event, parentDir: string, name: string) => {
    const cleanName = (name || '').trim().replace(/[\\/:*?"<>|]/g, '_')
    if (!cleanName) return null
    const dir = path.resolve(parentDir)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error('父目录不存在')
    }
    if (!isPathAllowed(dir)) {
      throw new Error('父目录未被授权')
    }
    addAuthorizedDir(dir)
    const targetPath = path.join(dir, cleanName)
    if (fs.existsSync(targetPath)) {
      throw new Error('目录已存在')
    }
    ensureDir(targetPath)
    const isEpub = cleanName === 'epub'
    return { name: cleanName, path: targetPath, type: isEpub ? 'epub' : 'directory' }
  }, 'fs:createDirectory'))

  /**
   * 重命名文件 / 目录。
   * - 章节：name 不含 .md
   * - 目录：name 为目录名
   * 保留扩展名（章节）和原父目录。
   */
  ipcMain.handle('fs:renameNode', wrapHandler((_event, oldPath: string, newName: string) => {
    const cleanName = (newName || '').trim().replace(/[\\/:*?"<>|]/g, '_')
    if (!cleanName) return null
    const src = path.resolve(oldPath)
    if (!fs.existsSync(src)) {
      throw new Error('原路径不存在')
    }
    if (!isPathAllowed(src)) {
      throw new Error('原路径未被授权')
    }
    const stat = fs.statSync(src)
    const isDir = stat.isDirectory()
    const isFile = stat.isFile()
    if (!isDir && !isFile) {
      throw new Error('无法识别的路径类型')
    }
    const parent = path.dirname(src)
    addAuthorizedDir(parent)
    // 章节保留 .md 扩展名
    const finalName = isFile && src.toLowerCase().endsWith('.md') && !cleanName.toLowerCase().endsWith('.md')
      ? `${cleanName}.md`
      : cleanName
    const dest = path.join(parent, finalName)
    if (dest === src) return { name: path.basename(src, path.extname(src)), path: dest, type: isDir ? 'directory' : 'chapter' }
    if (fs.existsSync(dest)) {
      throw new Error('目标已存在')
    }
    fs.renameSync(src, dest)
    const isEpub = isDir && finalName === 'epub'
    return {
      name: isFile ? path.basename(finalName, path.extname(finalName)) : finalName,
      path: dest,
      type: isEpub ? 'epub' : (isDir ? 'directory' : 'chapter'),
    }
  }, 'fs:renameNode'))

  /**
   * 在指定父目录下创建名为 "epub" 的特殊目录。
   * 若已存在同名目录则抛出错误。
   */
  ipcMain.handle('fs:createEpubDirectory', wrapHandler((_event, parentDir: string) => {
    const dir = path.resolve(parentDir)
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error('父目录不存在')
    }
    if (!isPathAllowed(dir)) {
      throw new Error('父目录未被授权')
    }
    addAuthorizedDir(dir)
    const target = path.join(dir, 'epub')
    if (fs.existsSync(target)) {
      throw new Error('已存在 epub 目录')
    }
    ensureDir(target)
    return { name: 'epub', path: target, type: 'epub' }
  }, 'fs:createEpubDirectory'))

  /**
   * 判断路径是否存在（且是目录）。
   */
  ipcMain.handle('fs:pathExists', wrapHandler((_event, p: string) => {
    if (!p) return false
    try {
      const resolved = path.resolve(p)
      if (!isPathAllowed(resolved)) return false
      return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    } catch {
      return false
    }
  }, 'fs:pathExists'))

  /**
   * 从 epub 目录导出 epub 文件。
   * 1. 读取目录下所有 .md 章节
   * 2. 转 HTML 并打包成 epub
   * 3. 弹出系统保存对话框
   * 4. 写入用户选择的位置
   * 返回最终保存的路径，取消则返回 null。
   */
  ipcMain.handle('epub:exportFromDir', wrapHandler(async (event, dirPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const resolved = path.resolve(dirPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error('epub 目录不存在')
    }
    if (!isPathAllowed(resolved)) {
      throw new Error('epub 目录未被授权')
    }

    // 构建 epub
    const { buffer, defaultFileName, chapterCount } = buildEpubFromDir(resolved)

    // 弹保存对话框，默认文件名取项目父目录名
    const saveResult = await dialog.showSaveDialog(win, {
      title: '导出 epub',
      defaultPath: defaultFileName,
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return null

    // 授权目标位置
    const saveDir = path.dirname(saveResult.filePath)
    if (fs.existsSync(saveDir)) {
      addAuthorizedDir(saveDir)
    }

    await fs.promises.writeFile(saveResult.filePath, buffer)
    return {
      filePath: saveResult.filePath,
      fileName: path.basename(saveResult.filePath),
      size: buffer.length,
      chapterCount,
    }
  }, 'epub:exportFromDir'))

  /**
   * 为 epub 目录设置封面。
   * 1. 弹出系统图片选择对话框
   * 2. 复制选中图片到 <epubDir>/.image/cover.<ext>（已存在则覆盖）
   * 3. 返回封面绝对路径；用户取消则返回 null
   */
  ipcMain.handle('epub:setCover', wrapHandler(async (event, dirPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const resolved = path.resolve(dirPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error('epub 目录不存在')
    }
    if (!isPathAllowed(resolved)) {
      throw new Error('epub 目录未被授权')
    }

    const pickResult = await dialog.showOpenDialog(win, {
      title: '选择封面图片',
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      ],
      properties: ['openFile'],
    })
    if (pickResult.canceled || pickResult.filePaths.length === 0) return null

    const imagePath = pickResult.filePaths[0]
    const ext = path.extname(imagePath) || '.jpg'

    const imageDir = path.join(resolved, '.image')
    ensureDir(imageDir)
    addAuthorizedDir(imageDir)

    // 统一命名为 cover.<ext>，已存在则替换
    const coverPath = path.join(imageDir, `cover${ext}`)
    // 若新扩展名与旧的不同，先清掉旧的 cover.* 避免遗留
    try {
      const oldFiles = fs.readdirSync(imageDir)
      for (const f of oldFiles) {
        if (/^cover\./i.test(f) && f !== `cover${ext}`) {
          try { fs.unlinkSync(path.join(imageDir, f)) } catch { /* 忽略 */ }
        }
      }
    } catch { /* 忽略 */ }

    fs.writeFileSync(coverPath, fs.readFileSync(imagePath))
    return { coverPath }
  }, 'epub:setCover'))

  /**
   * 获取 epub 目录的封面路径（若存在）。
   * 扫描 <epubDir>/.image/cover.*，找到第一个即返回。
   */
  ipcMain.handle('epub:getCover', wrapHandler((_event, dirPath: string) => {
    const resolved = path.resolve(dirPath)
    if (!isPathAllowed(resolved)) return null
    const imageDir = path.join(resolved, '.image')
    if (!fs.existsSync(imageDir)) return null
    let entries: string[]
    try {
      entries = fs.readdirSync(imageDir)
    } catch {
      return null
    }
    const coverFile = entries.find((f) => /^cover\./i.test(f))
    if (!coverFile) return null
    return { coverPath: path.join(imageDir, coverFile) }
  }, 'epub:getCover'))

  /**
   * 为当前章节插入一张图片。
   * 1. 解析 base64
   * 2. 在 <dirPath>/.image/ 下生成唯一文件名
   * 3. 写文件
   * 4. 返回 { filePath, relativePath: '.image/<filename>' }
   * 章节 markdown 用相对引用即可，导出时再把 .image/* 拷进 epub。
   */
  ipcMain.handle('epub:saveChapterImage', wrapHandler((_event, dirPath: string, base64DataUrl: string) => {
    const resolved = path.resolve(dirPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error('目录不存在')
    }
    if (!isPathAllowed(resolved)) {
      throw new Error('目录未被授权')
    }
    const matches = /^data:image\/([a-z0-9+]+);base64,/i.exec(base64DataUrl)
    if (!matches) throw new Error('不是有效的图片 base64')
    const ext = matches[1].replace('jpeg', 'jpg')

    const imageDir = path.join(resolved, '.image')
    ensureDir(imageDir)
    addAuthorizedDir(imageDir)

    const fileName = generateUniqueImageName(imageDir, ext)
    const filePath = path.join(imageDir, fileName)
    const base64Data = base64DataUrl.substring(base64DataUrl.indexOf(',') + 1)
    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })

    return {
      filePath,
      relativePath: `.image/${fileName}`,
    }
  }, 'epub:saveChapterImage'))

  /**
   * 从本地文件复制图片到 .image/ 下（用于工具栏"插入图片"选择本地文件）。
   */
  ipcMain.handle('epub:saveChapterImageFromFile', wrapHandler((_event, dirPath: string, sourcePath: string) => {
    const resolved = path.resolve(dirPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error('目录不存在')
    }
    if (!isPathAllowed(resolved)) throw new Error('目录未被授权')

    const src = path.resolve(sourcePath)
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) {
      throw new Error('源文件不存在')
    }
    if (!isPathAllowed(src)) throw new Error('源文件未被授权')

    const ext = path.extname(src) || '.png'
    const imageDir = path.join(resolved, '.image')
    ensureDir(imageDir)
    addAuthorizedDir(imageDir)

    const fileName = generateUniqueImageName(imageDir, ext)
    const filePath = path.join(imageDir, fileName)
    fs.copyFileSync(src, filePath)

    return {
      filePath,
      relativePath: `.image/${fileName}`,
    }
  }, 'epub:saveChapterImageFromFile'))
}

/**
 * 在目标目录中生成一个不会与现有文件冲突的图片名。
 * 形如：img_HHmmss_XXXX.<ext>
 */
function generateUniqueImageName(dir: string, ext: string): string {
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`
  const now = new Date()
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  // 时间戳 + 4 位随机数，撞名时再追加 4 位
  let rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  let fileName = `img_${timePart}_${rand}${cleanExt}`
  while (fs.existsSync(path.join(dir, fileName))) {
    rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    fileName = `img_${timePart}_${rand}${cleanExt}`
  }
  return fileName
}
