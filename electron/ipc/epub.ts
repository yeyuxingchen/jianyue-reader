/**
 * EPUB 相关 IPC 处理器
 * 支持按需加载和全量解压两种模式
 */

import { ipcMain } from 'electron'
import AdmZip from 'adm-zip'
import fs from 'fs'
import { wrapHandler } from '../errorHandler'

// 缓存 zip 实例，避免重复打开文件
const zipCache = new Map<string, { zip: AdmZip; mtime: number }>()

/**
 * 获取或创建 zip 实例 (带缓存)
 */
function getZip(filePath: string): AdmZip {
  const stat = fs.statSync(filePath)
  const cached = zipCache.get(filePath)

  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.zip
  }

  const zip = new AdmZip(filePath)
  zipCache.set(filePath, { zip, mtime: stat.mtimeMs })
  return zip
}

export function registerEpubHandlers(): void {
  // 全量解压（兼容旧接口）
  ipcMain.handle('epub:extractAll', wrapHandler((_event, filePath: string) => {
    try {
      const zip = getZip(filePath)
      const entries = zip.getEntries()
      const result: { name: string; data: number[] }[] = []

      for (const entry of entries) {
        if (entry.isDirectory) continue
        const data = Array.from(entry.getData())
        result.push({ name: entry.entryName, data })
      }

      return result
    } catch (err) {
      console.error('EPUB extractAll failed:', err)
      return null
    }
  }, 'epub:extractAll'))

  // 按需加载：获取文件列表
  ipcMain.handle('epub:listEntries', wrapHandler((_event, filePath: string) => {
    const zip = getZip(filePath)
    const entries = zip.getEntries()

    return entries
      .filter(e => !e.isDirectory)
      .map(e => ({
        name: e.entryName,
        size: e.header.size,
        compressedSize: e.header.compressedSize,
        time: e.header.time,
      }))
  }, 'epub:listEntries'))

  // 按需加载：获取单个文件
  ipcMain.handle('epub:getEntry', wrapHandler((_event, filePath: string, entryName: string) => {
    const zip = getZip(filePath)
    const entry = zip.getEntry(entryName)

    if (!entry) return null

    const data = entry.getData()
    return {
      name: entry.entryName,
      data: Array.from(data),
      size: data.length,
    }
  }, 'epub:getEntry'))

  // 按需加载：批量获取文件
  ipcMain.handle('epub:getEntries', wrapHandler((_event, filePath: string, entryNames: string[]) => {
    const zip = getZip(filePath)

    return entryNames.map(name => {
      const entry = zip.getEntry(name)
      if (!entry) return { name, data: null }

      const data = entry.getData()
      return {
        name: entry.entryName,
        data: Array.from(data),
        size: data.length,
      }
    })
  }, 'epub:getEntries'))

  // 清理缓存
  ipcMain.handle('epub:clearCache', wrapHandler((_event, filePath?: string) => {
    if (filePath) {
      zipCache.delete(filePath)
    } else {
      zipCache.clear()
    }
  }, 'epub:clearCache'))
}
