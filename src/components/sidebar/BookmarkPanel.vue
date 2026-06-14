<script lang="ts" setup>
import { useReaderStore } from '@/stores/reader'
import { useAnnotationsStore } from '@/stores/annotations'
import { Trash2 } from 'lucide-vue-next'

const reader = useReaderStore()
const annotations = useAnnotationsStore()

function handleJump(cfi: string) {
  if (reader.rendition && cfi) {
    reader.rendition.goTo(cfi)
  }
}

function handleDelete(id: string) {
  annotations.removeBookmark(id)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="bookmark-panel">
    <div v-if="annotations.sortedBookmarks.length === 0" class="panel-empty">
      暂无书签
    </div>
    <div v-else class="bookmark-list">
      <div
        v-for="bm in annotations.sortedBookmarks"
        :key="bm.id"
        class="bookmark-item"
        @click="handleJump(bm.cfi)"
      >
        <div class="bm-header">
          <span class="bm-chapter">{{ bm.chapterTitle || '未知章节' }}</span>
          <button class="bm-delete" @click.stop="handleDelete(bm.id)">
            <Trash2 :size="12" />
          </button>
        </div>
        <div v-if="bm.excerpt" class="bm-excerpt">{{ bm.excerpt }}</div>
        <div class="bm-time">{{ formatTime(bm.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bookmark-panel {
  padding: 8px 0;
}

.panel-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.bookmark-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.bm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bm-chapter {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.bm-delete {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 2px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;

  .bookmark-item:hover & {
    opacity: 1;
  }

  &:hover {
    color: #ef4444;
  }
}

.bm-excerpt {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bm-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
</style>
