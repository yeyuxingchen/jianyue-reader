/**
 * 简阅 - 主进程入口
 */

import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import { join } from 'path'
import { tmpdir } from 'os'
import Store from 'electron-store'

// ===== 修复 Windows 下 Chromium 缓存目录访问被拒绝（0x5）的问题 =====
// userData 位于 AppData\Roaming 时（常被 OneDrive 同步或受限），
// Chromium 创建/移动 GPU 与磁盘缓存会报 Access Denied。
// 将缓存改到可写的临时目录并禁用 GPU 缓存，消除该噪声。
try {
  const cacheDir = join(tmpdir(), 'jianyue-reader-cache')
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir)
  app.commandLine.appendSwitch('disable-gpu-cache')
} catch {
  // 忽略：开关设置失败时退回默认行为，仅为去噪，不影响功能
}
import { initSecurity, addAuthorizedDir } from './security'
import { setupErrorHandler } from './errorHandler'
import { initDirs, BASE_DIR } from './config'
import { registerAllIpcHandlers } from './ipc'
import { setMainWindow as setDialogMainWindow } from './ipc/dialog'
import { setMainWindow as setWindowMainWindow } from './ipc/window'
import { setMainWindowForFloat } from './ipc/float'
import { setPendingFilePath } from './ipc/shell'
import { createTray, destroyTray, bindCloseToTray, setQuitting, isAppQuitting } from './tray'

// ===== 外部文件打开支持 =====
let pendingFilePath: string | null = null

/** 从命令行参数中提取支持的文件路径 */
function parseFilePathFromArgs(argv: string[]): string | null {
  const supportedExts = new Set(['.md', '.epub', '.txt', '.mobi', '.azw3', '.cbz', '.cbr'])
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (arg && !arg.startsWith('-')) {
      const ext = require('path').extname(arg).toLowerCase()
      if (supportedExts.has(ext)) {
        return arg
      }
    }
  }
  return null
}

/**
 * 外部文件打开时自动授权文件父目录。
 * 用户通过资源管理器/Finder/"打开方式"用本应用打开文件是明确的授权意图，
 * 无需再弹窗询问即可访问该目录（与系统文件对话框的语义一致）。
 */
function authorizeExternalFile(filePath: string): void {
  try {
    const dir = require('path').dirname(filePath)
    const fs = require('fs')
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      addAuthorizedDir(dir)
    }
  } catch (err) {
    console.error('[main] Failed to authorize external file dir:', err)
  }
}

/** 将待处理文件路径发送给渲染进程 */
function processPendingFile(mainWindow: BrowserWindow) {
  if (pendingFilePath && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('file-open', pendingFilePath)
    pendingFilePath = null
  }
}

let mainWindow: BrowserWindow | null = null

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

  // 设置主窗口引用到各模块
  setDialogMainWindow(mainWindow)
  setWindowMainWindow(mainWindow)
  setMainWindowForFloat(mainWindow)

  // 开发模式加载本地服务器，生产模式加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // 处理待打开的外部文件
    processPendingFile(mainWindow!)
  })

  // 拦截关闭事件，默认最小化到托盘（不退出应用）
  bindCloseToTray(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
    setDialogMainWindow(null)
    setWindowMainWindow(null)
    setMainWindowForFloat(null)
  })
}

// 注册自定义协议（需在 app ready 前调用）
protocol.registerSchemesAsPrivileged([
  { scheme: 'cacheimg', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'fontfile', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'chimg', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

// 章节图片目录注册表：id -> 章节根目录（epub 根）。
// 渲染端打开章节时把目录注册进来，拿到稳定短 id，URL 用 chimg://<id>/...，
// 避免在 URL 里塞完整路径的 base64（易被浏览器改写导致解码失败）。
const chapterDirRegistry = new Map<string, string>() // id -> dir
const chapterDirReverse = new Map<string, string>() // dir -> id
let chapterDirSeq = 0

// ===== 单实例锁 + 外部文件打开处理 =====
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    const filePath = parseFilePathFromArgs(commandLine)
    if (filePath && mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      // 用户在资源管理器中双击文件触发本应用时，自动授权文件父目录
      authorizeExternalFile(filePath)
      mainWindow.webContents.send('file-open', filePath)
    }
  })
}

