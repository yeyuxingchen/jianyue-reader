/**
 * 文件系统相关 IPC 处理器
 */

import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { validateFilePath, isPathAllowed } from '../security'
import { wrapHandler } from '../errorHandler'
import { ensureDir } from '../config'

export function registerFsHandlers(): void {
  ipcMain.handle('fs:readFileAsBuffer', wrapHandler((_event, filePath: string) => {
    const validPath = validateFilePath(filePath)
    const buffer = fs.readFileSync(validPath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }, 'fs:readFileAsBuffer'))

  ipcMain.handle('fs:readFileAsText', wrapHandler((_event, filePath: string) => {
    const validPath = validateFilePath(filePath)
    return fs.readFileSync(validPath, { encoding: 'utf-8' })
  }, 'fs:readFileAsText'))

  ipcMain.handle('fs:checkFileExists', wrapHandler((_event, filePath: string) => {
    try {
      if (!isPathAllowed(filePath)) return false
      fs.accessSync(filePath, fs.constants.R_OK)
      return true
    } catch {
      return false
    }
  }, 'fs:checkFileExists'))

  ipcMain.handle('fs:getFileName', wrapHandler((_event, filePath: string) => {
    return path.basename(filePath)
  }, 'fs:getFileName'))

  ipcMain.handle('fs:getFileSize', wrapHandler((_event, filePath: string) => {
    try {
      const validPath = validateFilePath(filePath)
      const stat = fs.statSync(validPath)
      return stat.size
    } catch {
      return 0
    }
  }, 'fs:getFileSize'))

  ipcMain.handle('fs:writeTextFile', wrapHandler((_event, text: string) => {
    const filePath = path.join(app.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  }, 'fs:writeTextFile'))

  ipcMain.handle('fs:writeImageFile', wrapHandler((_event, base64Url: string) => {
    const matches = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matches) return undefined
    const filePath = path.join(app.getPath('downloads'), Date.now().toString() + '.' + matches[1])
    fs.writeFileSync(filePath, base64Url.substring(matches[0].length), { encoding: 'base64' })
    return filePath
  }, 'fs:writeImageFile'))

  ipcMain.handle('fs:scanFolder', wrapHandler((_event, folderPath: string) => {
    const bookExts = new Set(['.epub', '.txt', '.mobi', '.azw3', '.cbz', '.cbr'])
    const results: string[] = []
    function walk(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(fullPath)
          } else if (bookExts.has(path.extname(entry.name).toLowerCase())) {
            results.push(fullPath)
          }
        }
      } catch (err) {
        console.error('fs:scanFolder error:', err)
      }
    }
    walk(folderPath)
    return results
  }, 'fs:scanFolder'))

  ipcMain.handle('fs:generateNextFileName', wrapHandler((_event, dirPath: string, prefix: string) => {
    try {
      const files = fs.readdirSync(dirPath)
      const pattern = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-?(\\d+)\\.md$`, 'i')
      let maxNum = 0
      for (const file of files) {
        const match = file.match(pattern)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
      const nextNum = String(maxNum + 1).padStart(2, '0')
      return `${prefix}-${nextNum}.md`
    } catch {
      return `${prefix}-01.md`
    }
  }, 'fs:generateNextFileName'))

  ipcMain.handle('fs:writeToFile', wrapHandler((_event, filePath: string, data: string) => {
    try {
      const dir = path.dirname(filePath)
      ensureDir(dir)
      fs.writeFileSync(filePath, data, { encoding: 'utf-8' })
      return filePath
    } catch (err) {
      console.error('writeToFile failed:', err)
      return null
    }
  }, 'fs:writeToFile'))
}
