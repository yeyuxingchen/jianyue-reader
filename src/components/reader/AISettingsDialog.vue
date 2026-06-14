<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import type { AISettings, TTSVoice, TTSStyleCategory } from '@/types'
import { aiService } from '@/services/aiService'
import { useTTSStore, READING_STYLES, findStyleById } from '@/stores/tts'

const emit = defineEmits<{
  close: []
}>()

const ttsStore = useTTSStore()

const form = ref<AISettings>({
  api_key: '',
  base_url: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  tts_model: '',
})

// 朗读风格编辑模式（展开提示词编辑区）
const editingStyle = ref(false)

onMounted(() => {
  form.value = aiService.getSettings()
  ttsStore.loadSettings()
})

// 当前分类下的风格列表
const currentStyles = computed(() => {
  return READING_STYLES[ttsStore.settings.styleCategory]?.styles || []
})

// 当前选中的风格
const selectedStyle = computed(() => {
  if (ttsStore.settings.styleId === 'custom') return null
  return findStyleById(ttsStore.settings.styleId)
})

function handleSave() {
  aiService.saveSettings({ ...form.value })
  ttsStore.saveSettings()
  emit('close')
}

function handleCancel() {
  emit('close')
}

function selectStyle(category: TTSStyleCategory, styleId: string) {
  editingStyle.value = false
  ttsStore.selectStyle(category, styleId)
}

function switchCategory(cat: TTSStyleCategory) {
  ttsStore.switchCategory(cat)
}

function onCustomPromptBlur(e: FocusEvent) {
  const val = (e.target as HTMLTextAreaElement).value
  ttsStore.setCustomStylePrompt(val)
}
</script>

<template>
  <div class="ai-settings-overlay" @click="emit('close')">
    <div class="ai-settings-panel" @click.stop>
      <h3>AI 设置</h3>

      <div class="ai-settings-scroll custom-scrollbar-compact">
        <!-- ===== 上半部分：接口配置（2x2 网格） ===== -->
        <div class="ai-grid-2x2">
          <div class="ai-setting-row">
            <label>接口密钥 (API Key)</label>
            <input v-model="form.api_key" type="password" placeholder="sk-..." class="ai-input" />
          </div>
          <div class="ai-setting-row">
            <label>接口地址 (Base URL)</label>
            <input v-model="form.base_url" type="text" placeholder="https://api.openai.com/v1" class="ai-input" />
          </div>
          <div class="ai-setting-row">
            <label>模型名称 (Model) <span class="ai-hint">多个用英文逗号分隔</span></label>
            <input v-model="form.model" type="text" placeholder="gpt-4o,claude-3-5-sonnet" class="ai-input" />
          </div>
          <div class="ai-setting-row">
            <label>语音模型 (TTS Model) <span class="ai-hint">留空则禁用朗读</span></label>
            <input v-model="form.tts_model" type="text" placeholder="mimo-v2.5-tts" class="ai-input" />
          </div>
        </div>

        <!-- ===== 横向分隔线 ===== -->
        <div class="ai-h-divider"></div>

        <!-- ===== 中间：语音基础设置（两列） ===== -->
        <div class="ai-grid-2col">
          <div class="ai-setting-row">
            <label>默认音色</label>
            <select
              class="ai-select"
              :value="ttsStore.settings.voice"
              @change="ttsStore.setVoice(($event.target as HTMLSelectElement).value as TTSVoice)"
            >
              <option value="冰糖">冰糖（清澈甜美）</option>
              <option value="苏打">苏打（阳光活力）</option>
              <option value="茉莉">茉莉（温柔知性）</option>
              <option value="白桦">白桦（沉稳磁性）</option>
              <option value="Mia">Mia（Bright Female）</option>
              <option value="Chloe">Chloe（Warm Female）</option>
              <option value="Milo">Milo（Energetic Male）</option>
              <option value="Dean">Dean（Deep Male）</option>
              <option value="MimoDefault">MimoDefault</option>
              <option value="DefaultEn">DefaultEn</option>
              <option value="DefaultZh">DefaultZh</option>
            </select>
          </div>
          <div class="ai-setting-row">
            <label>预加载句数</label>
            <div class="ai-number-control">
              <button class="ai-num-btn" @click="ttsStore.setPrefetchSize(ttsStore.settings.prefetchSize - 1)">−</button>
              <span class="ai-num-value">{{ ttsStore.settings.prefetchSize }}</span>
              <button class="ai-num-btn" @click="ttsStore.setPrefetchSize(ttsStore.settings.prefetchSize + 1)">+</button>
              <span class="ai-hint" style="margin-left: 6px;">（1~5）</span>
            </div>
          </div>
        </div>

        <!-- ===== 朗读风格区域 ===== -->
        <div class="ai-reading-style-section">
          <!-- 区域标题 + 音色联动开关 -->
          <div class="style-section-header">
            <span class="style-section-title">朗读风格</span>
            <label class="style-voice-toggle">
              <input
                type="checkbox"
                :checked="ttsStore.settings.applyStyleVoice"
                @change="ttsStore.setApplyStyleVoice(($event.target as HTMLInputElement).checked)"
              />
              <span>风格切换时自动应用推荐音色</span>
            </label>
          </div>

          <!-- 分类标签页 -->
          <div class="style-tabs">
            <button
              v-for="(cat, key) in READING_STYLES"
              :key="key"
              class="style-tab"
              :class="{ active: ttsStore.settings.styleCategory === key }"
              @click="switchCategory(key as TTSStyleCategory)"
            >
              {{ cat.label }}
              <span class="style-tab-count">{{ cat.styles.length }}</span>
            </button>
          </div>

          <!-- 风格标签网格 -->
          <div class="style-tags">
            <button
              v-for="style in currentStyles"
              :key="style.id"
              class="style-tag"
              :class="{ active: ttsStore.settings.styleId === style.id }"
              :title="style.description"
              @click="selectStyle(ttsStore.settings.styleCategory, style.id)"
            >
              {{ style.name }}
            </button>
            <button
              class="style-tag style-tag-custom"
              :class="{ active: ttsStore.settings.styleId === 'custom' }"
              @click="selectStyle(ttsStore.settings.styleCategory, 'custom')"
            >
              自定义
            </button>
          </div>

          <!-- 选中风格预览 -->
          <div v-if="selectedStyle && !editingStyle" class="style-preview">
            <div class="style-preview-header">
              <span class="style-preview-name">{{ selectedStyle.name }}</span>
              <span class="style-preview-speed">{{ selectedStyle.speed }}</span>
            </div>
            <p class="style-preview-desc">{{ selectedStyle.description }}</p>
            <p class="style-preview-prompt">{{ selectedStyle.stylePrompt }}</p>
            <button class="style-edit-btn" @click="editingStyle = true">微调提示词</button>
          </div>

          <!-- 自定义模式 / 编辑模式：提示词编辑区 -->
          <div v-if="ttsStore.settings.styleId === 'custom' || editingStyle" class="style-custom-area">
            <label v-if="ttsStore.settings.styleId === 'custom'" class="style-custom-label">
              自定义朗读提示词
            </label>
            <label v-else class="style-custom-label">
              微调「{{ selectedStyle?.name }}」的提示词
            </label>
            <textarea
              class="ai-textarea"
              :value="ttsStore.settings.styleId === 'custom' ? ttsStore.settings.customStylePrompt : ttsStore.settings.stylePrompt"
              rows="3"
              placeholder="描述朗读的语调、情感、节奏……例如：用沉稳低沉的声音朗读武侠小说，战斗场面加快节奏，感情戏份细腻温柔。"
              @blur="onCustomPromptBlur($event)"
            ></textarea>
            <div v-if="editingStyle" class="style-custom-actions">
              <button class="style-revert-btn" @click="editingStyle = false; ttsStore.selectStyle(ttsStore.settings.styleCategory, ttsStore.settings.styleId)">
                恢复预设
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="ai-settings-footer">
        <button class="ai-btn cancel" @click="handleCancel">取消</button>
        <button class="ai-btn confirm" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-settings-panel {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px 24px;
  width: 640px;
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    color: var(--text-primary);
    flex-shrink: 0;
  }
}

