<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useNoteSidebarStore } from '@/stores/noteSidebar'
import type { OutlineItem, NoteHistoryItem } from '@/stores/noteSidebar'
import {
  Clock,
  ListTree,
  Trash2,
  FileText,
  X,
} from 'lucide-vue-next'

const MIN_WIDTH = 150
const MAX_WIDTH = 500
const COLLAPSE_THRESHOLD = 120

const sidebar = useNoteSidebarStore()

const emit = defineEmits<{
  (e: 'open-file', filePath: string): void
  (e: 'scroll-to-line', line: number): void
}>()

const isOpen = computed(() => sidebar.activePanel !== null)
const panelTitle = computed(() => {
  if (sidebar.activePanel === 'history') return '历史记录'
  if (sidebar.activePanel === 'outline') return '文档结构'
  return ''
})

// ===== 拖拽调整宽度 =====
type DragMode = 'none' | 'resize' | 'expand'
const dragMode = ref<DragMode>('none')
const currentWidth = ref(sidebar.panelWidth)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

// 面板展开时的拖拽：从面板右边缘开始
function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragMode.value = 'resize'
  dragStartX.value = e.clientX
  dragStartWidth.value = currentWidth.value
  startDragListeners()
}

// 面板关闭时的拖拽：从 activity bar 右边缘开始，向右展开
function onExpandStart(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragMode.value = 'expand'
  dragStartX.value = e.clientX
  dragStartWidth.value = 0
  currentWidth.value = 0
  // 立即打开上次的活动面板
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
    // 展开模式：只有向右拖拽才增大宽度，向左不会触发隐藏
    if (delta <= 0) {
      currentWidth.value = 0
      return
    }
    // 宽度跟随鼠标（向右为正方向）
    const newWidth = delta
    if (newWidth < MIN_WIDTH) {
      // 还不够宽，显示拖拽中的临时宽度
      currentWidth.value = newWidth
    } else {
      currentWidth.value = Math.min(MAX_WIDTH, newWidth)
    }
    return
  }

  // resize 模式：面板已展开，调整宽度
  const newWidth = dragStartWidth.value + delta
  if (newWidth < COLLAPSE_THRESHOLD) {
    // 宽度低于阈值 — 立刻收起，结束拖拽
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
      // 展开拖拽距离不够，收起
      cleanupDrag()
      sidebar.closePanel()
    } else {
      // 展开成功，保存宽度
      cleanupDrag()
      sidebar.panelWidth = finalWidth
      sidebar.savePanelWidth()
    }
    return
  }

  // resize 模式
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
  const w = isDragging.value ? currentWidth.value : sidebar.panelWidth
  return { width: `${w}px` }
})

onBeforeUnmount(() => {
  cleanupDrag()
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

onMounted(() => {
  sidebar.loadHistory()
  sidebar.loadPanelWidth()
  currentWidth.value = sidebar.panelWidth
})
</script>

<template>
  <div class="note-sidebar" :class="{ 'panel-open': isOpen, 'is-dragging': isDragging }">
    <!-- Activity Bar (图标导航栏) -->
    <div class="activity-bar">
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
        v-if="!isOpen"
        class="expand-handle"
        @mousedown="onExpandStart"
      ></div>
    </div>

    <!-- Content Panel (展开面板) -->
    <div v-if="isOpen" class="side-panel" :style="panelStyle">
      <!-- 右侧拖拽手柄 -->
      <div class="resize-handle" @mousedown="onResizeStart"></div>

      <!-- 面板头部 -->
      <div class="panel-header">
        <span class="panel-title">{{ panelTitle }}</span>
        <button class="panel-close" @click="sidebar.closePanel()" title="关闭面板">
          <X :size="14" />
        </button>
      </div>

      <!-- 历史记录面板 -->
      <div v-if="sidebar.activePanel === 'history'" class="panel-body custom-scrollbar-compact">
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
            @click="onHistoryClick(item)"
            :title="item.filePath"
          >
            <div class="history-item-main">
              <span class="history-file-name">{{ item.fileName }}</span>
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
      <div v-if="sidebar.activePanel === 'outline'" class="panel-body custom-scrollbar-compact">
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
    // 拖拽期间禁止任何过渡动画
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
  padding-top: 4px;
  gap: 2px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  position: relative;
}

// 面板关闭时 activity bar 右侧的展开拖拽区域
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
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    color: var(--text-primary);
    background: rgba(0, 0, 0, 0.06);
  }

  &.active {
    color: var(--accent-color);

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
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

// ===== 拖拽手柄 =====
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  height: 34px;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

// ===== 空状态 =====
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
</style>
