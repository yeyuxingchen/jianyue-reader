import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Book, TocItem } from '@/types'
import { db } from '@/services/dbService'
import { detectFormat } from '@/services/fileService'

export const useReaderStore = defineStore('reader', () => {
  const currentBook = ref<Book | null>(null)
  const rendition = ref<any>(null)
  const currentCfi = ref('')
  const currentChapterTitle = ref('')
  const toc = ref<TocItem[]>([])
  const isLoading = ref(false)
  const totalLocations = ref(0)
  const currentLocation = ref(0)
  const sidebarOpen = ref(false)
  const fraction = ref(0)

  const progress = computed(() => {
    if (fraction.value > 0) return Math.round(fraction.value * 100)
    if (totalLocations.value === 0) return 0
    return Math.round((currentLocation.value / totalLocations.value) * 100)
  })

  function openBook(book: Book) {
    currentBook.value = { ...book }
    isLoading.value = true
    currentCfi.value = book.lastCfi || ''
    currentChapterTitle.value = ''
    toc.value = []
    totalLocations.value = book.totalLocations || 0
    currentLocation.value = 0
    sidebarOpen.value = false
  }

  function closeBook() {
    saveProgress()
    currentBook.value = null
    rendition.value = null
    currentCfi.value = ''
    currentChapterTitle.value = ''
    toc.value = []
    isLoading.value = false
    totalLocations.value = 0
    currentLocation.value = 0
    fraction.value = 0
    sidebarOpen.value = false
  }

  function setRendition(r: any) {
    rendition.value = r
  }

  function setToc(items: TocItem[]) {
    toc.value = items
  }

  function updateLocation(cfi: string, chapterTitle: string, location: number, total: number, frac?: number) {
    currentCfi.value = cfi
    currentChapterTitle.value = chapterTitle
    currentLocation.value = location
    totalLocations.value = total
    if (frac !== undefined) fraction.value = frac
  }

  function saveProgress() {
    if (!currentBook.value) return
    const updates: Partial<Book> = {
      lastCfi: currentCfi.value,
      progress: progress.value,
      lastReadAt: Date.now(),
      totalLocations: totalLocations.value,
    }
    db.saveBooks(
      db.getBooks().map((b) =>
        b.id === currentBook.value!.id ? { ...b, ...updates } : b
      )
    )
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    currentBook,
    rendition,
    currentCfi,
    currentChapterTitle,
    toc,
    isLoading,
    totalLocations,
    currentLocation,
    sidebarOpen,
    progress,
    openBook,
    closeBook,
    setRendition,
    setToc,
    updateLocation,
    saveProgress,
    toggleSidebar,
  }
})
