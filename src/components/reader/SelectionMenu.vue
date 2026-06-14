<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useAnnotationsStore } from '@/stores/annotations'
import type { AnnotationColor } from '@/types'
import { MessageSquare, Copy, Search } from 'lucide-vue-next'

const reader = useReaderStore()
const annotations = useAnnotationsStore()

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const selectedCfiRange = ref('')
const selectedText = ref('')
const showNoteInput = ref(false)
const noteText = ref('')
const cooldown = ref(false)

const emit = defineEmits<{
  'ai-search': [text: string]
}>()

const existingAnnotation = computed(() => {
  if (!selectedCfiRange.value) return null
  return annotations.annotations.find((a: any) => a.cfiRange === selectedCfiRange.value && a.note) || null
})

function setCooldown() {
  cooldown.value = true
  window.dispatchEvent(new CustomEvent('selection-cooldown'))
  setTimeout(() => {
    cooldown.value = false
  }, 300)
}

const colors: { value: AnnotationColor; label: string; bg: string }[] = [
  { value: 'yellow', label: '黄色', bg: '#fef08a' },
  { value: 'green', label: '绿色', bg: '#86efac' },
  { value: 'blue', label: '蓝色', bg: '#93c5fd' },
  { value: 'pink', label: '粉色', bg: '#fda4af' },
  { value: 'underline', label: '下划线', bg: 'transparent' },
]

const menuRef = ref<HTMLElement>()

function handleTextSelected(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail.text && detail.text.trim()) {
    if (showNoteInput.value) return
    selectedCfiRange.value = detail.cfiRange
    selectedText.value = detail.text
    visible.value = true
    showNoteInput.value = false
    noteText.value = ''
    position.value = { x: detail.x || 100, y: detail.y || 100 }
  }
}

function handleHighlight(color: AnnotationColor) {
  setCooldown()
  window.dispatchEvent(new CustomEvent('remove-annotation-overlay', {
    detail: { cfiRange: selectedCfiRange.value }
  }))
  annotations.addAnnotation(
    selectedCfiRange.value,
    selectedText.value,
    color,
    reader.currentChapterTitle
  )
  window.dispatchEvent(new CustomEvent('render-annotation', {
    detail: { cfiRange: selectedCfiRange.value, color }
  }))
  visible.value = false
}

function handleCopy() {
  setCooldown()
  if (window.electronAPI?.clipboard) {
    window.electronAPI.clipboard.writeText(selectedText.value)
  } else {
    navigator.clipboard.writeText(selectedText.value)
  }
  visible.value = false
}

function handleAddNote() {
  setCooldown()
  if (existingAnnotation.value) {
    noteText.value = existingAnnotation.value.note || ''
  }
  showNoteInput.value = true
}

function submitNote() {
  setCooldown()
  if (noteText.value.trim()) {
    annotations.addAnnotation(
      selectedCfiRange.value,
      selectedText.value,
      'yellow',
      reader.currentChapterTitle,
      noteText.value.trim()
    )
    window.dispatchEvent(new CustomEvent('render-annotation', {
      detail: { cfiRange: selectedCfiRange.value, color: 'yellow' }
    }))
  }
  showNoteInput.value = false
  noteText.value = ''
  visible.value = false
}

function handleSearch() {
  setCooldown()
  visible.value = false
  window.dispatchEvent(new CustomEvent('open-search', { detail: { keyword: selectedText.value } }))
}

function handleAISearch() {
  setCooldown()
  const text = selectedText.value
  visible.value = false
  emit('ai-search', text)
}

onMounted(() => {
  window.addEventListener('text-selected', handleTextSelected)
  window.addEventListener('mousedown', handleGlobalMouseDown)
  window.addEventListener('iframe-mousedown', handleIframeMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('text-selected', handleTextSelected)
  window.removeEventListener('mousedown', handleGlobalMouseDown)
  window.removeEventListener('iframe-mousedown', handleIframeMouseDown)
})

function handleGlobalMouseDown(e: MouseEvent) {
  if (!visible.value) return
  if (menuRef.value?.contains(e.target as Node)) return
  visible.value = false
  showNoteInput.value = false
  noteText.value = ''
}

function handleIframeMouseDown() {
  if (!visible.value) return
  visible.value = false
  showNoteInput.value = false
  noteText.value = ''
  window.dispatchEvent(new CustomEvent('selection-cooldown'))
}
</script>

<template>
  <div v-if="visible" ref="menuRef" class="selection-menu" :style="{ left: position.x + 'px', top: position.y + 'px' }">
    <div class="color-buttons">
      <button
        v-for="color in colors"
        :key="color.value"
        class="color-btn"
        :title="color.label"
        :style="{ background: color.bg }"
        :class="{ underline: color.value === 'underline' }"
        @click="handleHighlight(color.value)"
      ></button>
    </div>
    <div class="action-buttons">
      <button class="action-btn" :class="{ 'has-note': !!existingAnnotation }" @click="handleAddNote" title="添加备注">
        <MessageSquare :size="14" />
      </button>
      <button class="action-btn" @click="handleCopy" title="复制">
        <Copy :size="14" />
      </button>
      <button class="action-btn" @click="handleSearch" title="搜索">
        <Search :size="14" />
      </button>
      <button class="action-btn ai-search-btn" @click="handleAISearch" title="AI 搜索">
        <span class="ai-icon-wrapper">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <text x="0.5" y="12" font-size="11" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui">AI</text>
            <rect x="11" y="11" width="5" height="5" rx="1" fill="var(--bg-secondary)" stroke="currentColor" stroke-width="0.9"/>
            <circle cx="13.5" cy="13" r="1.2" stroke="currentColor" stroke-width="0.7" fill="none"/>
            <line x1="14.3" y1="13.8" x2="15.2" y2="14.7" stroke="currentColor" stroke-width="0.8"/>
          </svg>
        </span>
      </button>
    </div>
    <div v-if="showNoteInput" class="note-input-area">
      <textarea v-model="noteText" placeholder="输入备注..." rows="2"></textarea>
      <button @click="submitNote">确定</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.selection-menu {
  position: fixed;
  z-index: 50;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 8px;
  transform: translateX(-50%);
}

.color-buttons {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.15);
  }

  &.underline {
    background: transparent !important;
    border-bottom: 3px solid var(--text-primary);
    border-radius: 0;
  }
}

.action-buttons {
  display: flex;
  gap: 4px;
  border-top: 1px solid var(--border-color);
  padding-top: 4px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.has-note {
    color: var(--accent-color);
  }
}

.ai-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.note-input-area {
  margin-top: 8px;
  border-top: 1px solid var(--border-color);
  padding-top: 8px;

  textarea {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 6px;
    font-size: 12px;
    resize: none;
    box-sizing: border-box;
  }

  button {
    margin-top: 4px;
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: var(--accent-color);
    color: #fff;
    font-size: 12px;
    cursor: pointer;
  }
}
</style>
