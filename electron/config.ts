/**
 * 共享配置 - 数据目录路径和工具函数
 */

import { app } from 'electron'
import { join } from 'path'
import fs from 'node:fs'

// 数据目录
export const BASE_DIR = join(app.getPath('userData'), 'jianyue-reader')
export const COVERS_DIR = join(BASE_DIR, 'covers')
export const BOOKS_DIR = join(BASE_DIR, 'books')
export const FONTS_DIR = join(BASE_DIR, 'fonts')
export const AI_CACHE_DIR = join(BASE_DIR, 'ai-cache')
export const IMAGES_DIR = join(BASE_DIR, 'images')

/**
 * 确保目录存在
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 初始化所有数据目录
 */
export function initDirs(): void {
  ensureDir(BASE_DIR)
  ensureDir(COVERS_DIR)
  ensureDir(BOOKS_DIR)
  ensureDir(FONTS_DIR)
  ensureDir(AI_CACHE_DIR)
}
