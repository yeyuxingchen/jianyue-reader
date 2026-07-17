<script lang="ts" setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNoteSidebarStore, isEpubDirPath } from '@/stores/noteSidebar'
import type { OutlineItem, NoteHistoryItem, FileNode, SidebarPanel } from '@/stores/noteSidebar'
import { useNoteEditorStore } from '@/stores/appMode'
import { useToastStore } from '@/stores/toast'
import {
  Clock,
  ListTree,
  Trash2,
  FileText,
  X,
  FolderOpen,
  RefreshCw,
  Plus,
  FilePlus,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Folder as FolderIcon,
  BookOpen,
  Download,
  Loader2,
  Image as ImageIcon,
  ImagePlus,
} from 'lucide-vue-next'

const MIN_WIDTH = 150
const MAX_WIDTH = 500
const COLLAPSE_THRESHOLD = 120

const sidebar = useNoteSidebarStore()
const noteStore = useNoteEditorStore()
const toast = useToastStore()

const emit = defineEmits<{
  (e: 'open-file', filePath: string): void
  (e: 'scroll-to-line', line: number): void
}>()

const isOpen = computed(() => sidebar.activePanel !== null)

const panelTitle = computed(() => {
  if (sidebar.activePanel === 'history') return '历史记录'
  if (sidebar.activePanel === 'outline') return '文档结构'
  if (sidebar.activePanel === 'files') {
    if (!sidebar.fileTreeRootPath) return '文件目录'
    const parts = sidebar.fileTreeRootPath.split(/[\\/]/).filter(Boolean)
    if (parts.length === 0) return '文件目录'
    // 当根目录是 epub 目录时，标题显示父目录的名字（更符合"项目名"语义），
    // "epub" 仅作为右侧 tag，避免与目录名重复。
    if (parts[parts.length - 1].toLowerCase() === 'epub' && parts.length >= 2) {
      return parts[parts.length - 2]
    }
    return parts[parts.length - 1]
  }
  return ''
})

// 标题对应的完整路径（用于 tooltip 验证，避免被误认为硬编码）
const panelTitleTooltip = computed(() => {
  if (sidebar.activePanel === 'files' && sidebar.fileTreeRootPath) {
    return sidebar.fileTreeRootPath
  }
  return ''
})

const showEpubTag = computed(() => {
  if (sidebar.activePanel !== 'files') return false
  // 选中节点是 epub
  if (sidebar.selectedNodePath) {
    const node = sidebar.findNode(sidebar.fileTreeNodes, sidebar.selectedNodePath)
    if (node?.type === 'epub') return true
  }
  // 根目录本身就是 epub 目录
  if (sidebar.fileTreeRootPath) {
    const parts = sidebar.fileTreeRootPath.split(/[\\/]/)
    if (parts[parts.length - 1]?.toLowerCase() === 'epub') return true
  }
  return false
})

// 当根目录就是 epub 目录时，显示"导出 epub"按钮
const isEpubRoot = computed(() => {
  if (sidebar.activePanel !== 'files' || !sidebar.fileTreeRootPath) return false
  const parts = sidebar.fileTreeRootPath.split(/[\\/]/).filter(Boolean)
  return parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'epub'
})

// 是否存在封面（由 store 维护；切换 root 时会重新查询）
const hasCover = computed(() => !!sidebar.coverPath)

const isExporting = ref(false)

const displayPanel = ref<SidebarPanel>(null)
watch(
  () => sidebar.activePanel,
  (val) => {
    if (val) {
      displayPanel.value = val
      if (val === 'files' && sidebar.fileTreeRootPath) {
        sidebar.refreshFileTree()
      }
    } else {
      window.setTimeout(() => {
        if (sidebar.activePanel === null) displayPanel.value = null
      }, 260)
    }
  },
  { immediate: true }
)

// ===== 拖拽调整宽度 =====
type DragMode = 'none' | 'resize' | 'expand'
const dragMode = ref<DragMode>('none')
const currentWidth = ref(sidebar.panelWidth)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragMode.value = 'resize'
  dragStartX.value = e.clientX
  dragStartWidth.value = currentWidth.value
  startDragListeners()
}

function onExpandStart(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragMode.value = 'expand'
  dragStartX.value = e.clientX
  dragStartWidth.value = 0
  currentWidth.value = 0
  sidebar.reopenLastPanel()
  startDragListeners()
}

