/**
 * 剪贴板相关 IPC 处理器
 */

import { ipcMain, clipboard } from 'electron'
import { wrapHandler } from '../errorHandler'

export function registerClipboardHandlers(): void {
  ipcMain.handle('clipboard:writeText', wrapHandler((_event, text: string) => {
    clipboard.writeText(text)
  }, 'clipboard:writeText'))

  ipcMain.handle('clipboard:readText', wrapHandler(() => {
    return clipboard.readText()
  }, 'clipboard:readText'))
}
