/**
 * 系统托盘模块
 * - 创建右下角托盘图标
 * - 左键单击：显示/隐藏主窗口
 * - 右键菜单：显示主窗口、新建浮动笔记、退出
 * - 拦截主窗口关闭事件，按"关闭到托盘"策略处理
 */

import { Tray, Menu, nativeImage, app, BrowserWindow, NativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

let tray: Tray | null = null
// 用于记录"是否真正退出"的状态，区分"最小化到托盘"和"用户主动退出"
let isQuitting = false

/**
 * 加载托盘图标（支持多平台：Windows 优先使用 ico，否则使用 png）
 */
function loadTrayIcon(): NativeImage {
  // 优先使用 ico（Windows 系统托盘渲染更清晰）
  const iconIco = join(__dirname, '../public/logo.ico')
  const iconPng = join(__dirname, '../public/logo.png')

  if (existsSync(iconIco)) {
    return nativeImage.createFromPath(iconIco)
  }
  if (existsSync(iconPng)) {
    // 缩小到 16x16，托盘推荐尺寸
    const img = nativeImage.createFromPath(iconPng)
    return img.resize({ width: 16, height: 16 })
  }
  // 兜底：空图片
  return nativeImage.createEmpty()
}

/**
 * 显示主窗口并聚焦
 */
function showMainWindow(): void {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length === 0) {
    // 主窗口已关闭，需要通知主进程重建
    app.emit('activate')
    return
  }
  const main = wins[0]
  if (main.isMinimized()) main.restore()
  if (!main.isVisible()) main.show()
  main.focus()
}

/**
 * 创建并初始化系统托盘
 */
export function createTray(mainWindow: BrowserWindow): Tray | null {
  try {
    const icon = loadTrayIcon()
    tray = new Tray(icon)
    tray.setToolTip('简阅 - 本地电子书阅读器')

    refreshTrayMenu(mainWindow)

    // 左键单击：切换主窗口显示
    tray.on('click', () => {
      const wins = BrowserWindow.getAllWindows()
      if (wins.length === 0) {
        app.emit('activate')
        return
      }
      const main = wins[0]
      if (main.isVisible() && !main.isMinimized()) {
        main.hide()
      } else {
        showMainWindow()
      }
    })

    // 双击：聚焦主窗口
    tray.on('double-click', () => {
      showMainWindow()
    })

    console.log('[Tray] System tray created')
    return tray
  } catch (err) {
    console.error('[Tray] Failed to create system tray:', err)
    return null
  }
}

/**
 * 刷新托盘右键菜单（窗口状态变化时调用）
 */
export function refreshTrayMenu(mainWindow: BrowserWindow | null): void {
  if (!tray) return
  const isVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()

  const menu = Menu.buildFromTemplate([
    {
      label: isVisible ? '隐藏主窗口' : '显示主窗口',
      click: () => {
        if (isVisible && mainWindow) {
          mainWindow.hide()
        } else {
          showMainWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: '关于简阅',
      click: () => {
        const { dialog } = require('electron')
        dialog.showMessageBox({
          type: 'info',
          title: '关于简阅',
          message: '简阅 JianYue Reader',
          detail: `本地电子书阅读器\n版本：${app.getVersion()}\n\n支持 md / epub / txt / mobi / azw3 / cbz / cbr 格式`,
          buttons: ['确定'],
          noLink: true,
        })
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
}

/**
 * 销毁托盘
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

/**
 * 标记"用户主动退出"（用于拦截关闭事件时区分场景）
 */
export function setQuitting(value: boolean): void {
  isQuitting = value
}

/**
 * 判断当前是否为"用户主动退出"
 */
export function isAppQuitting(): boolean {
  return isQuitting
}

/**
 * 绑定主窗口关闭事件：关闭时最小化到托盘而非退出
 */
export function bindCloseToTray(mainWindow: BrowserWindow): void {
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    // 阻止默认关闭行为
    event.preventDefault()
    // 隐藏窗口（不是最小化到任务栏，而是真正隐藏，托盘图标仍在）
    mainWindow.hide()
    // 通知渲染进程：窗口已隐藏到托盘
    mainWindow.webContents.send('window:hidden-to-tray')
    // 刷新托盘菜单（让菜单显示"显示主窗口"）
    refreshTrayMenu(mainWindow)
  })
}
