<script lang="ts" setup>
import { ref, onMounted, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useToastStore } from '@/stores/toast'
import BookCard from '@/components/book/BookCard.vue'
import BookImport from '@/components/book/BookImport.vue'
import { Search, Plus, ArrowUpDown, CheckSquare, Trash2, X, GripVertical, ListChecks } from 'lucide-vue-next'
import type { SortBy } from '@/types'
import { compressCoverToJpeg } from '@/utils/cover'
import { db } from '@/services/dbService'

const library = useLibraryStore()
const toast = useToastStore()

const selectMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)
const gridRef = ref<HTMLElement | null>(null)
const colsPerRow = ref(5)

function updateColsPerRow() {
  if (!gridRef.value) return
  const gridStyle = getComputedStyle(gridRef.value)
  const cols = gridStyle.getPropertyValue('grid-template-columns').split(' ').length
  if (cols > 0) colsPerRow.value = cols
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  library.loadBooks()
  library.checkPathValidity()
  nextTick(() => {
    updateColsPerRow()
    if (gridRef.value) {
      resizeObserver = new ResizeObserver(() => updateColsPerRow())
      resizeObserver.observe(gridRef.value)
    }
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(() => library.filteredBooks.length, () => nextTick(updateColsPerRow))

type GridItem = { type: 'book'; book: typeof library.filteredBooks[0] } | { type: 'shelf' }

const gridItems = computed<GridItem[]>(() => {
  const books = library.filteredBooks
  const cols = colsPerRow.value
  const items: GridItem[] = []
  for (let i = 0; i < books.length; i++) {
    items.push({ type: 'book', book: books[i] })
    if ((i + 1) % cols === 0 || i === books.length - 1) {
      items.push({ type: 'shelf' })
    }
  }
  return items
})

const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'lastRead', label: '最近阅读' },
  { value: 'custom', label: '我的书架' },
  { value: 'title', label: '书名' },
  { value: 'progress', label: '进度' },
  { value: 'addedAt', label: '添加时间' },
]

async function handleImport() {
  try {
    const filePaths = await window.services.showFilePicker()
    if (filePaths && filePaths.length > 0) {
      await library.importBook(filePaths)
    }
  } catch (err) {
    console.error('导入书籍失败:', err)
    toast.show('导入失败，请重试')
    library.isLoading = false
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (!files) return
  const paths = Array.from(files).map((f) => (f as any).path || f.name)
  if (paths.length > 0) {
    try {
      await library.importBook(paths)
    } catch (err) {
      console.error('拖拽导入失败:', err)
      toast.show('导入失败，请重试')
      library.isLoading = false
    }
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleOpenBook(bookId: string, coverUrl: string, rect: { left: number; top: number; width: number; height: number }, title: string) {
  const book = library.books.find((b) => b.id === bookId)
  if (book && !book.invalid) {
    window.dispatchEvent(new CustomEvent('book-open-animation', {
      detail: { bookId, coverUrl, rect, title }
    }))
  }
}

function handleDeleteBook(bookId: string) {
  library.deleteBook(bookId)
}

async function handleRelocateBook(bookId: string) {
  const filePaths = await window.services.showFilePicker()
  if (filePaths && filePaths.length > 0) {
    library.relocateBook(bookId, filePaths[0])
  }
}

async function handleAddCover(bookId: string) {
  const result = await window.services.showImagePicker()
  if (!result || result.length === 0) return
  const imagePath = result[0]
  try {
    const buffer = await window.services.readFileAsBuffer(imagePath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
    }
    const mime = mimeMap[ext] || 'image/jpeg'
    const blob = new Blob([buffer], { type: mime })
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const compressed = await compressCoverToJpeg(dataUrl)
      if (compressed) {
        const saved = await db.saveCover(bookId, compressed)
        if (saved) {
          library.updateBook(bookId, { coverKey: saved })
          toast.show('封面已添加')
        }
      }
    }
    reader.readAsDataURL(blob)
  } catch {
    toast.show('添加封面失败')
  }
}

function enterSelectMode() {
  selectMode.value = true
  selectedIds.value = new Set()
}

function exitSelectMode() {
  selectMode.value = false
  selectedIds.value = new Set()
}

function toggleBookSelect(bookId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(bookId)) {
    next.delete(bookId)
  } else {
    next.add(bookId)
  }
  selectedIds.value = next
}

const isAllSelected = computed(() => {
  return library.filteredBooks.length > 0 && selectedIds.value.size === library.filteredBooks.length
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(library.filteredBooks.map(b => b.id))
  }
}

function confirmBatchDelete() {
  if (selectedIds.value.size === 0) return
  showDeleteConfirm.value = true
}

function executeBatchDelete() {
  for (const id of selectedIds.value) {
    library.deleteBook(id)
  }
  showDeleteConfirm.value = false
  exitSelectMode()
}

function cancelBatchDelete() {
  showDeleteConfirm.value = false
}

const dragSrcId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function handleBookDragStart(bookId: string) {
  dragSrcId.value = bookId
}

function handleBookDragOver(bookId: string, e: DragEvent) {
  e.preventDefault()
  if (!library.isCustomSort) return
  if (dragSrcId.value && dragSrcId.value !== bookId) {
    dragOverId.value = bookId
  }
}

function handleBookDragLeave() {
  dragOverId.value = null
}

function handleBookDrop(targetId: string) {
  if (!library.isCustomSort || !dragSrcId.value || dragSrcId.value === targetId) {
    dragSrcId.value = null
    dragOverId.value = null
    return
  }

  const currentIds = library.filteredBooks.map(b => b.id)
  const srcIndex = currentIds.indexOf(dragSrcId.value)
  const targetIndex = currentIds.indexOf(targetId)

  if (srcIndex === -1 || targetIndex === -1) {
    dragSrcId.value = null
    dragOverId.value = null
    return
  }

  const newIds = [...currentIds]
  newIds.splice(srcIndex, 1)
  newIds.splice(targetIndex, 0, dragSrcId.value)

  library.reorderBooks(newIds)
  dragSrcId.value = null
  dragOverId.value = null
}

function handleBookDragEnd() {
  dragSrcId.value = null
  dragOverId.value = null
}
</script>

<template>
  <div class="bookshelf" @drop="handleDrop" @dragover="handleDragOver">
    <div class="bookshelf-header">
      <h1 class="bookshelf-title">简阅</h1>
      <div class="bookshelf-actions">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input
            v-model="library.searchQuery"
            type="text"
            placeholder="搜索书名或作者..."
            class="search-input"
          />
        </div>
        <div class="sort-select">
          <ArrowUpDown :size="14" />
          <select :value="library.sortBy" class="sort-dropdown" @change="library.setSortBy(($event.target as HTMLSelectElement).value as SortBy)">
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <template v-if="selectMode">
          <button class="action-btn select-all-btn" @click="toggleSelectAll">
            <ListChecks :size="16" />
            <span>{{ isAllSelected ? '取消全选' : '全选' }}</span>
          </button>
          <button class="action-btn danger-btn" :disabled="selectedIds.size === 0" @click="confirmBatchDelete">
            <Trash2 :size="16" />
            <span>删除{{ selectedIds.size > 0 ? `(${selectedIds.size})` : '' }}</span>
          </button>
          <button class="action-btn cancel-btn" @click="exitSelectMode">
            <X :size="16" />
            <span>取消</span>
          </button>
        </template>
        <template v-else>
          <button class="action-btn select-btn" @click="enterSelectMode">
            <CheckSquare :size="16" />
            <span>多选</span>
          </button>
          <button class="import-btn" @click="handleImport">
            <Plus :size="18" />
            <span>导入</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="library.isLoading" class="bookshelf-loading">
      <div class="spinner"></div>
      <span>正在导入...</span>
    </div>

    <div v-else-if="library.books.length === 0" class="bookshelf-empty">
      <BookImport @import="handleImport" />
    </div>

    <div v-else ref="gridRef" class="bookshelf-grid custom-scrollbar">
      <template v-for="(item, idx) in gridItems" :key="item.type === 'book' ? item.book.id : 'shelf-' + idx">
        <div
          v-if="item.type === 'book'"
          class="book-card-wrapper"
          :class="{
            'dragging': dragSrcId === item.book.id,
            'drag-over': dragOverId === item.book.id && library.isCustomSort,
            'draggable': library.isCustomSort && !selectMode
          }"
          draggable="true"
          @dragstart="handleBookDragStart(item.book.id)"
          @dragover="handleBookDragOver(item.book.id, $event)"
          @dragleave="handleBookDragLeave"
          @drop="handleBookDrop(item.book.id)"
          @dragend="handleBookDragEnd"
        >
          <div v-if="library.isCustomSort && !selectMode" class="drag-handle">
            <GripVertical :size="14" />
          </div>
          <BookCard
            :book="item.book"
            :selectable="selectMode"
            :selected="selectedIds.has(item.book.id)"
            @open="handleOpenBook"
            @delete="handleDeleteBook"
            @relocate="handleRelocateBook"
            @add-cover="handleAddCover"
            @toggle-select="toggleBookSelect"
          />
        </div>
        <div v-else class="shelf-plank">
          <div class="plank-top"></div>
          <div class="plank-right"></div>
          <div class="plank-front"></div>
          <div class="plank-cast-shadow"></div>
        </div>
      </template>
    </div>

    <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="cancelBatchDelete">
      <div class="confirm-dialog">
        <div class="confirm-text">确定删除选中的 {{ selectedIds.size }} 本书籍吗？</div>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="cancelBatchDelete">取消</button>
          <button class="confirm-btn danger" @click="executeBatchDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bookshelf {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;

  &::-webkit-scrollbar {
    width: 13px;
  }
  &::-webkit-scrollbar-track {
    background: var(--bg-secondary);
  }
  &::-webkit-scrollbar-track-piece {
    background-color: var(--bg-secondary);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    background-clip: padding-box;
    border: 4.5px solid transparent;
    border-radius: 6px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
    background-clip: padding-box;
    border: 4.5px solid transparent;
  }
}

