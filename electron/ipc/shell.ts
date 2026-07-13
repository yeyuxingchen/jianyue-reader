/**
 * Shell 和应用信息相关 IPC 处理器
 */

import { ipcMain, shell, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { BASE_DIR, ensureDir } from '../config'

// 待处理的外部文件路径
let pendingFilePath: string | null = null

export function setPendingFilePath(filePath: string | null): void {
  pendingFilePath = filePath
}

export function getPendingFilePath(): string | null {
  const fp = pendingFilePath
  pendingFilePath = null
  return fp
}

export function registerShellHandlers(): void {
  ipcMain.handle('shell:showItemInFolder', wrapHandler((_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  }, 'shell:showItemInFolder'))

  ipcMain.handle('app:getPath', wrapHandler((_event, name: string) => {
    return app.getPath(name as any)
  }, 'app:getPath'))

  ipcMain.handle('app:getVersion', wrapHandler(() => {
    return app.getVersion()
  }, 'app:getVersion'))

  ipcMain.handle('app:openCacheFolder', wrapHandler(() => {
    try {
      ensureDir(BASE_DIR)
      shell.openPath(BASE_DIR)
    } catch (err) {
      console.error('Failed to open cache folder:', err)
    }
  }, 'app:openCacheFolder'))

  ipcMain.handle('app:pendingFilePath', wrapHandler(() => {
    return getPendingFilePath()
  }, 'app:pendingFilePath'))
}
