/**
 * 浮动窗口工厂 - 消除重复的窗口创建代码
 */

import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'

export interface FloatWindowOptions {
  type: 'reader' | 'note'
  width?: number
  height?: number
}

/**
 * 创建浮动窗口
 * @param options 窗口配置
 * @returns BrowserWindow 实例
 */
export function createFloatWindow(options: FloatWindowOptions): BrowserWindow {
  const { type, width = 420, height = 560 } = options

  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea
  const posX = workArea.x + workArea.width - width - 20
  const posY = workArea.y + workArea.height - height - 20

  const win = new BrowserWindow({
    width,
    height,
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

  // 加载页面
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + `?float=${type}`)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'), { query: { float: type } })
  }

  return win
}

/**
 * 注入数据到浮动窗口（使用事件驱动替代轮询）
 */
export function injectFloatData(
  win: BrowserWindow,
  type: 'reader' | 'note',
  data: Record<string, any>,
  timeout = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = `float:${type}:ready`
    const dataChannel = `float:${type}:data`
    let resolved = false

    // 设置超时
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        ipcMain.removeAllListeners(channel)
        // 降级到 executeJavaScript 注入
        fallbackInject(win, type, data).then(resolve)
      }
    }, timeout)

    // 监听渲染进程就绪事件
    ipcMain.once(channel, (event) => {
      if (event.sender === win.webContents && !resolved) {
        resolved = true
        clearTimeout(timer)
        event.sender.send(dataChannel, data)
        resolve(true)
      }
    })
  })
}

/**
 * 降级注入方案（兼容旧版）
 */
function fallbackInject(
  win: BrowserWindow,
  type: 'reader' | 'note',
  data: Record<string, any>
): Promise<boolean> {
  return new Promise((resolve) => {
    let dataInjected = false
    let injectAttempts = 0
    const maxAttempts = 50
    const safeJson = JSON.stringify(JSON.stringify(data))
    const funcName = type === 'reader' ? 'setFloatReaderContent' : 'setFloatNoteContent'

    const injectInterval = setInterval(() => {
      injectAttempts++
      if (dataInjected || injectAttempts > maxAttempts) {
        clearInterval(injectInterval)
        resolve(dataInjected)
        return
      }
      try {
        if (win.isDestroyed()) {
          clearInterval(injectInterval)
          resolve(false)
          return
        }
        win.webContents.executeJavaScript(
          `if (window.${funcName}) { window.${funcName}(JSON.parse(${safeJson})); true; } else { false; }`
        ).then((result) => {
          if (result) {
            dataInjected = true
            clearInterval(injectInterval)
            resolve(true)
          }
        }).catch(() => {})
      } catch {
        clearInterval(injectInterval)
        resolve(false)
      }
    }, 100)
  })
}