.bookshelf-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.bookshelf-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.bookshelf-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  padding: 6px 10px 6px 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  width: 180px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--accent-color);
  }
}

.sort-select {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.sort-dropdown {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  padding: 6px 8px;
  outline: none;
  cursor: pointer;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: var(--accent-color);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.select-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.danger-btn {
  background: #ef4444;
  color: #fff;
}

.cancel-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.select-all-btn {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 24px;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirm-text {
  font-size: 15px;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &.cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.danger {
    background: #ef4444;
    color: #fff;
  }
}

.bookshelf-loading {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
  min-height: 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bookshelf-empty {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.bookshelf-grid {
  flex: 1 0 auto;
  overflow-y: auto;
  padding: 22px 24px 20px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px 20px;
  align-content: start;
  min-height: 0;
}

.shelf-plank {
  grid-column: 1 / -1;
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 0;
  overflow: visible;
}

.plank-top {
  position: absolute;
  top: -6px;
  left: 0;
  right: 8px;
  height: 7px;
  background: linear-gradient(
    180deg,
    #A87838 0%, #9A6828 40%, #8C5820 100%
  );
  transform: skewX(-40deg);
  transform-origin: bottom left;
  border-radius: 1px 1px 0 0;
}

.plank-top::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px, transparent 22px,
    rgba(0,0,0,0.05) 22px, rgba(0,0,0,0.05) 23px
  );
}

.plank-right {
  position: absolute;
  top: -4px;
  right: 0;
  width: 8px;
  height: calc(100% + 4px);
  background: linear-gradient(
    180deg,
    #7A4E18 0%, #6A4010 50%, #5A3408 100%
  );
  transform: skewY(-40deg);
  transform-origin: top left;
  border-radius: 0 1px 1px 0;
}

.plank-front {
  position: relative;
  width: 100%;
  height: 10px;
  background: linear-gradient(
    180deg,
    #8C5820 0%, #A06828 18%, #7A4E18 38%,
    #8E5C20 55%, #6A4010 75%, #5A3408 100%
  );
  border-radius: 0 0 1px 1px;
  box-shadow: inset 0 1px 0 rgba(255,220,140,0.12);
}

.plank-front::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px, transparent 22px,
    rgba(0,0,0,0.06) 22px, rgba(0,0,0,0.06) 23px
  );
}

.plank-cast-shadow {
  height: 6px;
  background: linear-gradient(
    180deg,
    rgba(0,0,0,0.25) 0%,
    transparent 100%
  );
}

.book-card-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.draggable {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &.dragging {
    opacity: 0.4;
  }

  &.drag-over {
    outline: 2px dashed var(--accent-color);
    outline-offset: 4px;
    border-radius: 6px;
  }
}

.drag-handle {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  color: var(--text-tertiary);
  cursor: grab;
  padding: 2px 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;

  .book-card-wrapper:hover & {
    opacity: 1;
  }

  &:active {
    cursor: grabbing;
  }
}
</style>
