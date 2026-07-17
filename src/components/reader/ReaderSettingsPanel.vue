<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Upload, Bold, X, Type } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import type { ThemeMode } from '@/types'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SystemFontDialog from '@/components/reader/SystemFontDialog.vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const settings = useSettingsStore()

// 系统字体弹窗
const showSystemFontDialog = ref(false)

// 字体删除确认
const showDeleteConfirm = ref(false)
const pendingDeleteFont = ref<{ name: string; value: string } | null>(null)

const themeList: { id: ThemeMode; name: string; previewBg: string; lineColor: string; lineOpacity1: number; lineOpacity2: number; labelBg: string; labelColor: string }[] = [
  { id: 'parchment', name: '羊皮纸', previewBg: '#F5F0E8', lineColor: '#3A2E1E', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#EDE8DF', labelColor: '#6B5740' },
  { id: 'bamboo', name: '竹林绿', previewBg: '#E8F5E0', lineColor: '#1B3A1A', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#D8EDD0', labelColor: '#2A5228' },
  { id: 'sand', name: '暖沙', previewBg: '#FAF3E0', lineColor: '#3D2F00', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#F0E6C8', labelColor: '#6B4E00' },
  { id: 'sky', name: '天青', previewBg: '#E6F0F5', lineColor: '#1A2E3A', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#D5E6EF', labelColor: '#1A3A4A' },
  { id: 'nightgreen', name: '深夜绿', previewBg: '#1E2A1E', lineColor: '#C8DEB0', lineOpacity1: 0.8, lineOpacity2: 0.45, labelBg: '#253225', labelColor: '#A8C890' },
  { id: 'inkgold', name: '墨夜金', previewBg: '#1C1A14', lineColor: '#D4C89A', lineOpacity1: 0.8, lineOpacity2: 0.45, labelBg: '#262318', labelColor: '#B0A070' },
  { id: 'deepsea', name: '深海蓝', previewBg: '#1A1E2A', lineColor: '#B0C4DE', lineOpacity1: 0.8, lineOpacity2: 0.45, labelBg: '#222836', labelColor: '#8AACCC' },
  { id: 'candle', name: '烛火', previewBg: '#2A1F1A', lineColor: '#D4B896', lineOpacity1: 0.8, lineOpacity2: 0.45, labelBg: '#352820', labelColor: '#B09070' },
  { id: 'softwhite', name: '冷白', previewBg: '#F2F0F0', lineColor: '#2C2C2C', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#E8E6E6', labelColor: '#505050' },
  { id: 'purewhite', name: '纯白', previewBg: '#ffffff', lineColor: '#1a1a1a', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#eef0f3', labelColor: '#5f6368' },
  { id: 'lavender', name: '薰衣草', previewBg: '#F0EBF4', lineColor: '#2E1A3A', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#E4DCF0', labelColor: '#5A3A6A' },
  { id: 'charcoal', name: '深灰', previewBg: '#3A3A3A', lineColor: '#E0E0E0', lineOpacity1: 0.8, lineOpacity2: 0.45, labelBg: '#484848', labelColor: '#C8C8C8' },
  { id: 'eyeguard', name: '护目黄', previewBg: '#FFFDE8', lineColor: '#333300', lineOpacity1: 0.7, lineOpacity2: 0.4, labelBg: '#F5F0C0', labelColor: '#5A5000' },
]

const fontOptions = computed(() => {
  const defaultName = settings.getDefaultFontDisplayName()
  const options = [{ name: defaultName, value: 'system-ui', isDefault: true }]
  for (const font of settings.customFonts) {
    options.push({ name: font.name, value: font.name, isDefault: false })
  }
  return options
})

function isFontActive(opt: { value: string; isDefault: boolean }): boolean {
  if (opt.isDefault) {
    const defaultFont = settings.settings.defaultSystemFont
    return settings.settings.fontFamily === 'system-ui' ||
           Boolean(defaultFont && settings.settings.fontFamily === defaultFont)
  }
  return settings.settings.fontFamily === opt.value
}

function close() {
  emit('update:visible', false)
}

async function handleUploadFont() {
  const filePaths = await window.services.showFontPicker()
  if (filePaths && filePaths.length > 0) {
    for (const srcPath of filePaths) {
      const cachedPath = await window.services.copyFontToCache(srcPath)
      const name = (await window.services.getFileName(srcPath)).replace(/\.[^.]+$/, '')
      settings.addFont({ name, path: cachedPath })
    }
  }
}

function handleSelectFont(fontName: string) {
  if (fontName === 'system-ui') {
    const defaultFont = settings.settings.defaultSystemFont
    if (defaultFont) {
      settings.setFontFamily(defaultFont)
    } else {
      settings.setFontFamily('system-ui')
    }
  } else {
    settings.setFontFamily(fontName)
  }
}

function handleDeleteFont(opt: { name: string; value: string }) {
  pendingDeleteFont.value = opt
  showDeleteConfirm.value = true
}

function confirmDeleteFont() {
  if (pendingDeleteFont.value) {
    const font = settings.customFonts.find(f => f.name === pendingDeleteFont.value!.value)
    if (font) {
      settings.removeFont(font.path)
    }
  }
  showDeleteConfirm.value = false
  pendingDeleteFont.value = null
}

// 系统字体确认：只更新默认字体设置；若当前为"默认字体"则同步切换
function handleSystemFontConfirm(fontName: string) {
  settings.setDefaultSystemFont(fontName)
  if (settings.settings.fontFamily === 'system-ui') {
    settings.setFontFamily(fontName)
  }
}
</script>

<template>
  <div v-if="visible" class="settings-overlay" @click="close">
    <div class="settings-panel" @click.stop>
      <h3>阅读设置</h3>
      <div class="setting-row">
        <label>布局</label>
        <div class="mode-buttons">
          <button :class="{ active: settings.settings.readerMode === 'scroll' }" @click="settings.setReaderMode('scroll')">滚动</button>
          <button :class="{ active: settings.settings.readerMode === 'single' }" @click="settings.setReaderMode('single')">单页</button>
        </div>
      </div>
      <div class="setting-row">
        <label>字号</label>
        <div class="setting-control">
          <button @click="settings.setFontSize(settings.settings.fontSize - 1)">−</button>
          <span>{{ settings.settings.fontSize }}px</span>
          <button @click="settings.setFontSize(settings.settings.fontSize + 1)">+</button>
        </div>
      </div>
      <div class="setting-row">
        <label>行高</label>
        <div class="setting-control">
          <button @click="settings.setLineHeight(settings.settings.lineHeight - 0.1)">−</button>
          <span>{{ settings.settings.lineHeight.toFixed(1) }}</span>
          <button @click="settings.setLineHeight(settings.settings.lineHeight + 0.1)">+</button>
        </div>
      </div>
      <div class="setting-row">
        <label>字体</label>
        <div class="font-actions">
          <button class="upload-font-btn" title="上传字体" @click="handleUploadFont">
            <Upload :size="14" :stroke-width="1.5" />
          </button>
          <button class="upload-font-btn" title="选择系统字体" @click="showSystemFontDialog = true">
            <Type :size="14" :stroke-width="1.5" />
          </button>
        </div>
      </div>
      <div v-if="settings.hasCustomFonts" class="font-section">
        <div class="font-grid">
          <button
            v-for="opt in fontOptions"
            :key="opt.value"
            class="font-card"
            :class="{ active: isFontActive(opt) }"
            :title="opt.name"
            @click="handleSelectFont(opt.value)"
          >
            <span class="font-card-name">{{ opt.name }}</span>
            <span
              v-if="opt.value !== 'system-ui'"
              class="font-delete-btn"
              title="删除字体"
              @click.stop="handleDeleteFont(opt)"
            >
              <X :size="12" :stroke-width="2" />
            </span>
          </button>
        </div>
      </div>
      <div class="theme-section">
        <div class="theme-section-header">
          <label class="theme-section-label">主题</label>
          <button
            class="bold-toggle-btn"
            :class="{ active: settings.settings.fontBold }"
            :title="settings.settings.fontBold ? '关闭加粗' : '开启加粗'"
            @click="settings.setFontBold(!settings.settings.fontBold)"
          >
            <Bold :size="12" />
            <span v-if="!settings.settings.fontBold" class="bold-slash"></span>
          </button>
        </div>
        <div class="theme-grid">
          <button
            v-for="t in themeList"
            :key="t.id"
            class="theme-card"
            :class="{ active: settings.settings.theme === t.id }"
            @click="settings.setTheme(t.id)"
          >
            <div class="theme-preview" :style="{ background: t.previewBg }">
              <div class="preview-line wide" :style="{ background: t.lineColor, opacity: t.lineOpacity1 }"></div>
              <div class="preview-line mid" :style="{ background: t.lineColor, opacity: t.lineOpacity2 }"></div>
            </div>
            <div class="theme-label" :style="{ background: t.labelBg, color: t.labelColor }">
              {{ t.name }}
              <span v-if="settings.settings.theme === t.id" class="check-badge">
                <svg viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="#fff" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <SystemFontDialog
      v-model:visible="showSystemFontDialog"
      :current-font="settings.settings.defaultSystemFont || settings.settings.fontFamily"
      @confirm="handleSystemFontConfirm"
    />

    <ConfirmDialog
      v-if="showDeleteConfirm"
      title="删除确认"
      :message="`确定删除字体「${pendingDeleteFont?.name}」吗？`"
      @confirm="confirmDeleteFont"
      @cancel="showDeleteConfirm = false; pendingDeleteFont = null"
    />
  </div>
</template>

<style lang="scss" scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 340px;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    color: var(--text-primary);
  }
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;

  label {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  span {
    font-size: 13px;
    min-width: 40px;
    text-align: center;
    color: var(--text-primary);
  }
}

.mode-buttons {
  display: flex;
  gap: 6px;

  button {
    padding: 4px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;

    &.active {
      border-color: #378ADD;
      background: #378ADD;
      color: #fff;
    }
  }
}

.theme-section {
  padding: 12px 0 15px;
}

.theme-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.theme-section-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.bold-toggle-btn {
  position: relative;
  width: 23px;
  height: 23px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;

  &.active {
    border-color: #378ADD;
    background: #378ADD;
    color: #fff;
  }

  &:hover:not(.active) {
    color: var(--text-primary);
  }
}

.bold-slash {
  position: absolute;
  inset: 2px;
  border-radius: 2px;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: -2px;
    right: -2px;
    height: 1.5px;
    background: currentColor;
    opacity: 0.6;
    transform: rotate(-45deg);
    transform-origin: center;
  }
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding-top: 8px;
}

.theme-card {
  border-radius: 6px;
  border: 1.5px solid transparent;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;

  &:hover {
    border-color: rgba(0,0,0,0.18);
  }

  &.active {
    border-color: #378ADD;
  }
}

.theme-preview {
  height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 5px 6px;
  gap: 2px;
  border-radius: 6px 6px 0 0;
}

.preview-line {
  border-radius: 2px;
  height: 3px;

  &.wide {
    width: 85%;
  }

  &.mid {
    width: 60%;
  }
}

.theme-label {
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 500;
  border-top: 0.5px solid rgba(0,0,0,0.07);
  border-radius: 0 0 6px 6px;
}

.check-badge {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #378ADD;
  display: flex;
  align-items: center;
  justify-content: center;
  float: right;
  margin-top: -1px;

  svg {
    width: 8px;
    height: 8px;
    stroke: #fff;
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.upload-font-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.font-section {
  padding: 4px 0 0 0;
}

.font-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.font-card {
  position: relative;
  padding: 4px 8px;
  border: 1.5px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  overflow: hidden;

  &:hover {
    border-color: rgba(0,0,0,0.18);
  }

  &.active {
    border-color: #378ADD;
    background: #378ADD;
    color: #fff;
  }
}

.font-card-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-delete-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;

  .font-card:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #e74c3c;
  }
}

.font-card.active .font-delete-btn {
  color: rgba(255, 255, 255, 0.8);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
}

.font-actions {
  display: flex;
  gap: 6px;
}
</style>
