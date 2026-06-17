<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Pin } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const bookTitle = ref('简阅')
const chapterTitle = ref('当前章节')
const content = ref('')
const opacity = ref(0.5)
const hasContent = ref(false)
const isPinned = ref(true) // 默认置顶

// 计算字体样式
const fontFamily = computed(() => {
  const matchedFont = settings.customFonts.find(f => f.name === settings.settings.fontFamily)
  if (matchedFont) {
    return "'CustomReaderFont', system-ui, sans-serif"
  }
  return settings.settings.fontFamily !== 'system-ui' ? settings.settings.fontFamily : 'system-ui, sans-serif'
})

function onOpacityInput(e: Event) {
  opacity.value = Number((e.target as HTMLInputElement).value) / 100
}

async function togglePin() {
  try {
    if (window.electronAPI?.floatReader) {
      isPinned.value = await window.electronAPI.floatReader.togglePin()
    }
  } catch {}
}

// 返回阅读器
function backToMain() {
  try {
    if (window.electronAPI?.floatReader) {
      window.electronAPI.floatReader.close(true)
    }
  } catch {}
}

// 退出应用
function closeApp() {
  try {
    if (window.electronAPI?.floatReader) {
      window.electronAPI.floatReader.close(false)
    }
  } catch {}
}

onMounted(async () => {
  // 加载设置（包括字体配置）
  settings.loadSettings()

  // 注入自定义字体到文档（使用 base64 data URI 避免跨域问题）
  const matchedFont = settings.customFonts.find(f => f.name === settings.settings.fontFamily)
  if (matchedFont) {
    try {
      const fontData = await (window as any).electronAPI?.font?.getBase64(matchedFont.path)
      if (fontData) {
        const style = document.createElement('style')
        style.textContent = `@font-face { font-family: 'CustomReaderFont'; src: url('data:${fontData.mimeType};base64,${fontData.data}'); }`
        document.head.appendChild(style)
      }
    } catch (err) {
      console.error('Failed to load font:', err)
    }
  }

  // 暴露给主进程注入数据（兼容旧版 executeJavaScript 方式）
  ;(window as any).setFloatReaderContent = (data: {
    text: string
    bookTitle: string
    chapterTitle: string
    opacity: number
  }) => {
    if (!data) return
    if (data.text && data.text.trim()) {
      content.value = data.text
      hasContent.value = true
    } else {
      content.value = ''
      hasContent.value = false
    }
    bookTitle.value = data.bookTitle || '简阅'
    chapterTitle.value = data.chapterTitle || '当前章节'
    if (typeof data.opacity === 'number') {
      opacity.value = data.opacity
    }
  }

  // 监听主进程通过 IPC 发送的数据
  if (window.electronAPI?.on) {
    window.electronAPI.on('float:reader:data', (data: any) => {
      if (!data) return
      if (data.text && data.text.trim()) {
        content.value = data.text
        hasContent.value = true
      } else {
        content.value = ''
        hasContent.value = false
      }
      bookTitle.value = data.bookTitle || '简阅'
      chapterTitle.value = data.chapterTitle || '当前章节'
      if (typeof data.opacity === 'number') {
        opacity.value = data.opacity
      }
    })
  }

  // 通知主进程渲染进程已就绪
  if (window.electronAPI?.send) {
    window.electronAPI.send('float:reader:ready')
  }
})
</script>

<template>
  <div class="float-reader" :style="{ opacity }">
    <!-- 顶部标题栏 -->
    <div class="float-header">
      <span class="float-title">{{ bookTitle }} · {{ chapterTitle }}</span>
      <div class="float-header-actions">
        <span class="float-opacity-label">透明度</span>
        <input
          type="range"
          class="float-opacity-slider"
          min="20"
          max="100"
          :value="Math.round(opacity * 100)"
          @input="onOpacityInput"
        />
        <button class="float-btn" @click="backToMain" title="返回阅读器">↩</button>
        <button class="float-btn" :class="{ 'float-pin-active': isPinned }" @click="togglePin" title="置顶/取消置顶">
          <Pin :size="12" :stroke-width="2" />
        </button>
        <button class="float-btn float-close-btn" @click="closeApp" title="关闭">✕</button>
      </div>
    </div>

    <!-- 阅读内容 -->
    <div class="float-content custom-scrollbar-dark">
      <div v-if="hasContent" class="float-text" :style="{ fontFamily, fontSize: settings.settings.fontSize + 'px', lineHeight: settings.settings.lineHeight }">{{ content }}</div>
      <div v-else class="float-empty">当前章节无文字内容</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.float-reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 30, 1);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.float-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  -webkit-app-region: drag;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 8px;
  flex-shrink: 0;
}

.float-title {
  flex: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.float-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.float-opacity-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.float-opacity-slider {
  width: 60px;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
}

.float-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }
}

.float-pin-active {
  background: rgba(100, 180, 255, 0.25) !important;
  color: #6ab4ff !important;
}

.float-close-btn:hover {
  background: #e74c3c !important;
}

.float-content {
  flex: 1;
  overflow-y: auto;
}

.float-text {
  padding: 16px 20px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}

.float-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}
</style>
