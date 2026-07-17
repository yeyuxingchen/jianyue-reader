import type { Book, Bookmark, Annotation } from '@/types'
import { electronStore } from './electronStore'

const KEY = {
  books: 'reader:books',
  bookmarks: (bookId: string) => `reader:bm:${bookId}`,
  annotations: (bookId: string) => `reader:ann:${bookId}`,
  settings: 'reader:settings',
  fonts: 'reader:fonts',
  aiSettings: 'reader:ai-settings',
  aiChatMeta: (bookId: string) => `reader:ai-chat:${bookId}`,
}

const ENCRYPTED_PREFIX = 'ENCRYPTED:'

function isEncrypted(data: string): boolean {
  return data.startsWith(ENCRYPTED_PREFIX)
}

function getSecurityAPI() {
  return window.electronAPI?.security
}

export const db = {
  getBooks(): Book[] {
    const raw = electronStore.getItem(KEY.books)
    return raw ? JSON.parse(raw as string) : []
  },

  saveBooks(books: Book[]) {
    electronStore.setItem(KEY.books, JSON.stringify(books))
  },

  getBookmarks(bookId: string): Bookmark[] {
    const raw = electronStore.getItem(KEY.bookmarks(bookId))
    return raw ? JSON.parse(raw as string) : []
  },

  saveBookmarks(bookId: string, bms: Bookmark[]) {
    electronStore.setItem(KEY.bookmarks(bookId), JSON.stringify(bms))
  },

  getAnnotations(bookId: string): Annotation[] {
    const raw = electronStore.getItem(KEY.annotations(bookId))
    return raw ? JSON.parse(raw as string) : []
  },

  saveAnnotations(bookId: string, anns: Annotation[]) {
    electronStore.setItem(KEY.annotations(bookId), JSON.stringify(anns))
  },

  getSettings<T = any>(): T | null {
    const raw = electronStore.getItem(KEY.settings)
    return raw ? JSON.parse(raw as string) : null
  },

  saveSettings(settings: any) {
    electronStore.setItem(KEY.settings, JSON.stringify(settings))
  },

  async saveCover(bookId: string, dataUrl: string): Promise<string | null> {
    return await window.services.saveCoverFile(bookId, dataUrl)
  },

  async removeCover(coverPath: string): Promise<void> {
    await window.services.deleteCoverFile(coverPath)
  },

  getFonts<T = any>(): T[] {
    const raw = electronStore.getItem(KEY.fonts)
    return raw ? JSON.parse(raw as string) : []
  },

  saveFonts(fonts: any[]) {
    electronStore.setItem(KEY.fonts, JSON.stringify(fonts))
  },

  /**
   * 获取 AI 设置（支持加密）
   */
  async getAISettings<T = any>(): Promise<T | null> {
    const raw = electronStore.getItem(KEY.aiSettings)
    if (!raw) return null

    const data = raw as string

    if (isEncrypted(data)) {
      const securityAPI = getSecurityAPI()
      if (securityAPI) {
        try {
          const encryptedData = data.substring(ENCRYPTED_PREFIX.length)
          const decrypted = await securityAPI.decryptData(encryptedData)
          return JSON.parse(decrypted) as T
        } catch (err) {
          console.error('Failed to decrypt AI settings:', err)
          return null
        }
      }
    }

    // 未加密或安全 API 不可用，直接解析
    try {
      return JSON.parse(data) as T
    } catch {
      return null
    }
  },

  /**
   * 保存 AI 设置（支持加密）
   */
  async saveAISettings(settings: any) {
    const securityAPI = getSecurityAPI()
    const jsonData = JSON.stringify(settings)

    if (securityAPI) {
      try {
        const encrypted = await securityAPI.encryptData(jsonData)
        electronStore.setItem(KEY.aiSettings, ENCRYPTED_PREFIX + encrypted)
        return
      } catch (err) {
        console.error('Failed to encrypt AI settings, saving as plain text:', err)
      }
    }

    // 降级：明文存储
    electronStore.setItem(KEY.aiSettings, jsonData)
  },

  getAIChatMeta<T = any>(bookId: string): T | null {
    const raw = electronStore.getItem(KEY.aiChatMeta(bookId))
    return raw ? JSON.parse(raw as string) : null
  },

  saveAIChatMeta(bookId: string, meta: any) {
    electronStore.setItem(KEY.aiChatMeta(bookId), JSON.stringify(meta))
  },
}