function startDragListeners() {
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  const s = document.body.style as any
  s.cursor = 'col-resize'
  s.userSelect = 'none'
  s.webkitUserDrag = 'none'
}

function onDragMove(e: MouseEvent) {
  if (dragMode.value === 'none') return
  const delta = e.clientX - dragStartX.value

  if (dragMode.value === 'expand') {
    if (delta <= 0) {
      currentWidth.value = 0
      return
    }
    const newWidth = delta
    if (newWidth < MIN_WIDTH) {
      currentWidth.value = newWidth
    } else {
      currentWidth.value = Math.min(MAX_WIDTH, newWidth)
    }
    return
  }

  const newWidth = dragStartWidth.value + delta
  if (newWidth < COLLAPSE_THRESHOLD) {
    cleanupDrag()
    sidebar.closePanel()
    return
  }
  currentWidth.value = Math.min(MAX_WIDTH, newWidth)
}

function onDragEnd() {
  if (dragMode.value === 'none') return
  const finalWidth = currentWidth.value
  if (dragMode.value === 'expand') {
    if (finalWidth < MIN_WIDTH) {
      cleanupDrag()
      sidebar.closePanel()
    } else {
      cleanupDrag()
      sidebar.panelWidth = finalWidth
      sidebar.savePanelWidth()
    }
    return
  }
  if (finalWidth < MIN_WIDTH) {
    cleanupDrag()
    sidebar.closePanel()
  } else {
    cleanupDrag()
    sidebar.panelWidth = finalWidth
    sidebar.savePanelWidth()
  }
}

function cleanupDrag() {
  dragMode.value = 'none'
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  const s = document.body.style as any
  s.cursor = ''
  s.userSelect = ''
  s.webkitUserDrag = ''
}

const isDragging = computed(() => dragMode.value !== 'none')

const panelStyle = computed(() => {
  if (isDragging.value) {
    return { width: `${currentWidth.value}px` }
  }
  const w = sidebar.activePanel ? sidebar.panelWidth : 0
  return { width: `${w}px` }
})

onBeforeUnmount(() => {
  cleanupDrag()
  document.removeEventListener('keydown', onPanelKeydown)
  document.removeEventListener('click', onDocumentClickForPopup)
})

// ===== 辅助函数 =====
function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getOutlineIndent(level: number): string {
  return `${(level - 1) * 12}px`
}

function onOutlineClick(item: OutlineItem) {
  emit('scroll-to-line', item.line)
}

function onHistoryClick(item: NoteHistoryItem) {
  emit('open-file', item.filePath)
}

// ===== 文件目录相关 =====

async function onFilesIconClick() {
  // 已打开 → 关闭
  if (sidebar.activePanel === 'files') {
    sidebar.togglePanel('files')
    return
  }
  // 还没有根目录：优先用当前文件所在目录；没有就提示先打开一个文件
  if (!sidebar.fileTreeRootPath) {
    const cur = noteStore.currentFilePath
    if (cur) {
      const parentDir = getParentDir(cur)
      if (parentDir) {
        await window.electronAPI?.security.addAuthorizedDir(parentDir)
        sidebar.setFileTreeRoot(parentDir)
      } else {
        toast.show('无法识别当前文件所在目录')
        return
      }
    } else {
      toast.show('请先打开或新建一个文件')
      return
    }
  }
  // 切换面板，下方 watch(activePanel) 会自动触发刷新
  sidebar.togglePanel('files')
}

/**
 * 从文件路径中提取父目录（兼容 / 与 \）。
 * 若本身就是根目录（找不到分隔符），返回空串。
 */
function getParentDir(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx > 0 ? filePath.substring(0, idx) : ''
}

async function onRefreshTree() {
  await sidebar.refreshFileTree()
}

/**
 * 导出当前 epub 目录为 .epub 文件。
 * - 委托后端完成 markdown → HTML → epub 打包
 * - 后端内部弹系统保存对话框
 * - 成功后通过 toast 反馈
 */
