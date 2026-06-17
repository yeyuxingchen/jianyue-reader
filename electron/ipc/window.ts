/**
 * 窗口控制相关 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'
import { wrapHandler } from '../errorHandler'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function registerWindowHandlers(): void {
  ipcMain.handle('window:show', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }
  }, 'window:show'))

  ipcMain.handle('window:hide', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide()
    }
  }, 'window:hide'))

  ipcMain.handle('window:minimize', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  }, 'window:minimize'))

  ipcMain.handle('window:maximize', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  }, 'window:maximize'))

  ipcMain.handle('window:close', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  }, 'window:close'))

  ipcMain.handle('window:isMaximized', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isMaximized()
    }
    return false
  }, 'window:isMaximized'))

  ipcMain.handle('window:setupMaximizeListener', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('window:maximize-change', true)
      })
      mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('window:maximize-change', false)
      })
    }
  }, 'window:setupMaximizeListener'))

  ipcMain.handle('window:toggleDevTools', wrapHandler(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
  }, 'window:toggleDevTools'))
}
