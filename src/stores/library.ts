import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Book, SortBy } from '@/types'
import { db } from '@/services/dbService'
import { detectFormat, hashPath, extractBookTitle, extractTxtMetadata } from '@/services/fileService'
import { extractCoverFromFile } from '@/services/foliateService'
import { compressCoverToJpeg } from '@/utils/cover'
import { electronStore } from '@/services/electronStore'

const SORT_BY_KEY = 'reader:sortBy'

function getPersistedSortBy(): SortBy {
  const raw = electronStore.getItem(SORT_BY_KEY)
  const val = raw ? JSON.parse(raw as string) : null
  const valid: SortBy[] = ['lastRead', 'title', 'progress', 'addedAt', 'custom']
  return valid.includes(val) ? val : 'lastRead'
}

function persistSortBy(val: SortBy) {
  electronStore.setItem(SORT_BY_KEY, JSON.stringify(val))
}

export const useLibraryStore = defineStore('library', () => {
  const books = ref<Book[]>([])
  const searchQuery = ref('')
  const sortBy = ref<SortBy>(getPersistedSortBy())
  const isLoading = ref(false)

  const filteredBooks = computed(() => {
    let result = [...books.value]

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      switch (sortBy.value) {
        case 'lastRead':
          return b.lastReadAt - a.lastReadAt
        case 'title':
          return a.title.localeCompare(b.title, 'zh-CN')
        case 'progress':
          return b.progress - a.progress
        case 'addedAt':
          return b.addedAt - a.addedAt
        case 'custom': {
          const aHasIndex = typeof a.sortIndex === 'number'
          const bHasIndex = typeof b.sortIndex === 'number'
          if (aHasIndex && bHasIndex) {
            return a.sortIndex! - b.sortIndex!
          }
          if (aHasIndex && !bHasIndex) {
            return -1
          }
          if (!aHasIndex && bHasIndex) {
            return 1
          }
          return b.addedAt - a.addedAt
        }
        default:
          return 0
      }
    })

    return result
  })

  const isCustomSort = computed(() => sortBy.value === 'custom')

  function setSortBy(val: SortBy) {
    sortBy.value = val
    persistSortBy(val)
  }

  function loadBooks() {
    books.value = db.getBooks()
    extractMissingCovers()
  }

  async function extractMissingCovers() {
    const booksNeedingCover = books.value.filter(b => !b.coverKey)
    if (booksNeedingCover.length === 0) return
    for (const book of booksNeedingCover) {
      try {
        const coverPath = await saveCoverForBook(book.id, book.filePath)
        if (coverPath) {
          updateBook(book.id, { coverKey: coverPath })
        }
      } catch {}
    }
  }

  async function saveCoverForBook(bookId: string, filePath: string): Promise<string | null> {
    const format = detectFormat(filePath)

    // Electron 环境下，EPUB 封面提取直接在主进程完成，
    // 避免在渲染进程中加载 zip.js 导致崩溃（foliate-js 的 zip 解析在 Electron 渲染进程中有兼容性问题）
    if (format === 'EPUB') {
      try {
        const zipCover = await window.services.findEpubCover(bookId, filePath)
        if (zipCover) return zipCover
      } catch {}
      return null
    }

    try {
      const coverDataUrl = await extractCoverFromFile(filePath)
      if (coverDataUrl) {
        const compressed = await compressCoverToJpeg(coverDataUrl)
        if (compressed) {
          const saved = await db.saveCover(bookId, compressed)
          if (saved) return saved
        }
      }
      return null
    } catch {
      return null
    }
  }

  async function importBook(filePaths: string[]) {
    isLoading.value = true
    try {
      const existingBooks = [...books.value]
      const existingIds = new Set(existingBooks.map((b) => b.id))

      for (const srcPath of filePaths) {
        const format = detectFormat(srcPath)
        const id = hashPath(srcPath)
        if (existingIds.has(id)) continue

        const fileName = srcPath.split(/[/\\]/).pop() || '未知书名'
        let title = extractBookTitle(srcPath)
        let author = ''
        if (format === 'TXT') {
          const meta = await extractTxtMetadata(srcPath, fileName)
          title = meta.title
          author = meta.author
        }
        const now = Date.now()

        const cachedPath = await window.services.copyBookToCache(id, srcPath)

        const book: Book = {
          id,
          title,
          author,
          format,
          filePath: cachedPath,
          progress: 0,
          lastReadAt: now,
          addedAt: now,
        }

        const coverPath = await saveCoverForBook(id, cachedPath)
        if (coverPath) {
          book.coverKey = coverPath
        }

        existingBooks.unshift(book)
        existingIds.add(id)
      }

      books.value = existingBooks
      db.saveBooks(existingBooks)
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBook(bookId: string) {
    const book = books.value.find((b) => b.id === bookId)
    if (book) {
      if (book.coverKey) {
        db.removeCover(book.coverKey)
      }
      await window.services.deleteCachedBook(book.filePath)
    }
    books.value = books.value.filter((b) => b.id !== bookId)
    db.saveBooks(books.value)
  }

  function updateBook(bookId: string, updates: Partial<Book>) {
    const idx = books.value.findIndex((b) => b.id === bookId)
    if (idx !== -1) {
      books.value[idx] = { ...books.value[idx], ...updates }
      db.saveBooks(books.value)
    }
  }

  async function checkPathValidity() {
    let changed = false
    for (const book of books.value) {
      const exists = await window.services.cachedBookExists(book.filePath)
      if (book.invalid !== !exists) {
        book.invalid = !exists
        changed = true
      }
    }
    if (changed) {
      db.saveBooks(books.value)
    }
  }

  async function relocateBook(bookId: string, newFilePath: string) {
    const idx = books.value.findIndex((b) => b.id === bookId)
    if (idx !== -1) {
      const oldPath = books.value[idx].filePath
      const newId = hashPath(newFilePath)
      const cachedPath = await window.services.copyBookToCache(newId, newFilePath)
      if (oldPath) {
        await window.services.deleteCachedBook(oldPath)
      }
      if (books.value[idx].coverKey) {
        db.removeCover(books.value[idx].coverKey!)
      }
      books.value[idx].filePath = cachedPath
      books.value[idx].id = newId
      books.value[idx].title = extractBookTitle(newFilePath)
      books.value[idx].format = detectFormat(newFilePath)
      books.value[idx].invalid = false
      books.value[idx].coverKey = undefined
      db.saveBooks(books.value)
      saveCoverForBook(newId, cachedPath).then(coverPath => {
        if (coverPath) updateBook(newId, { coverKey: coverPath })
      })
    }
  }

  function reorderBooks(orderedIds: string[]) {
    const now = Date.now()
    const bookMap = new Map(books.value.map(b => [b.id, b]))
    const newBooks: Book[] = []

    for (let i = 0; i < orderedIds.length; i++) {
      const book = bookMap.get(orderedIds[i])
      if (book) {
        newBooks.push({ ...book, sortIndex: now + i })
      }
    }

    for (const book of books.value) {
      if (!orderedIds.includes(book.id)) {
        newBooks.push(book)
      }
    }

    books.value = newBooks
    db.saveBooks(newBooks)
  }

  return {
    books,
    searchQuery,
    sortBy,
    isLoading,
    filteredBooks,
    isCustomSort,
    loadBooks,
    importBook,
    deleteBook,
    updateBook,
    checkPathValidity,
    relocateBook,
    setSortBy,
    reorderBooks,
  }
})
