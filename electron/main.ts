import { app, BrowserWindow, ipcMain, dialog, screen, shell, clipboard, protocol, net } from 'electron'
import { join } from 'path'
import fs from 'node:fs'
import path from 'node:path'
import Store from 'electron-store'
import AdmZip from 'adm-zip'

// electron-store 实例
let store: any = null

function getStore() {
  if (!store) {
    store = new Store({
      name: 'jianyue-reader',
      cwd: app.getPath('userData'),
    })
  }
  return store
}

// 数据目录
const BASE_DIR = join(app.getPath('userData'), 'jianyue-reader')
const COVERS_DIR = join(BASE_DIR, 'covers')
const BOOKS_DIR = join(BASE_DIR, 'books')
const FONTS_DIR = join(BASE_DIR, 'fonts')
const AI_CACHE_DIR = join(BASE_DIR, 'ai-cache')
const IMAGES_DIR = join(BASE_DIR, 'images')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 从 EPUB 的 OPF 元数据中解析封面图片路径
 * 支持以下封面引用格式：
 * 1. <meta name="cover" content="imageId" /> → 通过 id 在 manifest 中查找
 * 2. <meta name="Cover ThumbNail Image" content="path/to/image" /> → 直接路径
 * 3. <item ... properties="cover-image"/> → EPUB3 风格
 * 4. <item id="cover-image" .../> / <item id="cover" .../> → id 匹配
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
    // 匹配 full-path 属性，如 full-path="OEBPS/content.opf"
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
  // content 属性指向 manifest 中某个 item 的 id
  const coverMetaMatch = opfXml.match(/<meta\s+[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    || opfXml.match(/<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']cover["']/i)

  if (coverMetaMatch) {
    const coverId = coverMetaMatch[1]
    // 尝试在 manifest 中按 id 查找
    const idItemMatch = opfXml.match(
      new RegExp(`<item\\s+[^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, 'i')
    ) || opfXml.match(
      new RegExp(`<item\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*id\\s*=\\s*["']${escapeRegExp(coverId)}["']`, 'i')
    )
    if (idItemMatch) {
      return resolveHref(opfDir, idItemMatch[1])
    }
    // coverId 本身可能就是文件路径（某些 EPUB 格式）
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
  // URL 解码
  href = decodeURIComponent(href)
  // 如果是绝对路径直接返回
  if (!opfDir) return href
  // 处理 ../
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

// 初始化目录
function initDirs() {
  ensureDir(BASE_DIR)
  ensureDir(COVERS_DIR)
  ensureDir(BOOKS_DIR)
  ensureDir(FONTS_DIR)
  ensureDir(AI_CACHE_DIR)
}

let mainWindow: BrowserWindow | null = null
let floatReaderWin: BrowserWindow | null = null
let floatReaderReturnToMain: boolean = true

let floatNoteWin: BrowserWindow | null = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // 开发模式加载本地服务器，生产模式加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    // 关闭浮动窗口
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close()
    }
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close()
    }
  })
}