async function onExportEpub() {
  if (isExporting.value) return
  if (!sidebar.fileTreeRootPath) {
    toast.show('请先选择 epub 目录')
    return
  }
  isExporting.value = true
  try {
    const result = await window.services?.exportEpub?.(sidebar.fileTreeRootPath)
    if (result) {
      const sizeKB = (result.size / 1024).toFixed(1)
      toast.show(`已导出 ${result.chapterCount} 章 → ${result.fileName}（${sizeKB} KB）`)
    }
    // 用户取消保存对话框 → 静默不提示
  } catch (err: any) {
    console.error('导出 epub 失败:', err)
    toast.show(err?.message || '导出失败')
  } finally {
    isExporting.value = false
  }
}

/**
 * 选择一个图片作为 epub 封面。
 * 后端会弹系统图片选择对话框，选中后复制到 <epubDir>/.image/cover.<ext>。
 * 若封面已存在则替换。.image 目录在文件树中不展示。
 */
async function onPickCover() {
  if (!sidebar.fileTreeRootPath) {
    toast.show('请先选择 epub 目录')
    return
  }
  try {
    const result = await window.services?.setEpubCover?.(sidebar.fileTreeRootPath)
    if (result) {
      // 同步 store 中的封面路径（hasCover 由此计算）
      sidebar.setCoverPath(result.coverPath)
      toast.show('封面已更新')
    }
    // 用户取消 → 静默
  } catch (err: any) {
    console.error('设置封面失败:', err)
    toast.show(err?.message || '设置封面失败')
  }
}

function onToggleNewPopup() {
  if (!sidebar.fileTreeRootPath) {
    toast.show('请先选择文件目录')
    return
  }
  sidebar.showNewPopup = !sidebar.showNewPopup
}

function onCreateChapter() {
  sidebar.showNewPopup = false
  if (!sidebar.fileTreeRootPath) {
    toast.show('请先选择文件目录')
    return
  }
  sidebar.startCreating('chapter')
  nextTick(() => focusCreatingInput())
}

function onCreateDirectory() {
  sidebar.showNewPopup = false
  if (!sidebar.fileTreeRootPath) {
    toast.show('请先选择文件目录')
    return
  }
  sidebar.startCreating('directory')
  nextTick(() => focusCreatingInput())
}

function focusCreatingInput() {
  const el = document.querySelector('.tree-input.creating') as HTMLInputElement | null
  if (el) {
    el.focus()
    el.select()
  }
}

function focusRenamingInput() {
  const el = document.querySelector('.tree-input.renaming') as HTMLInputElement | null
  if (el) {
    el.focus()
    el.select()
  }
}

async function onCreatingSubmit(value: string) {
  if (!sidebar.creatingState) return
  const { type, parentDir } = sidebar.creatingState
  const name = (value || '').trim()
  if (!name) {
    sidebar.cancelCreating()
    return
  }
  try {
    if (type === 'chapter') {
      const result = await window.services?.createChapter?.(parentDir, name)
      if (result) {
        toast.show(`已创建章节: ${result.name}`)
        await sidebar.refreshFileTree()
        sidebar.selectNode(result.path)
        emit('open-file', result.path)
      }
    } else {
      const result = await window.services?.createDirectory?.(parentDir, name)
      if (result) {
        toast.show(`已创建目录: ${result.name}`)
        await sidebar.refreshFileTree()
        sidebar.selectNode(result.path)
      }
    }
  } catch (err: any) {
    console.error('创建失败:', err)
    toast.show(err?.message || '创建失败')
  } finally {
    sidebar.cancelCreating()
  }
}

function onCreatingCancel() {
  sidebar.cancelCreating()
}

async function onRenamingSubmit(value: string) {
  if (!sidebar.renamingPath) return
  const newName = (value || '').trim()
  if (!newName) {
    sidebar.cancelRenaming()
    return
  }
  const oldPath = sidebar.renamingPath
  try {
    await window.services?.renameNode?.(oldPath, newName)
    toast.show('已重命名')
    await sidebar.refreshFileTree()
  } catch (err: any) {
    console.error('重命名失败:', err)
    toast.show(err?.message || '重命名失败')
  } finally {
    sidebar.cancelRenaming()
  }
}

function onRenamingCancel() {
  sidebar.cancelRenaming()
}

function onChapterClick(node: FileNode) {
  sidebar.selectNode(node.path)
  emit('open-file', node.path)
}

function onDirectoryClick(node: FileNode) {
  sidebar.selectNode(node.path)
  sidebar.showNewPopup = false
}

