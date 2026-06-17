/**
 * 浮动窗口相关 IPC 处理器
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import { wrapHandler } from '../errorHandler'
import { createFloatWindow, injectFloatData } from '../windowFactory'

let floatReaderWin: BrowserWindow | null = null
let floatNoteWin: BrowserWindow | null = null
let floatReaderReturnToMain: boolean = true
let floatNoteReturnToMain: boolean = true

let mainWindowRef: BrowserWindow | null = null

export function setMainWindowForFloat(win: BrowserWindow | null): void {
  mainWindowRef = win
}

export function registerFloatHandlers(): void {
  // ===== 浮动阅读窗口 =====
  ipcMain.handle('floatReader:create', wrapHandler(async (_event, text: string, bookTitle: string, chapterTitle: string, opacity: number) => {
    // 如果已有浮动窗口，先关闭
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close()
      floatReaderWin = null
    }

    floatReaderWin = createFloatWindow({ type: 'reader', width: 420, height: 560 })

    // 注入数据
    const dataObj = { text, bookTitle, chapterTitle, opacity: opacity || 0.5 }
    await injectFloatData(floatReaderWin, 'reader', dataObj)

    // 监听浮动窗口关闭
    floatReaderWin.on('closed', () => {
      floatReaderWin = null
      if (floatReaderReturnToMain) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
        }
      } else {
        app.quit()
      }
      floatReaderReturnToMain = true
    })

    // 隐藏主窗口
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.hide()
    }

    return true
  }, 'floatReader:create'))

  ipcMain.handle('floatReader:close', wrapHandler((_event, returnToMain: boolean = true) => {
    floatReaderReturnToMain = returnToMain
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      floatReaderWin.close()
    }
    floatReaderWin = null
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show()
    }
  }, 'floatReader:close'))

  ipcMain.handle('floatReader:isOpen', wrapHandler(() => {
    return floatReaderWin != null && !floatReaderWin.isDestroyed()
  }, 'floatReader:isOpen'))

  ipcMain.handle('floatReader:togglePin', wrapHandler(() => {
    if (floatReaderWin && !floatReaderWin.isDestroyed()) {
      const current = floatReaderWin.isAlwaysOnTop()
      floatReaderWin.setAlwaysOnTop(!current)
      return !current
    }
    return false
  }, 'floatReader:togglePin'))

  // ===== 浮动笔记窗口 =====
  ipcMain.handle('floatNote:create', wrapHandler(async (_event, text: string, fileName: string, opacity: number) => {
    // 如果已有浮动窗口，先关闭
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close()
      floatNoteWin = null
    }

    floatNoteWin = createFloatWindow({ type: 'note', width: 480, height: 600 })

    // 注入数据
    const dataObj = { text, fileName, opacity: opacity || 0.85 }
    await injectFloatData(floatNoteWin, 'note', dataObj)

    // 监听浮动窗口关闭
    floatNoteWin.on('closed', () => {
      floatNoteWin = null
      if (floatNoteReturnToMain) {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show()
        }
      } else {
        app.quit()
      }
      floatNoteReturnToMain = true
    })

    // 隐藏主窗口
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.hide()
    }

    return true
  }, 'floatNote:create'))

  ipcMain.handle('floatNote:close', wrapHandler((_event, returnToMain: boolean = true) => {
    floatNoteReturnToMain = returnToMain
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      floatNoteWin.close()
    }
    floatNoteWin = null
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show()
    }
  }, 'floatNote:close'))

  ipcMain.handle('floatNote:isOpen', wrapHandler(() => {
    return floatNoteWin != null && !floatNoteWin.isDestroyed()
  }, 'floatNote:isOpen'))

  ipcMain.handle('floatNote:togglePin', wrapHandler(() => {
    if (floatNoteWin && !floatNoteWin.isDestroyed()) {
      const current = floatNoteWin.isAlwaysOnTop()
      floatNoteWin.setAlwaysOnTop(!current)
      return !current
    }
    return false
  }, 'floatNote:togglePin'))

  ipcMain.handle('floatNote:syncContent', wrapHandler((_event, content: string) => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('floatNote:contentUpdate', content)
    }
  }, 'floatNote:syncContent'))
}
