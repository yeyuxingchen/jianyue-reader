/**
 * AI 缓存相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { wrapHandler } from '../errorHandler'
import { AI_CACHE_DIR, ensureDir } from '../config'

export function registerAiHandlers(): void {
  ipcMain.handle('ai:ensureCacheDir', wrapHandler(() => {
    ensureDir(AI_CACHE_DIR)
    return AI_CACHE_DIR
  }, 'ai:ensureCacheDir'))

  ipcMain.handle('ai:readCacheFile', wrapHandler((_event, filePath: string) => {
    try {
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return null
      if (!fs.existsSync(resolved)) return null
      return fs.readFileSync(resolved, { encoding: 'utf-8' })
    } catch {
      return null
    }
  }, 'ai:readCacheFile'))

  ipcMain.handle('ai:writeCacheFile', wrapHandler((_event, filePath: string, data: string) => {
    try {
      ensureDir(AI_CACHE_DIR)
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return
      fs.writeFileSync(resolved, data, { encoding: 'utf-8' })
    } catch (err) {
      console.error('ai:writeCacheFile error:', err)
    }
  }, 'ai:writeCacheFile'))

  ipcMain.handle('ai:deleteCacheFile', wrapHandler((_event, filePath: string) => {
    try {
      if (!filePath) return
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(AI_CACHE_DIR)) return
      if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
    } catch (err) {
      console.error('ai:deleteCacheFile error:', err)
    }
  }, 'ai:deleteCacheFile'))

  ipcMain.handle('ai:listCacheFiles', wrapHandler(() => {
    try {
      ensureDir(AI_CACHE_DIR)
      return fs.readdirSync(AI_CACHE_DIR).filter(name => name.endsWith('.json'))
    } catch {
      return []
    }
  }, 'ai:listCacheFiles'))
}