function onToggleExpand(dirPath: string) {
  sidebar.toggleExpand(dirPath)
}

function onDocumentClickForPopup(e: MouseEvent) {
  if (!sidebar.showNewPopup) return
  const target = e.target as HTMLElement
  if (!target.closest('.new-popup') && !target.closest('.new-btn')) {
    sidebar.showNewPopup = false
  }
}

function onPanelKeydown(e: KeyboardEvent) {
  if (sidebar.activePanel !== 'files') return
  if (e.key === 'F2' && sidebar.selectedNodePath && !sidebar.renamingPath && !sidebar.creatingState) {
    e.preventDefault()
    sidebar.startRenaming(sidebar.selectedNodePath)
    nextTick(() => focusRenamingInput())
  }
  if (e.key === 'Escape') {
    if (sidebar.renamingPath) sidebar.cancelRenaming()
    else if (sidebar.creatingState) sidebar.cancelCreating()
  }
}

const creatingDefaultName = computed(() => {
  if (!sidebar.creatingState) return ''
  return sidebar.creatingState.type === 'chapter'
    ? sidebar.computeNextChapterName()
    : sidebar.computeNextDirectoryName()
})

const renamingDefaultName = computed(() => {
  if (!sidebar.renamingPath) return ''
  const node = sidebar.findNode(sidebar.fileTreeNodes, sidebar.renamingPath)
  return node?.name || ''
})

function isCreatingInDir(dirPath: string): boolean {
  if (!sidebar.creatingState) return false
  return sidebar.creatingState.parentDir === dirPath
}

function isNodeSelected(p: string): boolean {
  return sidebar.selectedNodePath === p
}

function nodeKey(n: FileNode): string {
  return n.type + ':' + n.path
}

// 构建"扁平化"渲染列表：递归遍历 fileTreeNodes，生成每行信息
interface FlatRow {
  node: FileNode
  depth: number
  expanded: boolean
  isDir: boolean
  isRenaming: boolean
  showChildren: boolean
  showCreatingHere: boolean
}

function flattenTree(nodes: FileNode[], depth: number): FlatRow[] {
  const rows: FlatRow[] = []
  for (const n of nodes) {
    const isDir = n.type === 'directory' || n.type === 'epub'
    const expanded = isDir ? sidebar.isExpanded(n.path) : false
    const isRenaming = sidebar.renamingPath === n.path
    const showCreatingHere = isDir && isCreatingInDir(n.path)
    rows.push({
      node: n,
      depth,
      expanded,
      isDir,
      isRenaming,
      showChildren: isDir && expanded,
      showCreatingHere,
    })
    if (isDir && expanded) {
      if (n.children) {
        rows.push(...flattenTree(n.children, depth + 1))
      }
    }
  }
  return rows
}

const flatRows = computed<FlatRow[]>(() => {
  return flattenTree(sidebar.fileTreeNodes, 0)
})

onMounted(() => {
  sidebar.loadHistory()
  sidebar.loadPanelWidth()
  sidebar.loadFileRootPath()
  currentWidth.value = sidebar.panelWidth
  document.addEventListener('keydown', onPanelKeydown)
  document.addEventListener('click', onDocumentClickForPopup)
})

watch(
  () => sidebar.activePanel,
  (val) => {
    if (val === 'files' && sidebar.fileTreeRootPath) {
      sidebar.refreshFileTree()
    }
  }
)

watch(
  () => noteStore.currentFilePath,
  (val) => {
    if (val && sidebar.activePanel === 'files') {
      sidebar.selectNode(val)
    }
  }
)
</script>

