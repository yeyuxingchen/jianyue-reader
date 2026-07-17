/**
 * 外部文件打开支持 Composable
 * 处理双击 md/书籍文件唤起本应用时的文件加载：
 * - md 文件：切换到简记模式，触发 note-open-external 事件由 NoteEditor 处理（含未保存拦截）
 * - 书籍文件：切换到简阅模式，导入（已存在则跳过）并打开
 */

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAppModeStore } from '@/stores/appMode'
import { useLibraryStore } from '@/stores/library'
import { useReaderStore } from '@/stores/reader'

const BOOK_EXTS = new Set(['.epub', '.txt', '.mobi', '.azw3', '.cbz', '.cbr'])

export function useExternalFileOpen() {
  const router = useRouter()
  const appModeStore = useAppModeStore()
  const library = useLibraryStore()
  const reader = useReaderStore()

  const isReady = ref(false)
  let cleanup: (() => void) | null = null

  // 防抖：首次启动时 onFileOpen 监听器与 getPendingFilePath 可能同时触发同一路径
  let lastHandled: { path: string; time: number } | null = null

  /**
   * 打开 md 文件：切换到简记模式，dispatch 事件交由 NoteEditor 处理。
   * NoteEditor 内部会处理未保存拦截（弹出保存对话框）。
   */
  async function openMarkdownFile(filePath: string): Promise<void> {
    if (appModeStore.isReaderMode) {
      appModeStore.switchToNote()
    }
    await router.push({ name: 'note' })
    // 等待路由切换 + NoteEditor 挂载后再 dispatch 事件
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('note-open-external', {
        detail: { filePath }
      }))
    }, 100)
  }

  /**
   * 打开书籍文件：切换到简阅模式，确保书架已加载后导入并打开。
   * 已存在的书籍直接打开，不重复导入。
   */
  async function openBookFile(filePath: string): Promise<void> {
    if (appModeStore.isNoteMode) {
      appModeStore.switchToReader()
    }

    try {
      // 确保书架数据已加载到内存（首次启动时 Bookshelf 可能还未挂载）
      library.loadBooks()

      const { hashPath } = await import('@/services/fileService')
      const bookId = hashPath(filePath)

      // 已存在则直接打开，不重复导入
      const existing = library.books.find(b => b.id === bookId)
      if (existing && !existing.invalid) {
        reader.openBook(existing)
        await router.push({ name: 'reader', params: { bookId } })
        return
      }

      // 不存在则导入后打开
      await library.importBook([filePath])
      const book = library.books.find(b => b.id === bookId)

      if (book && !book.invalid) {
        reader.openBook(book)
        await router.push({ name: 'reader', params: { bookId } })
      }
    } catch (err) {
      console.error('Failed to open external book:', err)
    }
  }

  async function handleExternalFileOpen(filePath: string): Promise<void> {
    if (!filePath) return

    // 防抖：2 秒内同一文件路径只处理一次，避免首次启动重复提示
    const now = Date.now()
    if (lastHandled && lastHandled.path === filePath && now - lastHandled.time < 2000) {
      return
    }
    lastHandled = { path: filePath, time: now }

    const dotIdx = filePath.lastIndexOf('.')
    if (dotIdx < 0) return
    const ext = filePath.substring(dotIdx).toLowerCase()

    if (ext === '.md') {
      await openMarkdownFile(filePath)
    } else if (BOOK_EXTS.has(ext)) {
      await openBookFile(filePath)
    }
  }

  onMounted(() => {
    isReady.value = true

    if (window.electronAPI?.onFileOpen) {
      cleanup = window.electronAPI.onFileOpen(handleExternalFileOpen)
    }

    if (window.electronAPI?.app?.getPendingFilePath) {
      window.electronAPI.app.getPendingFilePath().then((fp: string | null) => {
        if (fp) handleExternalFileOpen(fp)
      })
    }
  })

  onBeforeUnmount(() => {
    cleanup?.()
  })

  return {
    isReady,
    handleExternalFileOpen,
  }
}