.ai-settings-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;
}

/* ===== 2x2 网格 ===== */
.ai-grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

/* ===== 横向分隔线（参考原纵向分隔线样式） ===== */
.ai-h-divider {
  height: 1px;
  background: var(--border-color);
  margin: 16px 0;
}

/* ===== 两列布局 ===== */
.ai-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

/* ===== 通用行样式 ===== */
.ai-setting-row {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }
}

/* ===== 输入控件 ===== */
.ai-input,
.ai-select {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:focus {
    border-color: #378ADD;
  }
}

.ai-select {
  cursor: pointer;
}

.ai-number-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-num-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.15s;

  &:hover {
    background: var(--border-color);
  }
}

.ai-num-value {
  font-size: 13px;
  min-width: 20px;
  text-align: center;
  color: var(--text-primary);
}

.ai-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:focus {
    border-color: #378ADD;
  }
}

.ai-hint {
  font-weight: 400;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

/* ===== 朗读风格区域 ===== */
.ai-reading-style-section {
  margin-top: 4px;
}

.style-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.style-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.style-voice-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 13px;
    height: 13px;
    cursor: pointer;
    accent-color: #378ADD;
  }
}

/* ===== 分类标签页 ===== */
.style-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.style-tab {
  padding: 6px 16px;
  font-size: 12px;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    color: #378ADD;
    border-bottom-color: #378ADD;
  }
}

.style-tab-count {
  font-size: 10px;
  opacity: 0.6;
  background: var(--bg-tertiary);
  padding: 0 4px;
  border-radius: 6px;
  line-height: 16px;
}

/* ===== 风格标签 ===== */
.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.style-tag {
  padding: 3px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary);
    border-color: #378ADD;
    background: rgba(55, 138, 221, 0.08);
  }

  &.active {
    color: #fff;
    background: #378ADD;
    border-color: #378ADD;
  }
}

.style-tag-custom {
  border-style: dashed;

  &.active {
    border-style: solid;
  }
}

/* ===== 风格预览卡片 ===== */
.style-preview {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.style-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.style-preview-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.style-preview-speed {
  font-size: 11px;
  color: #378ADD;
  background: rgba(55, 138, 221, 0.1);
  padding: 1px 8px;
  border-radius: 8px;
}

.style-preview-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 6px;
  line-height: 1.4;
}

.style-preview-prompt {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.style-edit-btn {
  font-size: 11px;
  color: #378ADD;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0 0;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.7;
  }
}

/* ===== 自定义/编辑提示词区域 ===== */
.style-custom-area {
  margin-top: 4px;
}

.style-custom-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.style-custom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.style-revert-btn {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
  }
}

/* ===== 底部按钮 ===== */
.ai-settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  flex-shrink: 0;
}

.ai-btn {
  padding: 4px 12px;
  border-radius: 4px;
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
