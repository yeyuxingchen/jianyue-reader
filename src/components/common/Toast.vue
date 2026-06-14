<script lang="ts" setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast-fade">
      <div v-for="msg in toastStore.messages" :key="msg.id" class="toast-content">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#52c41a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5.5 8 L7 9.5 L10.5 6" />
        </svg>
        <span>{{ msg.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
}

.toast-fade-move,
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-fade-leave-active {
  position: absolute;
}
</style>
