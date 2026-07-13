/**
 * 图片缓存相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { IMAGES_DIR, BASE_DIR, ensureDir } from '../config'

export function registerImageHandlers(): void {
  ipcMain.handle('image:saveToCache', wrapHandler((_event, base64DataUrl: string) => {
    try {
      const matches = /^data:image\/([a-z0-9+]+);base64,/i.exec(base64DataUrl)
      if (!matches) return null
      const ext = matches[1].replace('jpeg', 'jpg')

      // 按日期创建子目录: images/YYYY-MM-DD/
      const now = new Date()
      const dateDir = now.toISOString().split('T')[0] // YYYY-MM-DD
      const targetDir = path.join(IMAGES_DIR, dateDir)
      ensureDir(targetDir)

      // Typora 风格文件名: image-HHmmssSSS-XXXX.png
      const timePart = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join('')
      const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      const fileName = `image-${timePart}${randomPart}.${ext}`
      const filePath = path.join(targetDir, fileName)

      const base64Data = base64DataUrl.substring(base64DataUrl.indexOf(',') + 1)
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })
      // 返回绝对路径和相对于 BASE_DIR 的路径（用于 cacheimg:// 协议）
      const relativePath = path.relative(BASE_DIR, filePath).replace(/\\/g, '/')
      return { filePath, relativePath }
    } catch (err) {
      console.error('Failed to save image to cache:', err)
      return null
    }
  }, 'image:saveToCache'))
}
