/**
 * 字体相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { FONTS_DIR, ensureDir } from '../config'

export function registerFontHandlers(): void {
  ipcMain.handle('font:copyToCache', wrapHandler((_event, srcPath: string) => {
    ensureDir(FONTS_DIR)
    const ext = path.extname(srcPath) || '.ttf'
    const fileName = path.basename(srcPath, ext)
    const destPath = path.join(FONTS_DIR, fileName + ext)
    fs.copyFileSync(srcPath, destPath)
    return destPath
  }, 'font:copyToCache'))

  ipcMain.handle('font:delete', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(FONTS_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch (err) {
      console.error('font:delete error:', err)
    }
  }, 'font:delete'))

  ipcMain.handle('font:getFiles', wrapHandler(() => {
    try {
      ensureDir(FONTS_DIR)
      return fs.readdirSync(FONTS_DIR)
        .filter(name => /\.(ttf|otf|woff|woff2)$/i.test(name))
        .map(name => ({
          name: path.basename(name, path.extname(name)),
          path: path.join(FONTS_DIR, name),
        }))
    } catch {
      return []
    }
  }, 'font:getFiles'))

  // 获取字体文件的 base64 数据（用于 data: URI 加载）
  ipcMain.handle('font:getBase64', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return null
      const resolved = path.resolve(filePath)
      if (!fs.existsSync(resolved)) return null
      const buffer = fs.readFileSync(resolved)
      const ext = path.extname(resolved).toLowerCase()
      let mimeType = 'font/ttf'
      if (ext === '.otf') mimeType = 'font/otf'
      else if (ext === '.woff') mimeType = 'font/woff'
      else if (ext === '.woff2') mimeType = 'font/woff2'
      return {
        data: buffer.toString('base64'),
        mimeType,
      }
    } catch (err) {
      console.error('font:getBase64 error:', err)
      return null
    }
  }, 'font:getBase64'))
}
