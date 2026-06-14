<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { ArrowLeft, PanelLeftOpen, Bookmark, Settings, Play, Pause, Square, Loader2, PictureInPicture2 } from 'lucide-vue-next'
import { useTTSStore } from '@/stores/tts'

const ttsStore = useTTSStore()

const props = defineProps<{
  title?: string
  chapter?: string
  progress?: number
  isBookmarked?: boolean
}>()

const emit = defineEmits<{
  back: []
  'toggle-sidebar': []
  'add-bookmark': []
  'open-settings': []
  'open-ai-settings': []
  'open-ai-history': []
  'jump-progress': [fraction: number]
  'open-float-reader': []
}>()

const showSlider = ref(false)
const localSliderValue = ref(props.progress ?? 0)
const isDragging = ref(false)
const syncLocked = ref(false)
let syncLockTimer: ReturnType<typeof setTimeout> | null = null
let lastJumpTimer: ReturnType<typeof setTimeout> | null = null

// 拖动中和跳转锁定期间不同步 props，防止跳回
watch(() => props.progress, (val) => {
  if (isDragging.value || syncLocked.value) return
  localSliderValue.value = val ?? 0
})

function toggleSlider() {
  showSlider.value = !showSlider.value
  if (showSlider.value) {
    localSliderValue.value = props.progress ?? 0
  }
}

function lockSync(duration: number) {
  syncLocked.value = true
  if (syncLockTimer) clearTimeout(syncLockTimer)
  syncLockTimer = setTimeout(() => {
    syncLocked.value = false
    syncLockTimer = null
  }, duration)
}

// 拖动中实时跳转（节流 200ms）
function handleSliderInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  localSliderValue.value = val
  isDragging.value = true
  if (lastJumpTimer) return // 节流中
  lastJumpTimer = setTimeout(() => {
    lastJumpTimer = null
    emit('jump-progress', val / 100)
  }, 200)
}

// 松手时立即跳到最终位置，并锁定同步 1 秒等 relocate 稳定
function handleSliderChange(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  localSliderValue.value = val
  isDragging.value = false
  if (lastJumpTimer) {
    clearTimeout(lastJumpTimer)
    lastJumpTimer = null
  }
  emit('jump-progress', val / 100)
  lockSync(1000)
}

function handleClickOutside(e: MouseEvent) {
  if (!showSlider.value) return
  const target = e.target as HTMLElement
  if (target.closest('.progress-area')) return
  showSlider.value = false
}

function handleIframeMousedown() {
  if (showSlider.value) {
    showSlider.value = false
    isDragging.value = false
  }
}

function toggleTTS() {
  window.dispatchEvent(new CustomEvent('tts-toggle-play'))
}

function stopTTS() {
  window.dispatchEvent(new CustomEvent('tts-stop'))
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('iframe-mousedown', handleIframeMousedown)
  ttsStore.loadSettings()
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('iframe-mousedown', handleIframeMousedown)
  if (syncLockTimer) clearTimeout(syncLockTimer)
  if (lastJumpTimer) clearTimeout(lastJumpTimer)
})
</script>

