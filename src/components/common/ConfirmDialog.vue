<script lang="ts" setup>
defineProps<{
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="confirm-overlay" @click="emit('cancel')">
    <div class="confirm-panel" @click.stop>
      <h3 v-if="title" class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-footer">
        <button class="confirm-btn cancel" @click="emit('cancel')">{{ cancelText || '取消' }}</button>
        <button class="confirm-btn confirm" @click="emit('confirm')">{{ confirmText || '确定' }}</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 280px;
  max-width: 380px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.confirm-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-message {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-btn {
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

  &.confirm {
    background: #378ADD;
    color: #fff;

    &:hover {
      background: #2d6fc7;
    }
  }
}
</style>
