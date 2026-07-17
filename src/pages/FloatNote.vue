<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, nextTick, defineComponent, h } from 'vue'
import { Milkdown as MilkdownComponent, MilkdownProvider, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { getMarkdown } from '@milkdown/kit/utils'
import type { Editor as EditorType } from '@milkdown/kit/core'
import { Code, Monitor, Pin } from 'lucide-vue-next'

// ===== 状态 =====
const fileName = ref('未命名')
const opacity = ref(0.85)
const sourceMode = ref(false)
const sourceContent = ref('')
const charCount = ref(0)
const syncing = ref(false)
const isPinned = ref(true)

const editorRef = ref<EditorType | null>(null)
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null
const AUTO_SYNC_DELAY = 800

async function togglePin() {
  try {
    if (window.electronAPI?.floatNote) {
      isPinned.value = await window.electronAPI.floatNote.togglePin()
    }
  } catch {}
}

// ===== 获取/设置 Markdown =====
function getMarkdownContent(): string {
  const editor = editorRef.value
  if (!editor) return ''
  try { return editor.action(getMarkdown()) } catch { return '' }
}

async function replaceContent(md: string) {
  const editor = editorRef.value
  if (!editor) return
  try {
    const { replaceAll } = await import('@milkdown/kit/utils')
    editor.action(replaceAll(md))
  } catch (err) {
    console.error('替换内容失败:', err)
  }
}

// ===== 模式切换 =====
async function toggleSourceMode() {
  if (sourceMode.value) {
    await replaceContent(sourceContent.value)
    sourceMode.value = false
  } else {
    sourceContent.value = getMarkdownContent()
    sourceMode.value = true
    await nextTick()
    sourceTextareaRef.value?.focus()
  }
}

function updateCharCount() {
  charCount.value = sourceMode.value
    ? sourceContent.value.length
    : getMarkdownContent().length
}

// ===== 自动同步（防抖）=====
function syncToMain() {
  const content = sourceMode.value ? sourceContent.value : getMarkdownContent()
  try {
    if (window.electronAPI?.floatNote) {
      syncing.value = true
      window.electronAPI.floatNote.syncContent(content)
      setTimeout(() => { syncing.value = false }, 500)
    }
  } catch {}
}

function scheduleAutoSync() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer)
  autoSyncTimer = setTimeout(syncToMain, AUTO_SYNC_DELAY)
}

function onSourceInput() {
  updateCharCount()
  scheduleAutoSync()
}

// ===== 窗口操作 =====
function backToMain() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer)
  const content = sourceMode.value ? sourceContent.value : getMarkdownContent()
  try {
    if (window.electronAPI?.floatNote) {
      window.electronAPI.floatNote.syncContent(content)
      // returnToMain = true: 关闭悬浮窗，返回主窗口
      window.electronAPI.floatNote.close(true)
    }
  } catch {}
}

function closeWindow() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer)
  try {
    if (window.electronAPI?.floatNote) {
      // returnToMain = false: 关闭悬浮窗，同时退出应用
      window.electronAPI.floatNote.close(false)
    }
  } catch {}
}

function onOpacityInput(e: Event) {
  opacity.value = Number((e.target as HTMLInputElement).value) / 100
}

// ===== Milkdown 编辑器组件 =====
let initialContent = ''

const MilkdownEditor = defineComponent({
  name: 'FloatNoteMilkdown',
  setup() {
    const { get } = useEditor(root =>
      Editor.make()
        .config(ctx => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, initialContent || '# 镜像笔记\n\n')
          ctx.set(editorViewOptionsCtx, {
            attributes: { class: 'float-milkdown-body', spellcheck: 'false' },
          })
          ctx.get(listenerCtx)
            .markdownUpdated((_ctx, markdown) => {
              charCount.value = markdown.length
              scheduleAutoSync()
            })
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(listener)
    )

    const checkEditor = setInterval(() => {
      const editor = get()
      if (editor) {
        editorRef.value = editor
        clearInterval(checkEditor)
      }
    }, 100)

    onBeforeUnmount(() => clearInterval(checkEditor))

    return () => h(MilkdownComponent)
  },
})

// ===== 暴露给主进程注入数据 =====
onMounted(() => {
  // 暴露注入接口，主进程通过 executeJavaScript 调用（兼容旧版）
  ;(window as any).setFloatNoteContent = (data: { text: string; fileName: string; opacity: number }) => {
    if (!data) return
    initialContent = data.text || ''
    fileName.value = data.fileName || '未命名'
    if (typeof data.opacity === 'number') opacity.value = data.opacity

    const applyContent = () => {
      if (editorRef.value) {
        replaceContent(initialContent)
        updateCharCount()
        return true
      }
      return false
    }
    if (!applyContent()) {
      const t = setInterval(() => {
        if (applyContent()) clearInterval(t)
      }, 100)
      setTimeout(() => clearInterval(t), 5000)
    }
  }

  ;(window as any).getFloatNoteContent = () => {
    return sourceMode.value ? sourceContent.value : getMarkdownContent()
  }

  // 监听主进程通过 IPC 发送的数据
  if (window.electronAPI?.on) {
    window.electronAPI.on('float:note:data', (data: any) => {
      if (!data) return
      initialContent = data.text || ''
      fileName.value = data.fileName || '未命名'
      if (typeof data.opacity === 'number') opacity.value = data.opacity

      const applyContent = () => {
        if (editorRef.value) {
          replaceContent(initialContent)
          updateCharCount()
          return true
        }
        return false
      }
      if (!applyContent()) {
        const t = setInterval(() => {
          if (applyContent()) clearInterval(t)
        }, 100)
        setTimeout(() => clearInterval(t), 5000)
      }
    })
  }

  if (window.electronAPI?.send) {
    window.electronAPI.send('float:note:ready')
  }

  // Ctrl+S 返回主窗口
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      backToMain()
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
})
</script>