// macOS: 从 Finder 打开文件
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  const path = require('path')
  const ext = path.extname(filePath).toLowerCase()
  const supportedExts = new Set(['.md', '.epub', '.txt', '.mobi', '.azw3', '.cbz', '.cbr'])
  if (!supportedExts.has(ext)) return

  // macOS 用户在 Finder 双击文件触发本应用时，自动授权文件父目录
  authorizeExternalFile(filePath)

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('file-open', filePath)
  } else {
    pendingFilePath = filePath
  }
})

// 应用准备就绪
app.whenReady().then(() => {
  // 初始化错误处理
  setupErrorHandler()

  // 初始化数据目录
  initDirs()

  // 初始化安全模块
  initSecurity()

  // 初始化 electron-store 的 renderer 支持
  Store.initRenderer()

  // 注册所有 IPC 处理器
  registerAllIpcHandlers()

  // 章节图片目录注册：渲染端打开章节时调用，返回稳定 id，供 chimg://<id>/... 使用
  ipcMain.handle('epub:registerChapterDir', (_event, dir: string) => {
    const existing = chapterDirReverse.get(dir)
    if (existing) return existing
    const id = `c${++chapterDirSeq}`
    chapterDirRegistry.set(id, dir)
    chapterDirReverse.set(dir, id)
    return id
  })

  // 检查首次启动时是否通过命令行传入了文件路径
  if (!pendingFilePath) {
    const filePath = parseFilePathFromArgs(process.argv)
    if (filePath) pendingFilePath = filePath
  }
  // 首次启动时若通过命令行打开了文件（Windows: 资源管理器"打开方式"），
  // 也自动授权文件父目录
  if (pendingFilePath) authorizeExternalFile(pendingFilePath)
  setPendingFilePath(pendingFilePath)

  // 注册 cacheimg:// 协议，映射到缓存目录下的图片文件
  protocol.handle('cacheimg', (request) => {
    const urlPath = request.url.replace('cacheimg://', '')
    const decodedPath = decodeURIComponent(urlPath)
    const filePath = join(BASE_DIR, decodedPath)
    return net.fetch('file://' + filePath)
  })

  // 注册 chimg://<id>/.image/<rel> 协议，给章节图片用。
  // <id> 是主进程注册表里的章节目录编号（由渲染端打开章节时注册），
  // 避免在 URL 里塞完整路径的 base64（易被浏览器改写导致解码失败）。
  protocol.handle('chimg', (request) => {
    try {
      const urlPath = request.url.replace('chimg://', '') // "<id>/<rel>"
      const segs = urlPath.split('/').filter((s) => s.length > 0)
      if (segs.length < 2) return new Response('bad request', { status: 400 })
      const id = segs[0]
      const relPath = decodeURIComponent(segs.slice(1).join('/'))
      const chapterDir = chapterDirRegistry.get(id)
      if (!chapterDir) return new Response('unknown chapter id', { status: 404 })
      const filePath = join(chapterDir, relPath)
      return net.fetch('file:///' + filePath.replace(/\\/g, '/'))
    } catch (err) {
      console.error('chimg protocol error:', err)
      return new Response('not found', { status: 404 })
    }
  })

  // 注册 fontfile:///?path=xxx 协议，加载本地字体文件
  protocol.handle('fontfile', (request) => {
    try {
      // request.url 格式: fontfile:///?path=C%3A%2FUsers%2F20763%2F...
      const url = new URL(request.url)
      const encodedPath = url.searchParams.get('path')
      if (!encodedPath) {
        console.error('fontfile protocol: missing path parameter')
        return new Response(null, { status: 400 })
      }
      // 解码路径（已是正确的 Windows 路径格式）
      const filePath = decodeURIComponent(encodedPath)
      // 读取文件并返回
      const fs = require('fs')
      const data = fs.readFileSync(filePath)
      return new Response(data, {
        headers: { 'Content-Type': 'font/ttf' }
      })
    } catch (err) {
      console.error('fontfile protocol error:', err)
      return new Response(null, { status: 404 })
    }
  })

  createMainWindow()

  // 创建系统托盘（主窗口已就绪）
  createTray(mainWindow!)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createTray(mainWindow!)
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      // macOS: dock 图标点击时显示主窗口
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
})

// 标记真正退出（通过托盘菜单的"退出"调用）
app.on('before-quit', () => {
  setQuitting(true)
})

app.on('will-quit', () => {
  destroyTray()
})

app.on('window-all-closed', () => {
  // 当所有窗口关闭时，不再自动退出（保留托盘，由用户通过托盘菜单退出）
  // 但 macOS 默认行为是保留应用
  if (process.platform !== 'darwin' && isAppQuitting()) {
    app.quit()
  }
})
