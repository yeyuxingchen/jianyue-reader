<script lang="ts" setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import type { Book } from '@/types'
import { getCoverUrl, revokeCoverUrl } from '@/utils/cover'
import { AlertTriangle, MoreVertical, BookOpen, Trash2, FolderSearch, Check, ImageIcon } from 'lucide-vue-next'

const props = defineProps<{
  book: Book
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  open: [bookId: string, coverUrl: string, rect: { left: number; top: number; width: number; height: number }, title: string]
  delete: [bookId: string]
  relocate: [bookId: string]
  addCover: [bookId: string]
  toggleSelect: [bookId: string]
}>()

const coverUrl = ref('')
const showMenu = ref(false)
const cardRef = ref<HTMLElement | null>(null)

let coverGeneration = 0

watch(() => props.book.coverKey, async (key) => {
  // 防止异步竞争：快速连续更新时丢弃过期的结果
  const gen = ++coverGeneration

  if (coverUrl.value) {
    revokeCoverUrl(coverUrl.value)
    coverUrl.value = ''
  }
  if (key) {
    const url = await getCoverUrl(key)
    if (gen !== coverGeneration) return // 已过期，丢弃
    coverUrl.value = url
  }
}, { immediate: true })

onBeforeUnmount(() => {
  revokeCoverUrl(coverUrl.value)
})

function handleOpen() {
  if (props.selectable) {
    emit('toggleSelect', props.book.id)
    return
  }
  if (!props.book.invalid) {
    const el = cardRef.value
    const domRect = el ? el.getBoundingClientRect() : null
    const rect = domRect
      ? { left: domRect.left, top: domRect.top, width: domRect.width, height: domRect.height }
      : { left: 0, top: 0, width: 130, height: 175 }
    emit('open', props.book.id, coverUrl.value, rect, props.book.title)
  }
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function handleDelete() {
  emit('delete', props.book.id)
  showMenu.value = false
}

function handleRelocate() {
  emit('relocate', props.book.id)
  showMenu.value = false
}

function handleAddCover() {
  emit('addCover', props.book.id)
  showMenu.value = false
}
</script>

<template>
  <div
    ref="cardRef"
    class="book-card"
    :class="{ invalid: book.invalid, selectable: selectable, selected: selected }"
    @click="handleOpen"
    @mouseleave="closeMenu"
  >
    <div v-if="selectable" class="select-checkbox" :class="{ checked: selected }" @click.stop="emit('toggleSelect', book.id)">
      <Check v-if="selected" :size="12" />
    </div>
    <div class="book-cover">
      <img v-if="coverUrl" :src="coverUrl" :alt="book.title" class="cover-img" />
      <div v-else class="cover-placeholder">
        <BookOpen :size="32" />
        <span class="cover-format">{{ book.format }}</span>
      </div>
      <div class="cover-shine"></div>
      <div v-if="book.invalid" class="invalid-badge">
        <AlertTriangle :size="14" />
      </div>
      <span v-if="!selectable" class="format-tag">{{ book.format }}</span>
      <div class="cover-overlay">
        <div class="overlay-title" :title="book.title">{{ book.title }}</div>
        <div v-if="book.author" class="overlay-author">{{ book.author }}</div>
      </div>
    </div>
    <div class="book-info">
      <div class="book-progress-bar">
        <div class="progress-fill" :style="{ width: book.progress + '%' }"></div>
      </div>
      <span class="book-progress-text">{{ book.progress }}%</span>
    </div>
    <button v-if="!selectable" class="more-btn" @click="toggleMenu">
      <MoreVertical :size="14" />
    </button>
    <div v-if="showMenu" class="context-menu">
      <div class="menu-item" @click.stop="handleOpen">
        <BookOpen :size="14" />
        <span>打开阅读</span>
      </div>
      <div v-if="book.invalid" class="menu-item" @click.stop="handleRelocate">
        <FolderSearch :size="14" />
        <span>重新定位</span>
      </div>
      <div v-if="!book.coverKey" class="menu-item" @click.stop="handleAddCover">
        <ImageIcon :size="14" />
        <span>添加封面</span>
      </div>
      <div class="menu-item danger" @click.stop="handleDelete">
        <Trash2 :size="14" />
        <span>删除</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.book-card {
  position: relative;
  cursor: pointer;
  border-radius: 3px 7px 7px 3px;
  transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  background: var(--bg-secondary);
  width: 100%;
  transform-origin: left center;
  box-shadow:
    -4px 0 0 0 rgba(0, 0, 0, 0.18),
    -6px 2px 8px rgba(0, 0, 0, 0.16),
    2px 4px 12px rgba(0, 0, 0, 0.12);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: -3px;
    width: 3px;
    height: 100%;
    border-radius: 0 1px 1px 0;
    background: repeating-linear-gradient(
      180deg,
      #f0ebe0 0px,
      #f0ebe0 1.5px,
      #ddd6c8 1.5px,
      #ddd6c8 3px
    );
    box-shadow: 1px 0 3px rgba(0, 0, 0, 0.1);
    z-index: -1;
    transition: all 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    width: 100%;
    height: 3px;
    border-radius: 1px 1px 0 0;
    background: repeating-linear-gradient(
      90deg,
      #f0ebe0 0px,
      #f0ebe0 1.5px,
      #ddd6c8 1.5px,
      #ddd6c8 3px
    );
    box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.08);
    z-index: -1;
    transition: all 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  &:hover {
    transform: perspective(600px) rotateY(-8deg) translateX(3px);
    box-shadow:
      -5px 0 0 0 rgba(0, 0, 0, 0.22),
      -8px 3px 14px rgba(0, 0, 0, 0.22),
      4px 8px 20px rgba(0, 0, 0, 0.15);

    &::after {
      right: -4px;
      width: 4px;
      background: repeating-linear-gradient(
        180deg,
        #ede8dc 0px,
        #ede8dc 1.5px,
        #d8d2c4 1.5px,
        #d8d2c4 3px
      );
      box-shadow: 1px 0 4px rgba(0, 0, 0, 0.12);
    }

    &::before {
      opacity: 0;
    }
  }

  &.invalid {
    opacity: 0.6;
  }

  &.selectable {
    &:hover {
      transform: none;
    }
  }

  &.selected {
    outline: 2px solid var(--accent-color);
    outline-offset: -2px;
  }
}

.select-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 5;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(4px);

  &.checked {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: #fff;
  }
}

.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px 7px 7px 3px;
}

.cover-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.13) 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.06) 100%
  );
  pointer-events: none;
  z-index: 2;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.cover-format {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.invalid-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ef4444;
  color: #fff;
  border-radius: 50%;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.format-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  backdrop-filter: blur(4px);
  line-height: 1.4;
  text-transform: uppercase;
}

.cover-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24px 8px 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
}

.overlay-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-author {
  font-size: 10px;
  opacity: 0.85;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-info {
  padding: 6px 8px;
  min-height: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.book-progress-bar {
  flex: 1;
  height: 3px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 2px;
  transition: width 0.3s;
}

.book-progress-text {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.more-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;

  .book-card:hover & {
    opacity: 1;
  }
}

.context-menu {
  position: absolute;
  top: 24px;
  right: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 120px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.15s;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.danger {
    color: #ef4444;
  }
}
</style>
