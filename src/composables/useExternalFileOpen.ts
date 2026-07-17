/**
 * 外部文件打开支持 Composable
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

  async function handleExternalFileOpen(filePath: string): Promise<void> {
    if (!filePath) return

    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase()

    if (ext === '.md') {
      if (appModeStore.isReaderMode) {
        appModeStore.switchToNote()
      }
      router.push({ name: 'note' })
      // 等待路由切换完成后再打开文件
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('note-open-external', {
          detail: { filePath }
        }))
      }, 100)
    } else if (BOOK_EXTS.has(ext)) {
      if (appModeStore.isNoteMode) {
        appModeStore.switchToReader()
      }

      try {
        await library.importBook([filePath])
        const { hashPath } = await import('@/services/fileService')
        const bookId = hashPath(filePath)
        const book = library.books.find(b => b.id === bookId)

        if (book && !book.invalid) {
          reader.openBook(book)
          router.push({ name: 'reader', params: { bookId } })
        }
      } catch (err) {
        console.error('Failed to open external book:', err)
      }
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
