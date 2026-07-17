<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useSystemFonts } from '@/composables/useSystemFonts'

const props = defineProps<{
  visible: boolean
  currentFont: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [fontName: string]
}>()

const { fonts, loading, load } = useSystemFonts()
const selectedFont = ref('')

// 弹窗打开时初始化选中状态并按需加载字体列表
watch(() => props.visible, (open) => {
  if (open) {
    selectedFont.value = props.currentFont
    if (fonts.value.length === 0) {
      load()
    }
  }
})

function selectFont(name: string) {
  selectedFont.value = name
}

function close() {
  emit('update:visible', false)
}

function confirm() {
  if (selectedFont.value) {
    emit('confirm', selectedFont.value)
  }
  close()
}
</script>

<template>
  <div v-if="visible" class="settings-overlay" @click="close">
    <div class="system-font-dialog" @click.stop>
      <h3>设置默认字体</h3>
      <div class="system-font-content">
        <div v-if="loading" class="system-font-loading">
          加载中...
        </div>
        <div v-else class="system-font-list custom-scrollbar">
          <div
            v-for="font in fonts"
            :key="font"
            class="system-font-item"
            :class="{ active: selectedFont === font }"
            @click="selectFont(font)"
          >
            <span class="system-font-preview" :style="{ fontFamily: font }">{{ font }}</span>
            <span v-if="selectedFont === font" class="system-font-check">✓</span>
          </div>
        </div>
      </div>
      <div class="system-font-actions">
        <button class="system-font-btn cancel" @click="close">取消</button>
        <button class="system-font-btn confirm" @click="confirm">确定</button>
      </div>
    </div>
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

.system-font-dialog {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 380px;
  max-width: 450px;
  max-height: 70vh;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;

  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    color: var(--text-primary);
  }
}

.system-font-content {
  flex: 1;
  min-height: 0;
  margin-bottom: 16px;
}

.system-font-loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.system-font-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.system-font-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-tertiary);
  }

  &.active {
    background: rgba(55, 138, 221, 0.1);
  }
}

.system-font-preview {
  font-size: 14px;
  color: var(--text-primary);
}

.system-font-check {
  color: #378ADD;
  font-weight: bold;
}

.system-font-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.system-font-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &.cancel {
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-primary);

    &:hover {
      background: var(--bg-secondary);
    }
  }

  &.confirm {
    border: none;
    background: #378ADD;
    color: #fff;

    &:hover {
      background: #2a7bc8;
    }
  }
}
</style>