<template>
  <div class="note-sidebar" :class="{ 'panel-open': isOpen, 'is-dragging': isDragging }">
    <!-- Activity Bar (图标导航栏) -->
    <div class="activity-bar">
      <!-- 文件目录（在历史记录之上） -->
      <button
        class="activity-btn"
        :class="{ active: sidebar.activePanel === 'files' }"
        @click="onFilesIconClick"
        title="文件目录"
      >
        <FolderOpen :size="20" :stroke-width="1.8" />
      </button>
      <button
        class="activity-btn"
        :class="{ active: sidebar.activePanel === 'history' }"
        @click="sidebar.togglePanel('history')"
        title="历史记录"
      >
        <Clock :size="20" :stroke-width="1.8" />
      </button>
      <button
        class="activity-btn"
        :class="{ active: sidebar.activePanel === 'outline' }"
        @click="sidebar.togglePanel('outline')"
        title="文档结构"
      >
        <ListTree :size="20" :stroke-width="1.8" />
      </button>

      <!-- 面板关闭时，activity bar 右侧边缘可向右拖拽展开 -->
      <div
        v-if="displayPanel === null"
        class="expand-handle"
        @mousedown="onExpandStart"
      ></div>
    </div>

    <!-- Content Panel (展开面板) -->
    <div
      class="side-panel"
      :class="{ collapsed: sidebar.activePanel === null }"
      :style="panelStyle"
    >
      <!-- 右侧拖拽手柄 -->
      <div class="resize-handle" @mousedown="onResizeStart"></div>

      <!-- 面板头部 -->
      <div class="panel-header">
        <div class="panel-header-left">
          <span class="panel-title" :title="panelTitleTooltip">{{ panelTitle }}</span>
          <span v-if="showEpubTag" class="epub-tag">epub</span>
        </div>
        <button class="panel-close" @click="sidebar.closePanel()" title="关闭面板">
          <X :size="14" />
        </button>
      </div>

      <!-- 文件目录：操作面板（无 border / box-shadow，仅有高度） -->
      <div v-if="displayPanel === 'files'" class="panel-actions">
        <button
          class="action-btn"
          @click="onRefreshTree"
          title="刷新"
        >
          <RefreshCw :size="14" :stroke-width="1.8" />
        </button>
        <div class="action-spacer"></div>
        <!-- 导出 epub：仅在根目录是 epub 时显示，位于"+"按钮左侧 -->
        <button
          v-if="isEpubRoot"
          class="action-btn export-btn"
          :disabled="isExporting"
          @click="onExportEpub"
          :title="isExporting ? '正在导出…' : '导出 epub'"
        >
          <!-- 导出中：切换为 Loader2 图标（自带旋转动画） -->
          <Loader2 v-if="isExporting" :size="14" :stroke-width="1.8" class="loader-icon" />
          <Download v-else :size="14" :stroke-width="1.8" />
        </button>
        <!-- 封面：位于导出按钮右侧 -->
        <button
          v-if="isEpubRoot"
          class="action-btn cover-btn"
          :class="{ 'has-cover': hasCover }"
          @click="onPickCover"
          :title="hasCover ? '替换封面' : '设置封面'"
        >
          <ImagePlus v-if="!hasCover" :size="14" :stroke-width="1.8" />
          <ImageIcon v-else :size="14" :stroke-width="1.8" />
        </button>
        <div class="new-btn-wrap">
          <button
            class="action-btn new-btn"
            @click="onToggleNewPopup"
            title="新建"
          >
            <Plus :size="14" :stroke-width="2" />
          </button>
          <!-- 新建弹窗 -->
          <Transition name="popup-fade">
            <div v-if="sidebar.showNewPopup" class="new-popup">
              <div class="new-popup-item" @mousedown.prevent="onCreateChapter">
                <FilePlus :size="13" :stroke-width="1.8" />
                <span>创建章节</span>
              </div>
              <div class="new-popup-item" @mousedown.prevent="onCreateDirectory">
                <FolderPlus :size="13" :stroke-width="1.8" />
                <span>创建目录</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 历史记录面板 -->
      <div v-if="displayPanel === 'history'" class="panel-body custom-scrollbar-compact">
        <div v-if="sidebar.history.length === 0" class="panel-empty">
          <FileText :size="32" :stroke-width="1.2" class="empty-icon" />
          <p>暂无历史记录</p>
          <p class="empty-hint">打开文件后将自动记录</p>
        </div>
        <div v-else class="history-list">
          <div
            v-for="item in sidebar.history"
            :key="item.filePath"
            class="history-item"
            :class="{ 'is-epub': isEpubDirPath(item.filePath) }"
            @click="onHistoryClick(item)"
            :title="item.filePath"
          >
            <div class="history-item-main">
              <span class="history-file-name">
                <BookOpen v-if="isEpubDirPath(item.filePath)" :size="12" class="history-type-icon" />
                {{ item.fileName }}
              </span>
              <span class="history-file-path">{{ item.filePath }}</span>
            </div>
            <div class="history-item-meta">
              <span class="history-time">{{ formatTime(item.lastOpenedAt) }}</span>
              <button
                class="history-remove"
                @click.stop="sidebar.removeFromHistory(item.filePath)"
                title="移除"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
          <div class="history-footer">
            <button class="clear-history-btn" @click="sidebar.clearHistory()">
              清空历史
            </button>
          </div>
        </div>
      </div>

      <!-- 文档结构面板 -->
      <div v-if="displayPanel === 'outline'" class="panel-body custom-scrollbar-compact">
        <div v-if="sidebar.outline.length === 0" class="panel-empty">
          <ListTree :size="32" :stroke-width="1.2" class="empty-icon" />
          <p>暂无标题结构</p>
          <p class="empty-hint">在文档中使用 # 创建标题</p>
        </div>
        <div v-else class="outline-list">
          <div
            v-for="item in sidebar.outline"
            :key="item.id"
            class="outline-item"
            :class="'outline-h' + item.level"
            :style="{ paddingLeft: getOutlineIndent(item.level) }"
            @click="onOutlineClick(item)"
          >
            <span class="outline-level">H{{ item.level }}</span>
            <span class="outline-text">{{ item.text }}</span>
          </div>
        </div>
      </div>

      <!-- 文件目录面板 -->
      <div v-if="displayPanel === 'files'" class="panel-body custom-scrollbar-compact">
        <div v-if="!sidebar.fileTreeRootPath" class="panel-empty">
          <FolderOpen :size="32" :stroke-width="1.2" class="empty-icon" />
          <p>未选择文件目录</p>
          <p class="empty-hint">请先打开或新建一个文件</p>
        </div>
        <div v-else-if="sidebar.fileTreeLoading" class="panel-empty">
          <RefreshCw :size="24" :stroke-width="1.4" class="empty-icon spin" />
          <p>加载中…</p>
        </div>
        <div v-else>
          <!-- 根级 creating 输入行：始终显示（即使目录为空） -->
          <div
            v-if="isCreatingInDir(sidebar.fileTreeRootPath)"
            class="tree-row is-creating"
            :style="{ paddingLeft: 8 + 'px' }"
          >
            <span class="tree-toggle-spacer"></span>
            <span class="tree-icon">
              <FilePlus v-if="sidebar.creatingState?.type === 'chapter'" :size="14" :stroke-width="1.8" />
              <FolderPlus v-else :size="14" :stroke-width="1.8" />
            </span>
            <input
              class="tree-input creating"
              type="text"
              :value="creatingDefaultName"
              :placeholder="sidebar.creatingState?.type === 'chapter' ? '章节名' : '目录名'"
              @mousedown.stop
              @click.stop
              @keydown.stop="(e: KeyboardEvent) => {
                if (e.key === 'Enter') { e.preventDefault(); onCreatingSubmit((e.target as HTMLInputElement).value) }
                else if (e.key === 'Escape') { e.preventDefault(); onCreatingCancel() }
              }"
              @blur="(e: FocusEvent) => {
                const v = (e.target as HTMLInputElement).value.trim()
                onCreatingSubmit(v || creatingDefaultName)
              }"
            />
          </div>
          <!-- 空目录：仅在非 creating 时显示 -->
          <div
            v-else-if="sidebar.fileTreeNodes.length === 0"
            class="panel-empty"
          >
            <FolderOpen :size="32" :stroke-width="1.2" class="empty-icon" />
            <p>该目录为空</p>
            <p class="empty-hint">点击右上角 + 创建章节或目录</p>
          </div>
          <!-- 正常的文件树 -->
          <div v-else class="file-tree">
            <!-- 扁平化的文件树 -->
            <template v-for="row in flatRows" :key="nodeKey(row.node)">
            <div
              class="tree-row"
              :class="{
                'is-dir': row.isDir,
                'is-chapter': !row.isDir,
                'is-selected': isNodeSelected(row.node.path),
                'is-epub': row.node.type === 'epub',
              }"
              :style="{ paddingLeft: (8 + row.depth * 14) + 'px' }"
              @click="(e: MouseEvent) => {
                const t = e.target as HTMLElement
                if (t.closest('.tree-input, .tree-toggle')) return
                if (row.isDir) onDirectoryClick(row.node)
                else onChapterClick(row.node)
              }"
              @dblclick="(e: MouseEvent) => {
                const t = e.target as HTMLElement
                if (t.closest('.tree-input, .tree-toggle')) return
                if (isNodeSelected(row.node.path)) {
                  sidebar.startRenaming(row.node.path)
                  nextTick(() => focusRenamingInput())
                }
              }"
            >
              <span
                v-if="row.isDir"
                class="tree-toggle"
                @click.stop="onToggleExpand(row.node.path)"
              >
                <ChevronDown v-if="row.expanded" :size="12" :stroke-width="2" />
                <ChevronRight v-else :size="12" :stroke-width="2" />
              </span>
              <span v-else class="tree-toggle-spacer"></span>
              <span class="tree-icon">
                <BookOpen v-if="row.node.type === 'epub'" :size="14" :stroke-width="1.8" />
                <FolderIcon v-else-if="row.isDir" :size="14" :stroke-width="1.8" />
                <FileIcon v-else :size="14" :stroke-width="1.8" />
              </span>
              <input
                v-if="row.isRenaming"
                class="tree-input renaming"
                type="text"
                :value="renamingDefaultName"
                @mousedown.stop
                @click.stop
                @keydown.stop="(e: KeyboardEvent) => {
                  if (e.key === 'Enter') { e.preventDefault(); onRenamingSubmit((e.target as HTMLInputElement).value) }
                  else if (e.key === 'Escape') { e.preventDefault(); onRenamingCancel() }
                }"
                @blur="(e: FocusEvent) => {
                  onRenamingSubmit((e.target as HTMLInputElement).value)
                }"
              />
              <span v-else class="tree-name">
                {{ row.node.name }}<span v-if="row.node.type === 'chapter'" class="tree-ext">.md</span>
              </span>
            </div>
            <!-- 目录展开后，该目录下的 creating 输入行 -->
            <div
              v-if="row.showCreatingHere"
              class="tree-row is-creating"
              :style="{ paddingLeft: (8 + (row.depth + 1) * 14) + 'px' }"
            >
              <span class="tree-toggle-spacer"></span>
              <span class="tree-icon">
                <FilePlus v-if="sidebar.creatingState?.type === 'chapter'" :size="14" :stroke-width="1.8" />
                <FolderPlus v-else :size="14" :stroke-width="1.8" />
              </span>
              <input
                class="tree-input creating"
                type="text"
                :value="creatingDefaultName"
                :placeholder="sidebar.creatingState?.type === 'chapter' ? '章节名' : '目录名'"
                @mousedown.stop
                @click.stop
                @keydown.stop="(e: KeyboardEvent) => {
                  if (e.key === 'Enter') { e.preventDefault(); onCreatingSubmit((e.target as HTMLInputElement).value) }
                  else if (e.key === 'Escape') { e.preventDefault(); onCreatingCancel() }
                }"
                @blur="(e: FocusEvent) => {
                  const v = (e.target as HTMLInputElement).value.trim()
                  onCreatingSubmit(v || creatingDefaultName)
                }"
              />
            </div>
          </template>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.note-sidebar {
  display: flex;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 10;

  &.is-dragging {
    *, *::before, *::after {
      transition: none !important;
    }
  }
}

