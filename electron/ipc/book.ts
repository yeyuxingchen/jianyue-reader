/**
 * 书籍缓存相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { BOOKS_DIR, ensureDir } from '../config'

export function registerBookHandlers(): void {
  ipcMain.handle('book:copyToCache', wrapHandler((_event, bookId: string, srcPath: string) => {
    ensureDir(BOOKS_DIR)
    const ext = path.extname(srcPath) || '.epub'
    const destPath = path.join(BOOKS_DIR, bookId + ext)
    fs.copyFileSync(srcPath, destPath)
    return destPath
  }, 'book:copyToCache'))

  ipcMain.handle('book:deleteCached', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(BOOKS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch (err) {
      console.error('book:deleteCached error:', err)
    }
  }, 'book:deleteCached'))

  ipcMain.handle('book:cachedExists', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return false
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }, 'book:cachedExists'))
}
