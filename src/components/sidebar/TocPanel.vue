<script lang="ts" setup>
import { useReaderStore } from '@/stores/reader'
import type { TocItem } from '@/types'

const reader = useReaderStore()

function handleTocClick(item: TocItem) {
  if (reader.rendition && item.href) {
    reader.rendition.goTo(item.href)
  }
}
</script>

<template>
  <div class="toc-panel">
    <div v-if="reader.toc.length === 0" class="toc-empty">
      暂无目录信息
    </div>
    <div v-else class="toc-list">
      <template v-for="item in reader.toc" :key="item.href">
        <div class="toc-item" @click="handleTocClick(item)">
          {{ item.label }}
        </div>
        <template v-if="item.subitems?.length">
          <div
            v-for="sub in item.subitems"
            :key="sub.href"
            class="toc-item sub"
            @click="handleTocClick(sub)"
          >
            {{ sub.label }}
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.toc-panel {
  padding: 8px 0;
}

.toc-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.toc-list {
  display: flex;
  flex-direction: column;
}

.toc-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.sub {
    padding-left: 32px;
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>
