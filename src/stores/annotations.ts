import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Bookmark, Annotation, AnnotationColor } from '@/types'
import { db } from '@/services/dbService'
import { extractExcerpt, generateCfiKey } from '@/utils/cfi'

export const useAnnotationsStore = defineStore('annotations', () => {
  const bookmarks = ref<Bookmark[]>([])
  const annotations = ref<Annotation[]>([])
  const currentBookId = ref('')

  function loadForBook(bookId: string) {
    currentBookId.value = bookId
    bookmarks.value = db.getBookmarks(bookId)
    annotations.value = db.getAnnotations(bookId)
  }

  function addBookmark(cfi: string, chapterTitle: string, excerpt: string) {
    const bm: Bookmark = {
      id: generateCfiKey(cfi + Date.now()),
      bookId: currentBookId.value,
      cfi,
      chapterTitle,
      excerpt: extractExcerpt(excerpt),
      createdAt: Date.now(),
    }
    bookmarks.value.push(bm)
    db.saveBookmarks(currentBookId.value, bookmarks.value)
  }

  function removeBookmark(id: string) {
    bookmarks.value = bookmarks.value.filter((b) => b.id !== id)
    db.saveBookmarks(currentBookId.value, bookmarks.value)
  }

  function addAnnotation(
    cfiRange: string,
    text: string,
    color: AnnotationColor,
    chapterTitle: string,
    note?: string
  ) {
    const existing = annotations.value.find((a) => a.cfiRange === cfiRange)
    if (existing) {
      existing.color = color
      if (note !== undefined) existing.note = note
      existing.text = extractExcerpt(text, 200)
      existing.chapterTitle = chapterTitle
      db.saveAnnotations(currentBookId.value, annotations.value)
      return existing
    }
    const ann: Annotation = {
      id: generateCfiKey(cfiRange + Date.now()),
      bookId: currentBookId.value,
      cfiRange,
      color,
      text: extractExcerpt(text, 200),
      note,
      chapterTitle,
      createdAt: Date.now(),
    }
    annotations.value.push(ann)
    db.saveAnnotations(currentBookId.value, annotations.value)
    return ann
  }

  function removeAnnotation(id: string) {
    annotations.value = annotations.value.filter((a) => a.id !== id)
    db.saveAnnotations(currentBookId.value, annotations.value)
  }

  function updateAnnotationNote(id: string, note: string) {
    const ann = annotations.value.find((a) => a.id === id)
    if (ann) {
      ann.note = note
      db.saveAnnotations(currentBookId.value, annotations.value)
    }
  }

  const sortedBookmarks = computed(() =>
    [...bookmarks.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  const sortedAnnotations = computed(() =>
    [...annotations.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  const notesWithText = computed(() =>
    annotations.value.filter((a) => a.note)
  )

  return {
    bookmarks,
    annotations,
    currentBookId,
    sortedBookmarks,
    sortedAnnotations,
    notesWithText,
    loadForBook,
    addBookmark,
    removeBookmark,
    addAnnotation,
    removeAnnotation,
    updateAnnotationNote,
  }
})
