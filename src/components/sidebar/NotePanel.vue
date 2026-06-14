<script lang="ts" setup>
import { ref } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useAnnotationsStore } from '@/stores/annotations'
import { Trash2, Edit3, Check, X } from 'lucide-vue-next'

const reader = useReaderStore()
const annotations = useAnnotationsStore()
const editingId = ref('')
const editNote = ref('')

function handleJump(cfiRange: string) {
  if (reader.rendition && cfiRange) {
    reader.rendition.goTo(cfiRange)
  }
}

function handleDelete(id: string) {
  const ann = annotations.annotations.find(a => a.id === id)
  if (ann?.cfiRange) {
    window.dispatchEvent(new CustomEvent('remove-annotation-overlay', {
      detail: { cfiRange: ann.cfiRange }
    }))
  }
  annotations.removeAnnotation(id)
}

function startEdit(id: string, currentNote: string) {
  editingId.value = id
  editNote.value = currentNote || ''
}

function saveEdit() {
  if (editingId.value) {
    annotations.updateAnnotationNote(editingId.value, editNote.value)
  }
  editingId.value = ''
  editNote.value = ''
}

function cancelEdit() {
  editingId.value = ''
  editNote.value = ''
}

const colorMap: Record<string, string> = {
  yellow: '#fef08a',
  green: '#86efac',
  blue: '#93c5fd',
  pink: '#fda4af',
  underline: 'var(--text-primary)',
}
</script>

<template>
  <div class="note-panel">
    <div v-if="annotations.sortedAnnotations.length === 0" class="panel-empty">
      暂无高亮或备注
    </div>
    <div v-else class="note-list">
      <div
        v-for="ann in annotations.sortedAnnotations"
        :key="ann.id"
        class="note-item"
        @click="handleJump(ann.cfiRange)"
      >
        <div class="note-header">
          <span class="note-color-dot" :style="{ background: colorMap[ann.color] || '#fef08a' }"></span>
          <span class="note-chapter">{{ ann.chapterTitle || '未知章节' }}</span>
          <div class="note-actions">
            <button @click.stop="startEdit(ann.id, ann.note || '')">
              <Edit3 :size="12" />
            </button>
            <button @click.stop="handleDelete(ann.id)">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <div class="note-text">{{ ann.text }}</div>
        <div v-if="ann.note && editingId !== ann.id" class="note-content">
          {{ ann.note }}
        </div>
        <div v-if="editingId === ann.id" class="note-edit">
          <textarea v-model="editNote" rows="2" placeholder="输入备注..."></textarea>
          <div class="edit-actions">
            <button @click.stop="saveEdit"><Check :size="12" /></button>
            <button @click.stop="cancelEdit"><X :size="12" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.note-panel {
  padding: 8px 0;
}

.panel-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.note-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.note-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.note-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.note-chapter {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;

  .note-item:hover & {
    opacity: 1;
  }

  button {
    background: none;
    border: none;
    color: var(--text-secondary);
    padding: 2px;
    cursor: pointer;

    &:hover {
      color: var(--text-primary);
    }
  }
}

.note-text {
  font-size: 13px;
  color: var(--text-primary);
  margin-top: 4px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.note-content {
  font-size: 12px;
  color: var(--accent-color);
  margin-top: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.note-edit {
  margin-top: 6px;

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

  .edit-actions {
    display: flex;
    gap: 4px;
    margin-top: 4px;

    button {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      padding: 4px 8px;
      cursor: pointer;
    }
  }
}
</style>
