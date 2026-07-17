import { defineStore } from 'pinia'
import { ref, computed, watch, toRaw } from 'vue'
import type { AppMode } from '@/types'
import { db } from '@/services/dbService'
import { electronStore } from '@/services/electronStore'
import { router } from '@/router'

export const useAppModeStore = defineStore('appMode', () => {
  const appMode = ref<AppMode>('reader')

  const isNoteMode = computed(() => appMode.value === 'note')
  const isReaderMode = computed(() => appMode.value === 'reader')

  function loadMode() {
    const saved = db.getSettings<AppMode>()
    if (saved === 'note' || saved === 'reader') {
      appMode.value = saved
      // 根据保存的模式导航到对应路由
      if (saved === 'note') {
        router.push('/note')
      } else {
        router.push('/')
      }
    }
  }

  function saveMode() {
    db.saveSettings(appMode.value)
  }

  function switchToNote() {
    appMode.value = 'note'
    router.push('/note')
  }

  function switchToReader() {
    appMode.value = 'reader'
    router.push('/')
  }

  function toggleMode() {
    if (appMode.value === 'reader') {
      switchToNote()
    } else {
      switchToReader()
    }
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
  const currentFilePath = ref<string | null>(null)
  const currentFileName = ref<string>('未命名')
  const isModified = ref(false)
  const lastSavedContent = ref('')

  const editorInstance = ref<any>(null)

  const sourceMode = ref(false)

  // 待同步标志：openFile/newFile 后置 true，markdownUpdated 首次触发时
  // 把 lastSavedContent 同步为当前 markdown 字符串后置 false
  const pendingBaselineSync = ref(false)

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
    pendingBaselineSync.value = true
  }

  function openFile(filePath: string, fileName: string, content: string) {
    currentFilePath.value = filePath
    currentFileName.value = fileName
    lastSavedContent.value = content
    isModified.value = false
    sourceMode.value = false
    // 标记：等待 markdownUpdated 首次触发时，把 lastSavedContent
    // 同步为序列化后的 markdown 字符串（消除磁盘原文与 serializer 之间的微差异）
    pendingBaselineSync.value = true
  }

  function markModified() {
    isModified.value = true
  }

  function markSaved() {
    isModified.value = false
  }

  /**
   * 同步"内容基准"为当前 markdown 字符串。
   * 用于在 openFile/replaceContent 后，markdownUpdated 首次触发时调用：
   * 把 lastSavedContent 更新为序列化后的内容，作为后续"是否修改"判定的基准。
   * 这样既不丢失"用户编辑会被识别为已修改"的能力，又能消除磁盘原文的微差异。
   */
  function syncBaseline(markdown: string) {
    lastSavedContent.value = markdown
    pendingBaselineSync.value = false
  }

  /** 取消待同步标志（例如用户主动保存时，lastSavedContent 已经是正确的 markdown） */
  function clearPendingBaselineSync() {
    pendingBaselineSync.value = false
  }

  function reset() {
    currentFilePath.value = null
    currentFileName.value = '未命名'
    isModified.value = false
    lastSavedContent.value = ''
    editorInstance.value = null
    pendingBaselineSync.value = false
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
    pendingBaselineSync,
    editorInstance,
    hasFile,
    sourceMode,
    setEditorInstance,
    newFile,
    openFile,
    markModified,
    markSaved,
    syncBaseline,
    clearPendingBaselineSync,
    reset,
    saveDraft,
    loadDraft,
    clearDraft,
  }
})
