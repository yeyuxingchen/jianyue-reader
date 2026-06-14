<script lang="ts" setup>
import { useReaderStore } from '@/stores/reader'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const reader = useReaderStore()

function handlePrev() {
  if (reader.rendition?.prev) {
    reader.rendition.prev()
  }
}

function handleNext() {
  if (reader.rendition?.next) {
    reader.rendition.next()
  }
}
</script>

<template>
  <div class="page-turner">
    <button class="turn-btn" @click="handlePrev" title="上一页">
      <ChevronLeft :size="20" />
    </button>
    <span class="page-info">
      {{ reader.currentLocation }} / {{ reader.totalLocations }}
    </span>
    <button class="turn-btn" @click="handleNext" title="下一页">
      <ChevronRight :size="20" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.page-turner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
  gap: 16px;
}

.turn-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 80px;
  text-align: center;
}
</style>
