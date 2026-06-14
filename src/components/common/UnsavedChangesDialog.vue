<script lang="ts" setup>
defineProps<{
  message?: string
}>()

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <div class="unsaved-overlay" @click="emit('cancel')">
    <div class="unsaved-panel" @click.stop>
      <h3 class="unsaved-title">文件尚未保存</h3>
      <p class="unsaved-message">{{ message || '当前修改尚未保存，是否先保存？' }}</p>
      <div class="unsaved-footer">
        <button class="unsaved-btn cancel" @click="emit('cancel')">取消</button>
        <button class="unsaved-btn discard" @click="emit('discard')">放弃修改</button>
        <button class="unsaved-btn save" @click="emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.unsaved-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unsaved-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.unsaved-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.unsaved-message {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.unsaved-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.unsaved-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: all 0.15s;

  &.cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);

    &:hover {
      opacity: 0.85;
    }
  }

  &.discard {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);

    &:hover {
      color: #e74c3c;
      border-color: #e74c3c;
    }
  }

  &.save {
    background: #378ADD;
    color: #fff;

    &:hover {
      background: #2d6fc7;
    }
  }
}
</style>
