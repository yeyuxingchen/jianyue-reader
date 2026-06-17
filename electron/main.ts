/**
 * 简阅 - 主进程入口
 */

import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { initSecurity } from './security'
import { setupErrorHandler } from './errorHandler'
import { initDirs, BASE_DIR } from './config'
import { registerAllIpcHandlers } from './ipc'
import { setMainWindow as setDialogMainWindow } from './ipc/dialog'
import { setMainWindow as setWindowMainWindow } from './ipc/window'
import { setMainWindowForFloat } from './ipc/float'
import { setPendingFilePath } from './ipc/shell'

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
])

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

  // 检查首次启动时是否通过命令行传入了文件路径
  if (!pendingFilePath) {
    const filePath = parseFilePathFromArgs(process.argv)
    if (filePath) pendingFilePath = filePath
  }
  setPendingFilePath(pendingFilePath)

  // 注册 cacheimg:// 协议，映射到缓存目录下的图片文件
  protocol.handle('cacheimg', (request) => {
    const urlPath = request.url.replace('cacheimg://', '')
    const decodedPath = decodeURIComponent(urlPath)
    const filePath = join(BASE_DIR, decodedPath)
    return net.fetch('file://' + filePath)
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