<template>
  <div class="top-bar">
    <div class="top-bar-left">
      <button class="bar-btn" @click="emit('back')" title="返回书架">
        <ArrowLeft :size="18" />
      </button>
      <button class="bar-btn" @click="emit('toggle-sidebar')" title="侧边栏">
        <PanelLeftOpen :size="18" />
      </button>
    </div>
    <div class="top-bar-center">
      <span class="bar-title">{{ title }}</span>
      <span v-if="chapter" class="bar-chapter">{{ chapter }}</span>
    </div>
    <div class="top-bar-right">
      <div class="progress-area">
        <span class="bar-progress" @click.stop="toggleSlider" title="跳转进度">{{ progress }}%</span>
        <Transition name="slider-fade">
          <div v-if="showSlider" class="progress-slider-panel" @click.stop>
            <input
              type="range"
              class="progress-slider"
              min="0"
              max="100"
              :value="localSliderValue"
              @input="handleSliderInput"
              @change="handleSliderChange"
            />
            <span class="slider-label">{{ localSliderValue }}%</span>
          </div>
        </Transition>
      </div>
      <button
        class="bar-btn"
        :class="{ active: isBookmarked }"
        @click="emit('add-bookmark')"
        :title="isBookmarked ? '移除书签 (Ctrl+B)' : '添加书签 (Ctrl+B)'"
      >
        <Bookmark :size="16" :fill="isBookmarked ? 'currentColor' : 'none'" />
      </button>
      <button class="bar-btn" @click="emit('open-settings')" title="设置">
        <Settings :size="16" />
      </button>
      <button class="bar-btn" @click="emit('open-float-reader')" title="浮窗阅读">
        <PictureInPicture2 :size="16" />
      </button>
      <!-- TTS 播放控制 -->
      <template v-if="ttsStore.isEnabled">
        <button
          class="bar-btn"
          :class="{ active: ttsStore.state.isPlaying }"
          @click="toggleTTS"
          :title="ttsStore.state.isPlaying ? '暂停朗读' : '开始朗读'"
        >
          <Pause v-if="ttsStore.state.isPlaying" :size="16" />
          <Play v-else :size="16" />
        </button>
        <button
          v-if="ttsStore.state.isPlaying || ttsStore.state.currentSentenceIndex > 0"
          class="bar-btn"
          @click="stopTTS"
          title="停止朗读"
        >
          <Square :size="14" />
        </button>
        <span v-if="ttsStore.state.totalSentences > 0" class="tts-progress">
          <Loader2 v-if="ttsStore.state.isLoading" :size="12" class="tts-spin" />
          {{ ttsStore.state.currentSentenceIndex + 1 }}/{{ ttsStore.state.totalSentences }}
        </span>
      </template>
      <button class="bar-btn" @click="emit('open-ai-settings')" title="AI 设置">
        <span class="ai-icon-wrapper">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <text x="0.5" y="12" font-size="11" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui">AI</text>
            <rect x="11" y="11" width="5" height="5" rx="1" fill="var(--bg-secondary)" stroke="currentColor" stroke-width="0.9"/>
            <path d="M12.5 13.5 L14.5 13.5 M13.5 12.5 L13.5 14.5" stroke="currentColor" stroke-width="0.8"/>
          </svg>
        </span>
      </button>
      <button class="bar-btn" @click="emit('open-ai-history')" title="AI 历史记录">
        <span class="ai-icon-wrapper">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <text x="0.5" y="12" font-size="11" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui">AI</text>
            <rect x="11" y="11" width="5" height="5" rx="1" fill="var(--bg-secondary)" stroke="currentColor" stroke-width="0.9"/>
            <circle cx="13.5" cy="13.5" r="1.5" stroke="currentColor" stroke-width="0.7" fill="none"/>
            <line x1="13.5" y1="12.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="0.6"/>
            <line x1="13.5" y1="13.5" x2="14.3" y2="13.8" stroke="currentColor" stroke-width="0.6"/>
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.top-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
  gap: 8px;
}

.top-bar-left, .top-bar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.top-bar-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.bar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.bar-chapter {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.bar-progress {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 4px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  user-select: none;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.progress-area {
  position: relative;
  display: flex;
  align-items: center;
}

.progress-slider-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px 14px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 70;
  min-width: 220px;

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 16px;
    border-width: 0 6px 6px;
    border-style: solid;
    border-color: transparent transparent var(--border-color) transparent;
  }

  &::after {
    content: '';
    position: absolute;
    top: -5px;
    right: 16px;
    border-width: 0 5px 5px;
    border-style: solid;
    border-color: transparent transparent var(--bg-secondary) transparent;
  }
}

.progress-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent-color);
    border: 2px solid var(--bg-secondary);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.15s;

    &:hover {
      transform: scale(1.15);
    }

    &:active {
      transform: scale(1.25);
    }
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent-color);
    border: 2px solid var(--bg-secondary);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }
}

.slider-label {
  font-size: 12px;
  color: var(--text-primary);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.slider-fade-enter-active,
.slider-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.slider-fade-enter-from,
.slider-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.bar-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    color: var(--accent-color);
  }
}

.ai-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.tts-progress {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.tts-spin {
  animation: tts-spin 1s linear infinite;
}

@keyframes tts-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
