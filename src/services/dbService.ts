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

  getAISettings<T = any>(): T | null {
    const raw = electronStore.getItem(KEY.aiSettings)
    return raw ? JSON.parse(raw as string) : null
  },

  saveAISettings(settings: any) {
    electronStore.setItem(KEY.aiSettings, JSON.stringify(settings))
  },

  getAIChatMeta<T = any>(bookId: string): T | null {
    const raw = electronStore.getItem(KEY.aiChatMeta(bookId))
    return raw ? JSON.parse(raw as string) : null
  },

  saveAIChatMeta(bookId: string, meta: any) {
    electronStore.setItem(KEY.aiChatMeta(bookId), JSON.stringify(meta))
  },
}