// ===== Activity Bar (图标导航栏) =====
.activity-bar {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
  gap: 6px;
  background: var(--bg-chrome);
  border-right: 1px solid var(--border-color);
  box-shadow: 1px 0 4px -2px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
}

.expand-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 20;
  background: transparent;
  transition: background 0.15s;

  &:hover {
    background: var(--accent-color);
    opacity: 0.4;
  }
}

.activity-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--text-tertiary) 80%, #fff 20%);
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, transform 0.12s ease;
  position: relative;

  &:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  }

  &:active {
    transform: scale(0.92);
  }

  &.active {
    color: var(--accent-color);
    background: color-mix(in srgb, var(--accent-color) 18%, transparent);

    &::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      background: var(--accent-color);
      border-radius: 0 2px 2px 0;
    }
  }
}

// ===== Content Panel (展开面板) =====
.side-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  box-shadow: 4px 0 12px -6px rgba(0, 0, 0, 0.14);
  transition: width 0.26s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.26s ease;

  &.collapsed {
    box-shadow: none;
    .resize-handle { display: none; }
    .panel-header,
    .panel-body,
    .panel-actions {
      opacity: 0;
    }
  }

  .panel-header,
  .panel-body,
  .panel-actions {
    transition: opacity 0.2s ease;
  }
}

.resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 20;
  background: transparent;
  transition: background 0.15s;

  &:hover,
  .is-dragging & {
    background: var(--accent-color);
    opacity: 0.5;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.10);
  min-height: 36px;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.epub-tag {
  font-size: 9px;
  font-weight: 700;
  text-transform: lowercase;
  letter-spacing: 0.5px;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-primary);
  }
}

// ===== 文件目录：操作面板 =====
.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  min-height: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  box-shadow: none;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.action-btn.export-btn {
  color: var(--accent-color);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-color) 14%, transparent);
    color: var(--accent-color);
  }
}

// Loader2 图标旋转动画
.loader-icon {
  animation: loader-spin 1s linear infinite;
  transform-origin: center;
}

@keyframes loader-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.action-btn.cover-btn {
  color: var(--text-tertiary);

  &:hover {
    color: var(--accent-color);
    background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  }

  &.has-cover {
    color: var(--accent-color);
  }
}

.action-spacer {
  flex: 1;
}

.new-btn-wrap {
  position: relative;
}

.new-popup {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 130px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 100;
}

.new-popup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: color-mix(in srgb, var(--accent-color) 14%, transparent);
    color: var(--accent-color);
  }
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ===== panel body =====
.panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
  color: var(--text-tertiary);

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .spin {
    animation: spin 1.2s linear infinite;
  }

  p {
    font-size: 12px;
    margin: 2px 0;
  }

  .empty-hint {
    font-size: 11px;
    opacity: 0.7;
  }
}

