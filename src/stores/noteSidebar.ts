import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import { electronStore } from '@/services/electronStore'

const HISTORY_STORAGE_KEY = 'note:file-history'
const WIDTH_STORAGE_KEY = 'note:sidebar-width'
const MAX_HISTORY = 50
const DEFAULT_WIDTH = 240
const MIN_WIDTH = 150
const MAX_WIDTH = 500

export interface NoteHistoryItem {
  filePath: string
  fileName: string
  lastOpenedAt: number
  lastContent?: string
}

export interface OutlineItem {
  level: number
  text: string
  line: number
  id: string
}

export type SidebarPanel = 'history' | 'outline' | null

export const useNoteSidebarStore = defineStore('noteSidebar', () => {
  // ===== 侧边栏面板状态 =====
  const activePanel = ref<SidebarPanel>(null)
  const lastPanel = ref<'history' | 'outline'>('history')
  const panelWidth = ref(DEFAULT_WIDTH)

  function togglePanel(panel: 'history' | 'outline') {
    if (activePanel.value === panel) {
      activePanel.value = null
    } else {
      activePanel.value = panel
      lastPanel.value = panel
    }
  }

  function closePanel() {
    if (activePanel.value) {
      lastPanel.value = activePanel.value
    }
    activePanel.value = null
  }

  function reopenLastPanel() {
    activePanel.value = lastPanel.value
  }

  function loadPanelWidth() {
    const saved = electronStore.getItem(WIDTH_STORAGE_KEY)
    if (typeof saved === 'number' && saved >= MIN_WIDTH && saved <= MAX_WIDTH) {
      panelWidth.value = saved
    }
  }

  function savePanelWidth() {
    electronStore.setItem(WIDTH_STORAGE_KEY, panelWidth.value)
  }

  // ===== 历史记录 =====
  const history = ref<NoteHistoryItem[]>([])

  function loadHistory() {
    const raw = electronStore.getItem(HISTORY_STORAGE_KEY)
    if (Array.isArray(raw)) {
      history.value = raw
    }
  }

  function saveHistory() {
    electronStore.setItem(HISTORY_STORAGE_KEY, toRaw(history.value))
  }

  function addToHistory(filePath: string, fileName: string, content?: string) {
    // 移除已存在的同路径记录
    history.value = history.value.filter(h => h.filePath !== filePath)
    // 添加到头部
    history.value.unshift({
      filePath,
      fileName,
      lastOpenedAt: Date.now(),
      lastContent: content?.slice(0, 200),
    })
    // 限制数量
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    saveHistory()
  }

  function removeFromHistory(filePath: string) {
    history.value = history.value.filter(h => h.filePath !== filePath)
    saveHistory()
  }

  function clearHistory() {
    history.value = []
    saveHistory()
  }

  // ===== 文档大纲 =====
  const outline = ref<OutlineItem[]>([])

  function parseOutline(markdown: string) {
    const lines = markdown.split('\n')
    const items: OutlineItem[] = []
    let inCodeBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 跳过代码块
      if (line.trimStart().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }
      if (inCodeBlock) continue

      const match = line.match(/^(#{1,6})\s+(.+)/)
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].replace(/[#*_`]/g, '').trim(),
          line: i,
          id: `heading-${i}`,
        })
      }
    }

    outline.value = items
  }

  return {
    activePanel,
    lastPanel,
    togglePanel,
    closePanel,
    reopenLastPanel,
    panelWidth,
    loadPanelWidth,
    savePanelWidth,
    history,
    loadHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    outline,
    parseOutline,
  }
})
