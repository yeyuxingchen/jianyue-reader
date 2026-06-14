<script lang="ts" setup>
import { BookPlus } from 'lucide-vue-next'

const emit = defineEmits<{
  import: []
}>()
</script>

<template>
  <div class="book-import" @click="emit('import')">
    <div class="import-icon">
      <BookPlus :size="48" />
    </div>
    <div class="import-text">
      <h3>还没有添加书籍</h3>
      <p>点击此处或拖拽文件到窗口导入电子书</p>
      <p class="import-formats">支持 EPUB / TXT / MOBI / AZW3</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.book-import {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  cursor: pointer;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
  max-width: 360px;

  &:hover {
    border-color: var(--accent-color);
    background: var(--bg-secondary);
  }
}

.import-icon {
  color: var(--accent-color);
}

.import-text {
  text-align: center;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.import-formats {
  margin-top: 4px !important;
  font-size: 11px !important;
  color: var(--text-tertiary) !important;
}
</style>
