<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { X, ArrowLeft, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  text: string
  bookTitle: string
  chapterTitle: string
  opacity: number
}>()

const emit = defineEmits<{
  close: []
}>()

const localOpacity = ref(props.opacity || 0.85)

function onOpacityInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  localOpacity.value = v / 100
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <div class="float-reader" :style="{ '--float-opacity': localOpacity }">
    <div class="float-header">
      <span class="float-title">{{ bookTitle || '简阅' }} · {{ chapterTitle || '当前章节' }}</span>
      <div class="float-controls">
        <span class="float-opacity-label">透明度</span>
        <input
          type="range"
          min="5"
          max="100"
          :value="Math.round(localOpacity * 100)"
          @input="onOpacityInput"
          class="float-opacity-slider"
        />
        <button class="float-btn" @click="handleClose" title="返回阅读器">
          <ArrowLeft :size="14" />
        </button>
        <button class="float-btn float-btn-close" @click="handleClose" title="关闭">
          <X :size="14" />
        </button>
      </div>
    </div>
    <div class="float-content custom-scrollbar-dark">
      <p v-if="text && text.trim()" class="float-text">{{ text }}</p>
      <div v-else class="float-empty">
        <Loader2 :size="20" class="float-spin" />
        <span>当前章节无文字内容</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.float-reader {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 30, var(--float-opacity));
  color: rgba(255, 255, 255, 0.9);
  z-index: 10000;
  user-select: text;
  -webkit-app-region: no-drag;
  animation: floatFadeIn 0.2s ease;
}

@keyframes floatFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.float-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
  flex-shrink: 0;
}

.float-title {
  flex: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.float-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.float-opacity-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.float-opacity-slider {
  width: 70px;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
}

.float-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  &.float-btn-close:hover {
    background: #e74c3c;
  }
}

.float-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.9);
}

.float-text {
  margin: 0;
}

.float-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.float-spin {
  animation: floatSpin 1s linear infinite;
}

@keyframes floatSpin {
  to { transform: rotate(360deg); }
}
</style>
