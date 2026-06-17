/**
 * 安全模块 - 文件路径验证和敏感数据加密
 */

import { app, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'

// ==================== 文件路径验证 ====================

// 默认允许访问的目录
const DEFAULT_ALLOWED_DIR_KEYS = [
  'userData',
  'documents',
  'downloads',
  'desktop',
  'temp',
]

let allowedDirs: string[] = []
let userAuthorizedDirs: string[] = []

/**
 * 获取用户授权目录配置文件路径
 */
function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'authorized-dirs.json')
}

/**
 * 加载用户授权的目录
 */
function loadUserAuthorizedDirs(): string[] {
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return Array.isArray(data.dirs) ? data.dirs : []
    }
  } catch (err) {
    console.error('Failed to load authorized dirs:', err)
  }
  return []
}

/**
 * 保存用户授权的目录
 */
function saveUserAuthorizedDirs(dirs: string[]): void {
  const configPath = getConfigPath()
  try {
    fs.writeFileSync(configPath, JSON.stringify({ dirs }, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save authorized dirs:', err)
  }
}

/**
 * 初始化安全模块
 */
export function initSecurity(): void {
  // 获取默认允许的目录
  allowedDirs = DEFAULT_ALLOWED_DIR_KEYS
    .map(key => {
      try {
        return app.getPath(key as any)
      } catch {
        return null
      }
    })
    .filter(Boolean) as string[]

  // 加载用户授权的目录
  userAuthorizedDirs = loadUserAuthorizedDirs()

  console.log('[Security] Initialized with allowed dirs:', allowedDirs.length)
}

/**
 * 验证文件路径是否在允许范围内
 */
export function isPathAllowed(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false
  }

  try {
    const resolvedPath = path.resolve(filePath)
    const allDirs = [...allowedDirs, ...userAuthorizedDirs]

    return allDirs.some(dir => {
      const resolvedDir = path.resolve(dir)
      return (
        resolvedPath === resolvedDir ||
        resolvedPath.startsWith(resolvedDir + path.sep)
      )
    })
  } catch {
    return false
  }
}

/**
 * 验证文件路径，不允许则抛出错误
 */
export function validateFilePath(filePath: string): string {
  if (!isPathAllowed(filePath)) {
    throw new Error(`Access denied: ${filePath}`)
  }
  return path.resolve(filePath)
}

/**
 * 添加用户授权目录
 */
export function addAuthorizedDir(dirPath: string): boolean {
  try {
    const resolvedPath = path.resolve(dirPath)

    // 验证目录存在且是目录
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      return false
    }

    // 检查是否已在默认目录中
    if (allowedDirs.includes(resolvedPath)) {
      return true
    }

    // 检查是否已在用户目录中
    if (userAuthorizedDirs.includes(resolvedPath)) {
      return true
    }

    // 添加到用户目录列表
    userAuthorizedDirs.push(resolvedPath)
    saveUserAuthorizedDirs(userAuthorizedDirs)

    console.log('[Security] Added authorized dir:', resolvedPath)
    return true
  } catch (err) {
    console.error('[Security] Failed to add authorized dir:', err)
    return false
  }
}

/**
 * 移除用户授权目录
 */
export function removeAuthorizedDir(dirPath: string): boolean {
  try {
    const resolvedPath = path.resolve(dirPath)
    const index = userAuthorizedDirs.indexOf(resolvedPath)

    if (index === -1) {
      return false
    }

    userAuthorizedDirs.splice(index, 1)
    saveUserAuthorizedDirs(userAuthorizedDirs)

    console.log('[Security] Removed authorized dir:', resolvedPath)
    return true
  } catch (err) {
    console.error('[Security] Failed to remove authorized dir:', err)
    return false
  }
}

/**
 * 获取所有授权目录
 */
export function getAuthorizedDirs(): { default: string[]; user: string[] } {
  return {
    default: [...allowedDirs],
    user: [...userAuthorizedDirs],
  }
}

// ==================== 敏感数据加密 ====================

/**
 * 检查加密是否可用
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

/**
 * 加密字符串
 */
export function encryptString(plaintext: string): string {
  if (!isEncryptionAvailable()) {
    // 降级: Base64 编码 (不安全，但至少不是明文)
    console.warn('[Security] Encryption not available, falling back to Base64')
    return Buffer.from(plaintext, 'utf-8').toString('base64')
  }

  const encrypted = safeStorage.encryptString(plaintext)
  return encrypted.toString('base64')
}

/**
 * 解密字符串
 */
export function decryptString(encryptedBase64: string): string {
  if (!isEncryptionAvailable()) {
    // 降级: Base64 解码
    return Buffer.from(encryptedBase64, 'base64').toString('utf-8')
  }

  try {
    const buffer = Buffer.from(encryptedBase64, 'base64')
    return safeStorage.decryptString(buffer).toString()
  } catch (err) {
    console.error('[Security] Decryption failed:', err)
    // 尝试 Base64 解码 (可能是旧格式)
    return Buffer.from(encryptedBase64, 'base64').toString('utf-8')
  }
}

/**
 * 加密 JSON 对象
 */
export function encryptJSON(obj: any): string {
  const plaintext = JSON.stringify(obj)
  return encryptString(plaintext)
}

/**
 * 解密 JSON 对象
 */
export function decryptJSON<T = any>(encryptedBase64: string): T | null {
  try {
    const plaintext = decryptString(encryptedBase64)
    return JSON.parse(plaintext) as T
  } catch (err) {
    console.error('[Security] Failed to decrypt JSON:', err)
    return null
  }
}