// ===== 历史记录列表 =====
.history-list {
  padding: 4px 0;
}

.history-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);

  &:hover {
    background: var(--bg-tertiary);
    .history-remove {
      opacity: 1;
    }
  }
}

.history-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.history-file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-type-icon {
  vertical-align: -2px;
  margin-right: 4px;
  color: var(--accent-color);
}

.history-file-path {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 3px;
}

.history-time {
  font-size: 10px;
  color: var(--text-tertiary);
}

.history-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.12s;

  &:hover {
    background: rgba(220, 50, 50, 0.1);
    color: #dc3232;
  }
}

.history-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
}

.clear-history-btn {
  width: 100%;
  padding: 5px 0;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.12s;

  &:hover {
    background: rgba(220, 50, 50, 0.08);
    color: #dc3232;
  }
}

// ===== 文档结构列表 =====
.outline-list {
  padding: 4px 0;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.outline-level {
  font-size: 9px;
  font-weight: 700;
  color: var(--accent-color);
  opacity: 0.7;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  background: rgba(55, 138, 221, 0.08);
  border-radius: 3px;
  padding: 1px 0;
}

.outline-text {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.outline-h1 .outline-text { font-weight: 600; }
.outline-h2 .outline-text { font-weight: 500; }
.outline-h3 .outline-text { font-weight: 400; color: var(--text-secondary); }
.outline-h4 .outline-text,
.outline-h5 .outline-text,
.outline-h6 .outline-text { font-weight: 400; color: var(--text-tertiary); font-size: 11px; }

// ===== 文件目录树 =====
.file-tree {
  padding: 4px 0;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
  min-height: 24px;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.is-selected {
    background: color-mix(in srgb, var(--accent-color) 14%, transparent);

    .tree-name {
      color: var(--accent-color);
      font-weight: 500;
    }
  }

  &.is-epub .tree-name {
    color: var(--accent-color);
  }

  &.is-creating {
    background: color-mix(in srgb, var(--accent-color) 8%, transparent);
    cursor: default;
  }
}

.tree-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  border-radius: 2px;
  cursor: pointer;
  transition: color 0.1s;

  &:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.05);
  }
}

.tree-toggle-spacer {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.tree-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);

  .is-epub & {
    color: var(--accent-color);
  }
}

.tree-name {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

.tree-ext {
  color: var(--text-tertiary);
  font-weight: 400;
}

.tree-input {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--accent-color);
  border-radius: 3px;
  padding: 1px 6px;
  outline: none;
  height: 20px;
  line-height: 1.2;
  font-family: inherit;

  &:focus {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 25%, transparent);
  }
}
</style>
