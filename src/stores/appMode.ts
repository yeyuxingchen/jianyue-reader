import { defineStore } from 'pinia'
import { ref, computed, watch, toRaw } from 'vue'
import type { AppMode } from '@/types'
import { db } from '@/services/dbService'
import { electronStore } from '@/services/electronStore'

export const useAppModeStore = defineStore('appMode', () => {
  const appMode = ref<AppMode>('reader')

  const isNoteMode = computed(() => appMode.value === 'note')
  const isReaderMode = computed(() => appMode.value === 'reader')

  function loadMode() {
    const saved = db.getSettings<AppMode>()
    if (saved === 'note' || saved === 'reader') {
      appMode.value = saved
    }
  }

  function saveMode() {
    db.saveSettings(appMode.value)
  }

  function switchToNote() {
    appMode.value = 'note'
  }

  function switchToReader() {
    appMode.value = 'reader'
  }

  function toggleMode() {
    appMode.value = appMode.value === 'reader' ? 'note' : 'reader'
  }

  // 模式变化时自动持久化
  watch(appMode, () => {
    saveMode()
  })

  return {
    appMode,
    isNoteMode,
    isReaderMode,
    loadMode,
    switchToNote,
    switchToReader,
    toggleMode,
  }
})

export const useNoteEditorStore = defineStore('noteEditor', () => {
  // 当前文件信息
  const currentFilePath = ref<string | null>(null)
  const currentFileName = ref<string>('未命名')
  const isModified = ref(false)
  const lastSavedContent = ref('')

  // 编辑器实例引用
  const editorInstance = ref<any>(null)

  // 源码模式
  const sourceMode = ref(false)

  const hasFile = computed(() => !!currentFilePath.value)

  function setEditorInstance(instance: any) {
    editorInstance.value = instance
  }

  function newFile() {
    currentFilePath.value = null
    currentFileName.value = '未命名'
    isModified.value = false
    lastSavedContent.value = ''
    sourceMode.value = false
  }

  function openFile(filePath: string, fileName: string, content: string) {
    currentFilePath.value = filePath
    currentFileName.value = fileName
    lastSavedContent.value = content
    isModified.value = false
    sourceMode.value = false
  }

  function markModified() {
    isModified.value = true
  }

  function markSaved() {
    isModified.value = false
  }

  function reset() {
    currentFilePath.value = null
    currentFileName.value = '未命名'
    isModified.value = false
    lastSavedContent.value = ''
    editorInstance.value = null
  }

  // ===== 草稿持久化 =====
  const DRAFT_KEY = 'note:draft'

  interface DraftData {
    filePath: string | null
    fileName: string
    content: string
    sourceMode: boolean
    sourceContent: string
  }

  function saveDraft(content: string, sourceContent: string) {
    const draft: DraftData = {
      filePath: currentFilePath.value,
      fileName: currentFileName.value,
      content,
      sourceMode: sourceMode.value,
      sourceContent,
    }
    try {
      electronStore.setItem(DRAFT_KEY, toRaw(draft))
    } catch (err) {
      console.error('保存草稿失败:', err)
    }
  }

  function loadDraft(): DraftData | null {
    try {
      const raw = electronStore.getItem(DRAFT_KEY)
      if (raw && typeof raw === 'object') {
        // 确保返回纯对象，避免响应式代理问题
        const draft = {
          filePath: raw.filePath,
          fileName: raw.fileName,
          content: raw.content,
          sourceMode: raw.sourceMode,
          sourceContent: raw.sourceContent,
        }
        return draft as DraftData
      }
    } catch (err) {
      console.error('读取草稿失败:', err)
    }
    return null
  }

  function clearDraft() {
    try {
      electronStore.setItem(DRAFT_KEY, null)
    } catch {}
  }

  return {
    currentFilePath,
    currentFileName,
    isModified,
    lastSavedContent,
    editorInstance,
    hasFile,
    sourceMode,
    setEditorInstance,
    newFile,
    openFile,
    markModified,
    markSaved,
    reset,
    saveDraft,
    loadDraft,
    clearDraft,
  }
})