<template>
  <div class="float-note" :style="{ opacity }">
    <!-- 顶部标题栏（可拖动）-->
    <div class="float-header">
      <span class="float-title">简记 · {{ fileName }}</span>
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
        <button class="float-btn" @click="backToMain" title="返回主窗口">↩</button>
        <button class="float-btn" :class="{ 'float-pin-active': isPinned }" @click="togglePin" title="置顶/取消置顶">
          <Pin :size="12" :stroke-width="2" />
        </button>
        <button class="float-btn float-close-btn" @click="closeWindow" title="关闭">✕</button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="float-content">
      <!-- Milkdown 渲染（非源码模式）-->
      <div v-show="!sourceMode" class="float-milkdown-wrap custom-scrollbar-dark">
        <MilkdownProvider>
          <MilkdownEditor />
        </MilkdownProvider>
      </div>
      <!-- 源码编辑 -->
      <textarea
        v-show="sourceMode"
        ref="sourceTextareaRef"
        v-model="sourceContent"
        class="float-source custom-scrollbar-dark"
        spellcheck="false"
        @input="onSourceInput"
      ></textarea>
    </div>

    <!-- 底栏 -->
    <div class="float-footer">
      <button
        class="float-mode-btn"
        :class="{ active: !sourceMode }"
        @click="toggleSourceMode"
      >
        <Monitor :size="12" :stroke-width="1.8" /> 渲染
      </button>
      <button
        class="float-mode-btn"
        :class="{ active: sourceMode }"
        @click="toggleSourceMode"
      >
        <Code :size="12" :stroke-width="1.8" /> 源码
      </button>
      <span class="float-footer-right">
        <span class="float-sync-hint" :class="{ syncing }">自动同步</span>
        <span class="float-char-count">{{ charCount }} 字符</span>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
/* Milkdown body 样式（不能 scoped） */
.float-milkdown-body {
  outline: none;
  min-height: 100%;
  padding: 16px 20px;
  font-size: 14px;
  line-height: 1.8;
}
.float-milkdown-body .ProseMirror { outline: none; min-height: 300px; }
.float-milkdown-body h1 { font-size: 1.8em; font-weight: 700; margin: 0.7em 0 0.4em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
.float-milkdown-body h2 { font-size: 1.4em; font-weight: 600; margin: 0.7em 0 0.35em; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.2em; }
.float-milkdown-body h3 { font-size: 1.2em; font-weight: 600; margin: 0.6em 0 0.3em; }
.float-milkdown-body p { margin: 0.5em 0; }
.float-milkdown-body blockquote { border-left: 3px solid rgba(100,180,255,0.5); padding: 0.4em 1em; margin: 0.5em 0; background: rgba(255,255,255,0.04); border-radius: 0 4px 4px 0; color: rgba(255,255,255,0.65); }
.float-milkdown-body pre { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px 14px; margin: 0.5em 0; overflow-x: auto; font-size: 0.9em; }
.float-milkdown-body code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 3px; font-size: 0.9em; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; }
.float-milkdown-body pre code { background: none; padding: 0; }
.float-milkdown-body ul, .float-milkdown-body ol { padding-left: 1.8em; margin: 0.4em 0; }
.float-milkdown-body table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.float-milkdown-body th, .float-milkdown-body td { border: 1px solid rgba(255,255,255,0.1); padding: 6px 10px; }
.float-milkdown-body th { background: rgba(255,255,255,0.06); }
.float-milkdown-body hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.2em 0; }
.float-milkdown-body a { color: #6ab4ff; text-decoration: none; }
.float-milkdown-body img { max-width: 100%; border-radius: 4px; }
</style>

<style lang="scss" scoped>
.float-note {
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

.float-close-btn:hover {
  background: #e74c3c !important;
}

.float-pin-active {
  background: rgba(100, 180, 255, 0.25) !important;
  color: #6ab4ff !important;
}

.float-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.float-milkdown-wrap {
  position: absolute;
  inset: 0;
  overflow-y: auto;
}

.float-source {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 16px 20px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.8;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  tab-size: 2;
  user-select: text;
  overflow-y: auto;

  &::placeholder { color: rgba(255,255,255,0.25); }
}

.float-footer {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  gap: 4px;
}

.float-mode-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;
  transition: all 0.12s;
  white-space: nowrap;

  &:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
  &.active { background: rgba(100,180,255,0.2); color: #6ab4ff; }
}

.float-footer-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.float-sync-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  transition: color 0.3s;

  &.syncing { color: rgba(100, 180, 255, 0.6); }
}

.float-char-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
