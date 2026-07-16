import { defineStore } from 'pinia'
import { ref, toRaw, isRef } from 'vue'
import { electronStore } from '@/services/electronStore'

const HISTORY_STORAGE_KEY = 'note:file-history'
const WIDTH_STORAGE_KEY = 'note:sidebar-width'
const FILE_ROOT_STORAGE_KEY = 'note:fileRootPath'
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

export interface FileNode {
  name: string
  type: 'chapter' | 'directory' | 'epub'
  path: string
  children?: FileNode[]
}

export type SidebarPanel = 'history' | 'outline' | 'files' | null

export interface CreatingState {
  type: 'chapter' | 'directory'
  parentDir: string
}

export const useNoteSidebarStore = defineStore('noteSidebar', () => {
  // ===== 侧边栏面板状态 =====
  const activePanel = ref<SidebarPanel>(null)
  const lastPanel = ref<'history' | 'outline' | 'files'>('history')
  const panelWidth = ref(DEFAULT_WIDTH)

  function togglePanel(panel: 'history' | 'outline' | 'files') {
    if (activePanel.value === panel) {
      activePanel.value = null
    } else {
      activePanel.value = panel
      lastPanel.value = panel
    }
  }

  function closePanel() {
    if (activePanel.value) {
      lastPanel.value = activePanel.value as 'history' | 'outline' | 'files'
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
    // 深拷贝以完全去除响应式属性，确保可以序列化
    const data = JSON.parse(JSON.stringify(toRaw(history.value)))
    electronStore.setItem(HISTORY_STORAGE_KEY, data)
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

  // ===== 文件目录（简记模式左侧"文件目录"面板） =====
  const fileTreeRootPath = ref<string | null>(null)
  const fileTreeNodes = ref<FileNode[]>([])
  const fileTreeLoading = ref(false)
  // 当前"转中"的节点（点击目录时设置，不打开文件）
  const selectedNodePath = ref<string | null>(null)
  // 当前正在重命名的节点路径
  const renamingPath = ref<string | null>(null)
  // epub 目录的封面路径（null 表示没有封面）
  const coverPath = ref<string | null>(null)
  // 当前正在创建的节点状态（在某个目录下创建章节/目录）
  const creatingState = ref<CreatingState | null>(null)
  // 展开的目录路径集合
  const expandedDirs = ref<Record<string, boolean>>({})
  // 新建按钮弹窗（创建章节 / 创建目录）
  const showNewPopup = ref(false)

  function loadFileRootPath() {
    const saved = electronStore.getItem(FILE_ROOT_STORAGE_KEY)
    if (typeof saved === 'string' && saved) {
      fileTreeRootPath.value = saved
      // 异步恢复封面状态
      loadCover(saved)
    }
  }

  function saveFileRootPath() {
    electronStore.setItem(FILE_ROOT_STORAGE_KEY, fileTreeRootPath.value)
  }

  /**
   * 设置文件目录根路径。
   * 不会自动刷新，调用方需要显式 refreshFileTree。
   */
  function setFileTreeRoot(path: string | null) {
    fileTreeRootPath.value = path
    if (path === null) {
      fileTreeNodes.value = []
      selectedNodePath.value = null
      renamingPath.value = null
      creatingState.value = null
      expandedDirs.value = {}
      coverPath.value = null
    }
    saveFileRootPath()
    // 切换根时异步查询封面
    if (path) {
      loadCover(path)
    }
  }

  /**
   * 加载指定 epub 目录的封面状态。
   */
  async function loadCover(dirPath: string) {
    try {
      const result = await window.services?.getEpubCover?.(dirPath)
      coverPath.value = result?.coverPath ?? null
    } catch (err) {
      console.warn('加载封面失败:', err)
      coverPath.value = null
    }
  }

  /**
   * 设置封面路径（由 UI 在成功选择/替换封面后调用）。
   */
  function setCoverPath(p: string | null) {
    coverPath.value = p
  }

  /**
   * 刷新当前根目录的文件树。
   */
  async function refreshFileTree() {
    if (!fileTreeRootPath.value) {
      fileTreeNodes.value = []
      return
    }
    fileTreeLoading.value = true
    try {
      const nodes = await window.services?.scanFileTree?.(fileTreeRootPath.value)
      fileTreeNodes.value = Array.isArray(nodes) ? nodes : []
    } catch (err) {
      console.error('刷新文件树失败:', err)
      fileTreeNodes.value = []
    } finally {
      fileTreeLoading.value = false
    }
  }

  /**
   * 在 nodes 树中查找指定路径对应的节点。
   */
  function findNode(nodes: FileNode[], p: string): FileNode | null {
    for (const n of nodes) {
      if (n.path === p) return n
      if (n.children) {
        const child = findNode(n.children, p)
        if (child) return child
      }
    }
    return null
  }

  /**
   * 根据当前状态，计算"创建章节/目录"时的 parentDir。
   * 优先级：选中的目录（若 selectedNode 是目录）→ 否则根目录。
   */
  function computeNewItemParentDir(): string | null {
    if (selectedNodePath.value) {
      const found = findNode(fileTreeNodes.value, selectedNodePath.value)
      if (found && (found.type === 'directory' || found.type === 'epub')) {
        return found.path
      }
    }
    return fileTreeRootPath.value
  }

  /**
   * 选中节点。
   * - 章节：调用方负责打开文件
   * - 目录：仅高亮
   */
  function selectNode(path: string | null) {
    selectedNodePath.value = path
  }

  /**
   * 切换目录的展开/收起。
   */
  function toggleExpand(dirPath: string) {
    expandedDirs.value = { ...expandedDirs.value, [dirPath]: !expandedDirs.value[dirPath] }
  }

  function isExpanded(dirPath: string): boolean {
    return expandedDirs.value[dirPath] === true
  }

  function startRenaming(path: string) {
    renamingPath.value = path
    creatingState.value = null
  }

  function cancelRenaming() {
    renamingPath.value = null
  }

  function startCreating(type: 'chapter' | 'directory') {
    const parentDir = computeNewItemParentDir()
    if (!parentDir) {
      throw new Error('没有可用的父目录')
    }
    creatingState.value = { type, parentDir }
    renamingPath.value = null
    // 自动展开父目录
    if (parentDir !== fileTreeRootPath.value) {
      expandedDirs.value = { ...expandedDirs.value, [parentDir]: true }
    }
  }

  function cancelCreating() {
    creatingState.value = null
  }

  // ===== 中文数字 / 阿拉伯数字互转 =====
  const CN_DIGITS: Array<{ cn: string; n: number }> = [
    { cn: '一', n: 1 },
    { cn: '二', n: 2 },
    { cn: '三', n: 3 },
    { cn: '四', n: 4 },
    { cn: '五', n: 5 },
    { cn: '六', n: 6 },
    { cn: '七', n: 7 },
    { cn: '八', n: 8 },
    { cn: '九', n: 9 },
    { cn: '十', n: 10 },
    { cn: '十一', n: 11 },
    { cn: '十二', n: 12 },
    { cn: '十三', n: 13 },
    { cn: '十四', n: 14 },
    { cn: '十五', n: 15 },
    { cn: '十六', n: 16 },
    { cn: '十七', n: 17 },
    { cn: '十八', n: 18 },
    { cn: '十九', n: 19 },
    { cn: '二十', n: 20 },
  ]

  function toCn(n: number): string {
    if (n <= 0) return ''
    const found = CN_DIGITS.find(d => d.n === n)
    if (found) return found.cn
    return String(n)
  }

  function fromCn(s: string): number {
    const found = CN_DIGITS.find(d => d.cn === s)
    if (found) return found.n
    const n = parseInt(s, 10)
    return isNaN(n) ? 0 : n
  }

  /**
   * 收集所有"章节N"形式的章节编号。
   */
  function collectChapterSequence(nodes: FileNode[]): number[] {
    const result: number[] = []
    const walk = (list: FileNode[]) => {
      for (const n of list) {
        if (n.type === 'chapter') {
          const m = n.name.match(/^章节(.+)$/)
          if (m) {
            const num = fromCn(m[1].trim())
            if (num > 0) result.push(num)
          }
        }
        if (n.children) walk(n.children)
      }
    }
    walk(nodes)
    return result
  }

  /**
   * 收集以指定前缀开头的目录编号序列（"新建目录" → 收集其后缀数字）。
   */
  function collectDirectorySequence(nodes: FileNode[], prefix: string): number[] {
    const result: number[] = []
    const walk = (list: FileNode[]) => {
      for (const n of list) {
        if ((n.type === 'directory' || n.type === 'epub') && n.name.startsWith(prefix)) {
          const tail = n.name.substring(prefix.length)
          if (tail === '') {
            result.push(0)
          } else {
            const num = fromCn(tail)
            if (num > 0) result.push(num)
            else {
              const n2 = parseInt(tail, 10)
              if (!isNaN(n2) && n2 > 0) result.push(n2)
            }
          }
        }
        if (n.children) walk(n.children)
      }
    }
    walk(nodes)
    return result
  }

  /**
   * 计算下一可用章节名（不含 .md 后缀）。
   * 默认"章节一"；存在"章节N"则 max(N)+1。
   */
  function computeNextChapterName(): string {
    const seq = collectChapterSequence(fileTreeNodes.value)
    const max = seq.length > 0 ? Math.max(...seq) : 0
    return `章节${toCn(max + 1)}`
  }

  /**
   * 计算下一可用目录名。
   * 默认"新建目录"；存在"新建目录N"则 max(N)+1。
   */
  function computeNextDirectoryName(): string {
    const prefix = '新建目录'
    const seq = collectDirectorySequence(fileTreeNodes.value, prefix)
    const max = seq.length > 0 ? Math.max(...seq) : 0
    if (max === 0) return prefix
    return `${prefix}${toCn(max + 1)}`
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
    // 文件目录
    fileTreeRootPath,
    fileTreeNodes,
    fileTreeLoading,
    selectedNodePath,
    renamingPath,
    creatingState,
    expandedDirs,
    coverPath,
    showNewPopup,
    loadFileRootPath,
    saveFileRootPath,
    setFileTreeRoot,
    refreshFileTree,
    loadCover,
    setCoverPath,
    findNode,
    computeNewItemParentDir,
    selectNode,
    toggleExpand,
    isExpanded,
    startRenaming,
    cancelRenaming,
    startCreating,
    cancelCreating,
    computeNextChapterName,
    computeNextDirectoryName,
  }
})