// 注册 IPC 处理器
function registerIpcHandlers() {
  // ===== electron-store 键值存储 =====
  ipcMain.handle('store:get', (_event, key: string) => {
    const s = getStore()
    return s.get(key)
  })

  ipcMain.handle('store:set', (_event, key: string, value: any) => {
    const s = getStore()
    s.set(key, value)
  })

  // ===== 文件系统操作 =====
  ipcMain.handle('fs:readFileAsBuffer', (_event, filePath: string) => {
    const buffer = fs.readFileSync(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  ipcMain.handle('fs:readFileAsText', (_event, filePath: string) => {
    return fs.readFileSync(filePath, { encoding: 'utf-8' })
  })

  ipcMain.handle('fs:checkFileExists', (_event, filePath: string) => {
    try {
      fs.accessSync(filePath, fs.constants.R_OK)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:getFileName', (_event, filePath: string) => {
    return path.basename(filePath)
  })

  ipcMain.handle('fs:getFileSize', (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath)
      return stat.size
    } catch {
      return 0
    }
  })

  // ===== 文件对话框 =====
  ipcMain.handle('dialog:showFilePicker', async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择电子书',
      filters: [
        { name: '电子书', extensions: ['epub', 'txt', 'mobi', 'azw3', 'cbz', 'cbr'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? undefined : result.filePaths
  })

  ipcMain.handle('dialog:showNoteFilePicker', async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '打开 Markdown 文件',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: '纯文本', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result.canceled ? undefined : result.filePaths
  })

  ipcMain.handle('dialog:showImagePicker', async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择封面图片',
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result.canceled ? undefined : result.filePaths
  })

  ipcMain.handle('dialog:showFontPicker', async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择字体文件',
      filters: [
        { name: '字体文件', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? undefined : result.filePaths
  })

  ipcMain.handle('dialog:saveFile', async (_event, defaultName: string, data: string | Buffer) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存位置',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const savePath = path.join(result.filePaths[0], defaultName)
    fs.writeFileSync(savePath, data, typeof data === 'string' ? { encoding: 'utf-8' } : undefined)
    return savePath
  })

  // ===== 文件写入 =====
  ipcMain.handle('fs:writeTextFile', (_event, text: string) => {
    const filePath = join(app.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  })

  ipcMain.handle('fs:writeImageFile', (_event, base64Url: string) => {
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matches) return undefined
    const filePath = join(app.getPath('downloads'), Date.now().toString() + '.' + matches[1])
    fs.writeFileSync(filePath, base64Url.substring(matches[0].length), { encoding: 'base64' })
    return filePath
  })

  // ===== 书籍缓存管理 =====
  ipcMain.handle('book:copyToCache', (_event, bookId: string, srcPath: string) => {
    ensureDir(BOOKS_DIR)
    const ext = path.extname(srcPath) || '.epub'
    const destPath = join(BOOKS_DIR, bookId + ext)
    fs.copyFileSync(srcPath, destPath)
    return destPath
  })

  ipcMain.handle('book:deleteCached', (_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(BOOKS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch {}
  })

  ipcMain.handle('book:cachedExists', (_event, filePath: string) => {
    try {
      if (!filePath) return false
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  })

  // ===== 封面管理 =====
  ipcMain.handle('cover:save', (_event, bookId: string, base64DataUrl: string) => {
    ensureDir(COVERS_DIR)
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64DataUrl)
    if (!matches) return null
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const filePath = join(COVERS_DIR, bookId + '.' + ext)
    fs.writeFileSync(filePath, base64DataUrl.substring(matches[0].length), { encoding: 'base64' })
    return filePath
  })

  ipcMain.handle('cover:delete', (_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(COVERS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch {}
  })

  ipcMain.handle('cover:exists', (_event, filePath: string) => {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  })

  ipcMain.handle('cover:findEpubCover', (_event, bookId: string, filePath: string) => {
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
          const destPath = join(COVERS_DIR, bookId + saveExt)
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
        const destPath = join(COVERS_DIR, bookId + saveExt)
        fs.writeFileSync(destPath, best.getData())
        return destPath
      }

      return null
    } catch {
      return null
    }
  })

  // ===== EPUB 预处理（在主进程中解压，避免渲染进程使用 zip.js 崩溃）=====
  ipcMain.handle('epub:extractAll', (_event, filePath: string) => {
    try {
      const zip = new AdmZip(filePath)
      const entries = zip.getEntries()
      const result: { name: string; data: number[] }[] = []
      
      for (const entry of entries) {
        if (entry.isDirectory) continue
        // 将 Buffer 转换为普通数组，以便通过 IPC 传递
        const data = Array.from(entry.getData())
        result.push({ name: entry.entryName, data })
      }
      
      return result
    } catch (err) {
      console.error('EPUB extractAll failed:', err)
      return null
    }
  })

  // ===== 字体管理 =====
  ipcMain.handle('font:copyToCache', (_event, srcPath: string) => {
    ensureDir(FONTS_DIR)
    const ext = path.extname(srcPath) || '.ttf'
    const fileName = path.basename(srcPath, ext)
    const destPath = join(FONTS_DIR, fileName + ext)
    fs.copyFileSync(srcPath, destPath)
    return destPath
  })

  ipcMain.handle('font:delete', (_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(FONTS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch {}
  })

  ipcMain.handle('font:getFiles', () => {
    try {
      ensureDir(FONTS_DIR)
      return fs.readdirSync(FONTS_DIR)
        .filter(name => /\.(ttf|otf|woff|woff2)$/i.test(name))
        .map(name => ({
          name: path.basename(name, path.extname(name)),
          path: join(FONTS_DIR, name),
        }))
    } catch {
      return []
    }
  })

  // ===== AI 缓存管理 =====
  ipcMain.handle('ai:ensureCacheDir', () => {
    ensureDir(AI_CACHE_DIR)
    return AI_CACHE_DIR
  })

  ipcMain.handle('ai:readCacheFile', (_event, filePath: string) => {
    try {
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return null
      if (!fs.existsSync(resolved)) return null
      return fs.readFileSync(resolved, { encoding: 'utf-8' })
    } catch {
      return null
    }
  })

  ipcMain.handle('ai:writeCacheFile', (_event, filePath: string, data: string) => {
    try {
      ensureDir(AI_CACHE_DIR)
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return
      fs.writeFileSync(resolved, data, { encoding: 'utf-8' })
    } catch {}
  })

  ipcMain.handle('ai:deleteCacheFile', (_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch {}
  })

  ipcMain.handle('ai:listCacheFiles', () => {
    try {
      ensureDir(AI_CACHE_DIR)
      return fs.readdirSync(AI_CACHE_DIR).filter(name => name.endsWith('.json'))
    } catch {
      return []
    }
  })

  // ===== 图片缓存管理 =====
  ipcMain.handle('image:saveToCache', (_event, base64DataUrl: string) => {
    try {
      const matches = /^data:image\/([a-z0-9+]+);base64,/i.exec(base64DataUrl)
      if (!matches) return null
      const ext = matches[1].replace('jpeg', 'jpg')

      // 按日期创建子目录: images/YYYY-MM-DD/
      const now = new Date()
      const dateDir = now.toISOString().split('T')[0] // YYYY-MM-DD
      const targetDir = join(IMAGES_DIR, dateDir)
      ensureDir(targetDir)

      // Typora 风格文件名: image-HHmmssSSS-XXXX.png
      const timePart = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('')
      const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      const fileName = `image-${timePart}${randomPart}.${ext}`
      const filePath = join(targetDir, fileName)

      const base64Data = base64DataUrl.substring(base64DataUrl.indexOf(',') + 1)
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })
      // 返回绝对路径和相对于 BASE_DIR 的路径（用于 cacheimg:// 协议）
      const relativePath = path.relative(BASE_DIR, filePath).replace(/\\/g, '/')
      return { filePath, relativePath }
    } catch (err) {
      console.error('保存图片到缓存失败:', err)
      return null
    }
  })

  // ===== 剪贴板 =====
  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText()
  })

  // ===== 应用信息 =====
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  // ===== 系统操作 =====
  ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
    } catch {}
  })

  ipcMain.handle('window:toggleDevTools', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  ipcMain.handle('dialog:showFolderPicker', async () => {
    if (!mainWindow) return undefined
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择文件夹',
      properties: ['openDirectory']
    })
    return result.canceled ? undefined : result.filePaths[0]
  })

  ipcMain.handle('fs:scanFolder', (_event, folderPath: string) => {
    const bookExts = new Set(['.epub', '.txt', '.mobi', '.azw3', '.cbz', '.cbr'])
    const results: string[] = []
    function walk(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(fullPath)
          } else if (bookExts.has(path.extname(entry.name).toLowerCase())) {
            results.push(fullPath)
          }
        }
      } catch {}
    }
    walk(folderPath)
    return results
  })

  // ===== 浮动阅读窗口 =====
  ipcMain.handle('floatReader:create', (_event, text: string, bookTitle: string, chapterTitle: string, opacity: number) => {
    // 如果已有浮动窗口，先关闭
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close()
      floatReaderWin = null
    }

    const display = screen.getPrimaryDisplay()
    const workArea = display.workArea
    const winWidth = 420
    const winHeight = 560
    const posX = workArea.x + workArea.width - winWidth - 20
    const posY = workArea.y + workArea.height - winHeight - 20

    floatReaderWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: posX,
      y: posY,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    // 加载浮动阅读器页面（复用 Vue 应用）
    if (process.env.VITE_DEV_SERVER_URL) {
      floatReaderWin.loadURL(process.env.VITE_DEV_SERVER_URL + '?float=reader')
    } else {
      floatReaderWin.loadFile(join(__dirname, '../dist/index.html'), { query: { float: 'reader' } })
    }

    // 注入数据
    let dataInjected = false
    let injectAttempts = 0
    const maxAttempts = 50
    const dataObj = { text, bookTitle, chapterTitle, opacity: opacity || 0.5 }
    const safeJson = JSON.stringify(JSON.stringify(dataObj))
    const injectInterval = setInterval(() => {
      injectAttempts++
      if (dataInjected || injectAttempts > maxAttempts) {
        clearInterval(injectInterval)
        return
      }
      try {
        if (floatReaderWin?.isDestroyed()) {
          clearInterval(injectInterval)
          return
        }
        floatReaderWin?.webContents.executeJavaScript(
          'if (window.setFloatReaderContent) { window.setFloatReaderContent(JSON.parse(' + safeJson + ')); true; } else { false; }'
        ).then((result) => {
          if (result) {
            dataInjected = true
            clearInterval(injectInterval)
          }
        }).catch(() => {})
      } catch {
        clearInterval(injectInterval)
      }
    }, 100)

    // 监听浮动窗口关闭
    floatReaderWin.on('closed', () => {
      floatReaderWin = null
      // 根据标志决定是显示主窗口还是退出应用
      if (floatReaderReturnToMain) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
        }
      } else {
        app.quit()
      }
      // 重置标志
      floatReaderReturnToMain = true
    })

    // 隐藏主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide()
    }

    return true
  })

  ipcMain.handle('floatReader:close', (_event, returnToMain: boolean = true) => {
    // 记录是否需要返回主窗口，供 closed 事件使用
    floatReaderReturnToMain = returnToMain
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close()
    }
    floatReaderWin = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }
  })

  ipcMain.handle('floatReader:isOpen', () => {
    return floatReaderWin != null && !floatReaderWin.isDestroyed()
  })

  ipcMain.handle('floatReader:togglePin', () => {
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      const current = floatReaderWin.isAlwaysOnTop()
      floatReaderWin.setAlwaysOnTop(!current)
      return !current
    }
    return false
  })

  // ===== 镜像笔记浮窗（可编辑）=====
  ipcMain.handle('floatNote:create', (_event, text: string, fileName: string, opacity: number) => {
    // 如果已有浮动窗口，先关闭
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close()
      floatNoteWin = null
    }

    const display = screen.getPrimaryDisplay()
    const workArea = display.workArea
    const winWidth = 480
    const winHeight = 600
    const posX = workArea.x + workArea.width - winWidth - 20
    const posY = workArea.y + workArea.height - winHeight - 20

    floatNoteWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: posX,
      y: posY,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    // 加载浮动笔记页面（复用 Vue 应用）
    if (process.env.VITE_DEV_SERVER_URL) {
      floatNoteWin.loadURL(process.env.VITE_DEV_SERVER_URL + '?float=note')
    } else {
      floatNoteWin.loadFile(join(__dirname, '../dist/index.html'), { query: { float: 'note' } })
    }

    // 注入数据
    let dataInjected = false
    let injectAttempts = 0
    const maxAttempts = 50
    const dataObj = { text, fileName, opacity: opacity || 0.85 }
    const safeJson = JSON.stringify(JSON.stringify(dataObj))
    const injectInterval = setInterval(() => {
      injectAttempts++
      if (dataInjected || injectAttempts > maxAttempts) {
        clearInterval(injectInterval)
        return
      }
      try {
        if (floatNoteWin?.isDestroyed()) {
          clearInterval(injectInterval)
          return
        }
        floatNoteWin?.webContents.executeJavaScript(
          'if (window.setFloatNoteContent) { window.setFloatNoteContent(JSON.parse(' + safeJson + ')); true; } else { false; }'
        ).then((result) => {
          if (result) {
            dataInjected = true
            clearInterval(injectInterval)
          }
        }).catch(() => {})
      } catch {
        clearInterval(injectInterval)
      }
    }, 100)

    // 监听浮动窗口关闭
    floatNoteWin.on('closed', () => {
      floatNoteWin = null
      // 显示主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
      }
    })

    // 隐藏主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide()
    }

    return true
  })

  ipcMain.handle('floatNote:close', () => {
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close()
    }
    floatNoteWin = null
  })

  ipcMain.handle('floatNote:isOpen', () => {
    return floatNoteWin != null && !floatNoteWin.isDestroyed()
  })

  ipcMain.handle('floatNote:togglePin', () => {
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      const current = floatNoteWin.isAlwaysOnTop()
      floatNoteWin.setAlwaysOnTop(!current)
      return !current
    }
    return false
  })

  // 从浮窗接收编辑内容并转发给主编辑器窗口
  ipcMain.handle('floatNote:syncContent', (_event, content: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('floatNote:contentUpdate', content)
    }
  })

  // ===== 生成下一个简记文件名 =====
  ipcMain.handle('fs:generateNextFileName', (_event, dirPath: string, prefix: string) => {
    try {
      const files = fs.readdirSync(dirPath)
      const pattern = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-?(\\d+)\\.md$`, 'i')
      let maxNum = 0
      for (const file of files) {
        const match = file.match(pattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
      const nextNum = String(maxNum + 1).padStart(2, '0')
      return `${prefix}-${nextNum}.md`
    } catch {
      return `${prefix}-01.md`
    }
  })

  // ===== 直接写入指定路径的文件 =====
  ipcMain.handle('fs:writeToFile', (_event, filePath: string, data: string) => {
    try {
      const dir = path.dirname(filePath)
      ensureDir(dir)
      fs.writeFileSync(filePath, data, { encoding: 'utf-8' })
      return filePath
    } catch (err) {
      console.error('writeToFile failed:', err)
      return null
    }
  })

  // ===== 简记保存对话框（弹出文件名输入，默认自动编号）=====
  ipcMain.handle('dialog:showNoteSaveDialog', async (_event, data: string) => {
    if (!mainWindow) return null

    // 在用户文档目录中扫描已有编号，生成下一个可用文件名
    const defaultDir = app.getPath('documents')
    let maxNum = 0
    try {
      const files = fs.readdirSync(defaultDir)
      const pattern = /^简记-?(\d+)\.md$/i
      for (const file of files) {
        const match = file.match(pattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
    } catch {}
    const nextNum = String(maxNum + 1).padStart(2, '0')
    const defaultName = `简记-${nextNum}.md`

    // 弹出系统保存对话框（文件名输入框）
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存简记',
      defaultPath: path.join(defaultDir, defaultName),
      filters: [
        { name: 'Markdown', extensions: ['md'] },
      ],
    })

    if (result.canceled || !result.filePath) return null

    // 如果目标文件已存在，自动递增编号
    let finalPath = result.filePath
    let finalFileName = path.basename(finalPath)
    const match = finalFileName.match(/^(简记)-?(\d+)\.md$/i)
    if (match && fs.existsSync(finalPath)) {
      const dir = path.dirname(finalPath)
      const prefix = match[1]
      let num = parseInt(match[2], 10)
      while (fs.existsSync(path.join(dir, `${prefix}-${String(num).padStart(2, '0')}.md`))) {
        num++
      }
      finalFileName = `${prefix}-${String(num).padStart(2, '0')}.md`
      finalPath = path.join(dir, finalFileName)
    }

    fs.writeFileSync(finalPath, data, { encoding: 'utf-8' })
    return { filePath: finalPath, fileName: finalFileName }
  })

  // ===== 窗口控制 =====
  ipcMain.handle('window:show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }
  })

  ipcMain.handle('window:hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide()
    }
  })

  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized()
    }
    return false
  })

  // 监听最大化/取消最大化事件，通知渲染进程
  ipcMain.handle('window:setupMaximizeListener', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('window:maximize-change', true)
      })
      mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('window:maximize-change', false)
      })
    }
  })

  // ===== 获取路径 =====
  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as any)
  })

  // ===== 打开缓存目录 =====
  ipcMain.handle('app:openCacheFolder', () => {
    try {
      ensureDir(BASE_DIR)
      shell.openPath(BASE_DIR)
    } catch (err) {
      console.error('打开缓存目录失败:', err)
    }
  })
}

// 注册 cacheimg:// 协议（用于加载缓存图片，需在 app ready 前调用）
protocol.registerSchemesAsPrivileged([
  { scheme: 'cacheimg', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// 应用准备就绪
app.whenReady().then(() => {
  initDirs()
  // 初始化 electron-store 的 renderer 支持（注册 IPC 处理器供 preload 使用）
  Store.initRenderer()
  registerIpcHandlers()

  // 注册 cacheimg:// 协议，映射到缓存目录下的图片文件
  protocol.handle('cacheimg', (request) => {
    const urlPath = request.url.replace('cacheimg://', '')
    const decodedPath = decodeURIComponent(urlPath)
    const filePath = join(BASE_DIR, decodedPath)
    return net.fetch('file://' + filePath)
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
