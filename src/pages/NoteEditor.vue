<script lang="ts" setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, defineComponent, h } from 'vue'
import { Milkdown as MilkdownComponent, MilkdownProvider, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { getMarkdown } from '@milkdown/kit/utils'
import type { Editor as EditorType } from '@milkdown/kit/core'
import { useNoteEditorStore } from '@/stores/appMode'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { useNoteSidebarStore } from '@/stores/noteSidebar'
import NoteSidebar from '@/components/note/NoteSidebar.vue'
import UnsavedChangesDialog from '@/components/common/UnsavedChangesDialog.vue'
import { Code, Monitor } from 'lucide-vue-next'

const noteStore = useNoteEditorStore()
const settings = useSettingsStore()
const toast = useToastStore()
const sidebar = useNoteSidebarStore()

const editorRef = ref<EditorType | null>(null)
const sourceContent = ref('')
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)
let isSaving = false

// ===== 启动时恢复草稿 =====
// 必须在 MilkdownEditor 组件挂载前执行，因为 defaultValueCtx 在 setup 时读取
const draft = noteStore.loadDraft()
if (draft) {
  // 防御性检查，确保 draft 对象有效
  if (typeof draft === 'object' && draft !== null) {
    try {
      // 使用条件赋值，避免在 null 值上设置属性
      if (draft.filePath !== undefined) noteStore.currentFilePath = draft.filePath
      if (draft.fileName !== undefined) noteStore.currentFileName = draft.fileName
      if (draft.content !== undefined) noteStore.lastSavedContent = draft.content
      if (draft.sourceMode !== undefined) noteStore.sourceMode = draft.sourceMode
      if (draft.sourceContent) {
        sourceContent.value = draft.sourceContent
      }
    } catch (err) {
      console.error('恢复草稿状态失败:', err)
    }
  }
  // 保留 filePath 状态（但不设置 isModified，因为这是恢复的状态）
}

// ===== 草稿自动保存（防抖） =====
let draftTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSaveDraft() {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    saveCurrentDraft()
  }, 1000)
}

function saveCurrentDraft() {
  try {
    const content = noteStore.sourceMode ? sourceContent.value : editorRef.value?.action(getMarkdown()) || ''
    noteStore.saveDraft(content, sourceContent.value)
  } catch (err) {
    console.error('自动保存草稿失败:', err)
  }
}

function handleBeforeUnload() {
  saveCurrentDraft()
}

// 清除草稿（当文件正常保存到磁盘后调用）
function clearDraftAfterSave() {
  noteStore.clearDraft()
}

// ===== 未保存更改对话框 =====
const unsavedDialog = reactive({
  visible: false,
  message: '',
  messagePrefix: '',
  _resolve: null as ((result: 'save' | 'discard' | 'cancel') => void) | null,
})

function showUnsavedDialog(messagePrefix = ''): Promise<'save' | 'discard' | 'cancel'> {
  return new Promise((resolve) => {
    unsavedDialog.messagePrefix = messagePrefix
    unsavedDialog.message = messagePrefix ? `${messagePrefix}尚未保存，是否先保存？` : '当前修改尚未保存，是否先保存？'
    unsavedDialog.visible = true
    unsavedDialog._resolve = resolve
  })
}

function onUnsavedSave() {
  unsavedDialog.visible = false
  unsavedDialog._resolve?.('save')
  unsavedDialog._resolve = null
}

function onUnsavedDiscard() {
  unsavedDialog.visible = false
  unsavedDialog._resolve?.('discard')
  unsavedDialog._resolve = null
}

function onUnsavedCancel() {
  unsavedDialog.visible = false
  unsavedDialog._resolve?.('cancel')
  unsavedDialog._resolve = null
}

// ===== 源码模式切换 =====
async function toggleSourceMode() {
  if (noteStore.sourceMode) {
    // 退出源码模式 → 恢复 Milkdown 渲染
    // 先把 textarea 内容同步回 Milkdown
    await replaceContent(sourceContent.value)
    noteStore.sourceMode = false
    // 更新大纲
    sidebar.parseOutline(sourceContent.value)
  } else {
    // 进入源码模式 → 从 Milkdown 取出原始 Markdown
    sourceContent.value = getMarkdownContent()
    noteStore.sourceMode = true
    await nextTick()
    sourceTextareaRef.value?.focus()
  }
}

// 源码模式下内容变化时，标记已修改并更新大纲
function onSourceInput() {
  if (sourceContent.value !== noteStore.lastSavedContent) {
    noteStore.markModified()
  } else {
    noteStore.markSaved()
  }
  sidebar.parseOutline(sourceContent.value)
  // 触发草稿自动保存
  scheduleSaveDraft()
}

// ===== 镜像笔记 =====
let unsubFloatNote: (() => void) | null = null

async function handleMirrorNote() {
  const content = noteStore.sourceMode ? sourceContent.value : getMarkdownContent()
  // 即使内容为空也允许打开，用户可以继续编辑
  const result = await window.services.createFloatNote(content, noteStore.currentFileName, 0.85)
  if (result) {
    // 监听浮窗内容同步
    if (unsubFloatNote) unsubFloatNote()
    unsubFloatNote = window.services.onFloatNoteContentUpdate((newContent: string) => {
      syncFromFloatNote(newContent)
    })
  }
}

// 从浮窗同步内容回主编辑器
async function syncFromFloatNote(content: string) {
  if (noteStore.sourceMode) {
    sourceContent.value = content
    sidebar.parseOutline(content)
    if (content !== noteStore.lastSavedContent) {
      noteStore.markModified()
    } else {
      noteStore.markSaved()
    }
  } else {
    await replaceContent(content)
    sidebar.parseOutline(content)
  }
}

// Milkdown 编辑器包装组件
const MilkdownEditor = defineComponent({
  name: 'MilkdownEditor',
  setup() {
    const { get } = useEditor(root =>
      Editor.make()
        .config(ctx => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, noteStore.lastSavedContent || '# 欢迎使用简记\n\n开始记录你的想法...\n')
          ctx.set(editorViewOptionsCtx, {
            attributes: { class: 'milkdown-editor-body' },
          })
          ctx.get(listenerCtx)
            .markdownUpdated((_ctx, markdown) => {
              if (markdown !== noteStore.lastSavedContent) {
                noteStore.markModified()
              } else {
                noteStore.markSaved()
              }
              // 实时更新文档大纲
              sidebar.parseOutline(markdown)
              // 触发草稿自动保存
              scheduleSaveDraft()
            })
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(listener)
        .use(trailing)
    )

    // 编辑器创建后获取实例
    const checkEditor = setInterval(() => {
      const editor = get()
      if (editor) {
        editorRef.value = editor
        noteStore.setEditorInstance(editor)
        clearInterval(checkEditor)
        // 编辑器就绪后解析初始内容大纲
        nextTick(() => {
          const md = getMarkdownContent()
          if (md) sidebar.parseOutline(md)
        })
      }
    }, 100)

    onBeforeUnmount(() => {
      clearInterval(checkEditor)
    })

    return () => h(MilkdownComponent)
  },
})

// 获取当前 Markdown 内容
function getMarkdownContent(): string {
  const editor = editorRef.value
  if (!editor) return ''
  try {
    return editor.action(getMarkdown())
  } catch {
    return ''
  }
}

// 替换编辑器内容
async function replaceContent(markdown: string) {
  const editor = editorRef.value
  if (!editor) return
  try {
    const { replaceAll } = await import('@milkdown/kit/utils')
    editor.action(replaceAll(markdown))
  } catch (err) {
    console.error('替换内容失败:', err)
  }
}

// ===== 文件操作 =====
async function handleNewFile() {
  if (noteStore.isModified) {
    const result = await showUnsavedDialog()
    if (result === 'cancel') return
    if (result === 'save') {
      if (noteStore.currentFilePath) {
        await handleSaveFile()
      } else {
        await handleSaveAsFile()
      }
    }
    // 'discard' → 继续执行新建
  }
  noteStore.newFile()
  await nextTick()
  await replaceContent('# 未命名\n\n')
  toast.show('新建文件')
}

async function handleOpenFile() {
  try {
    const filePaths = await window.services.showNoteFilePicker()
    if (!filePaths || filePaths.length === 0) return

    const filePath = filePaths[0]
    const content = await window.services.readFileAsText(filePath)
    const fileName = await window.services.getFileName(filePath)

    noteStore.openFile(filePath, fileName, content)
    await nextTick()
    await replaceContent(content)
    toast.show(`已打开: ${fileName}`)
    // 记录历史
    sidebar.addToHistory(filePath, fileName, content)
    // 解析大纲
    sidebar.parseOutline(content)
  } catch (err) {
    console.error('打开文件失败:', err)
    toast.show('打开文件失败')
  }
}

async function handleSaveFile() {
  if (isSaving) return
  isSaving = true
  try {
    const content = noteStore.sourceMode ? sourceContent.value : getMarkdownContent()
    if (!content && content !== '') return

    if (noteStore.currentFilePath) {
      try {
        // 已有文件路径，直接覆盖保存
        const savedPath = await window.services.writeToFile(noteStore.currentFilePath, content)
        if (savedPath) {
          noteStore.markSaved()
          noteStore.lastSavedContent = content
          toast.show('已保存')
          // 更新历史记录
          sidebar.addToHistory(noteStore.currentFilePath, noteStore.currentFileName, content)
          // 清除草稿（已正常保存到磁盘）
          clearDraftAfterSave()
        }
      } catch (err) {
        console.error('保存失败:', err)
        toast.show('保存失败')
      }
    } else {
      // 没有文件路径，需要先另存为；临时释放 isSaving 锁避免死锁
      isSaving = false
      await handleSaveAsFile()
    }
  } finally {
    isSaving = false
  }
}

async function handleSaveAsFile() {
  if (isSaving) return
  isSaving = true
  try {
    const content = noteStore.sourceMode ? sourceContent.value : getMarkdownContent()
    if (!content && content !== '') return

    // 弹出保存对话框（文件名输入框，默认"简记-XX.md"）
    const result = await window.electronAPI?.dialog.showNoteSaveDialog(content)
    if (result) {
      noteStore.openFile(result.filePath, result.fileName, content)
      noteStore.markSaved()
      noteStore.lastSavedContent = content
      toast.show(`已保存: ${result.fileName}`)
      sidebar.addToHistory(result.filePath, result.fileName, content)
      sidebar.parseOutline(content)
      // 清除草稿（已正常保存到磁盘）
      clearDraftAfterSave()
    }
  } catch (err) {
    console.error('另存为失败:', err)
    toast.show('另存为失败')
  } finally {
    isSaving = false
  }
}

// 等待编辑器实例就绪
function waitForEditor(timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (editorRef.value) return resolve(true)
    const start = Date.now()
    const t = setInterval(() => {
      if (editorRef.value) {
        clearInterval(t)
        resolve(true)
      } else if (Date.now() - start > timeout) {
        clearInterval(t)
        resolve(false)
      }
    }, 50)
  })
}

// 接收外部内容（从阅读器发送备注），以临时/未保存形式展示
async function receiveContent(content: string, bookTitle: string) {
  if (noteStore.isModified) {
    const result = await showUnsavedDialog()
    if (result === 'cancel') return
    if (result === 'save') {
      if (noteStore.currentFilePath) {
        await handleSaveFile()
      } else {
        await handleSaveAsFile()
      }
    }
    // 'discard' → 继续执行
  }

  // 新建文件并填入内容（不触发保存，以临时形式展示）
  noteStore.newFile()
  noteStore.currentFileName = bookTitle || '简记'
  noteStore.markModified()
  await nextTick()

  // 等待 Milkdown 编辑器实例就绪（组件挂载后有初始化延迟）
  const ready = await waitForEditor()
  if (ready) {
    await replaceContent(content)
    sidebar.parseOutline(content)
    toast.show('已从阅读器导入备注，Ctrl+S 保存')
  } else {
    toast.show('编辑器加载超时，请重试')
  }
}

// 从外部路径打开文件（"打开方式"触发）
async function openFileFromExternal(filePath: string) {
  if (noteStore.isModified) {
    const result = await showUnsavedDialog()
    if (result === 'cancel') return
    if (result === 'save') {
      if (noteStore.currentFilePath) {
        await handleSaveFile()
      } else {
        await handleSaveAsFile()
      }
    }
  }

  try {
    const content = await window.services.readFileAsText(filePath)
    const fileName = await window.services.getFileName(filePath)

    noteStore.openFile(filePath, fileName, content)
    sidebar.parseOutline(content)
    sidebar.addToHistory(filePath, fileName, content)

    // 等待 Milkdown 编辑器实例就绪
    const ready = await waitForEditor()
    if (ready) {
      await replaceContent(content)
    }

    toast.show(`已打开: ${fileName}`)
  } catch (err) {
    console.error('外部打开文件失败:', err)
    toast.show('打开文件失败')
  }
}

// 暴露方法给外部调用
defineExpose({
  handleNewFile,
  handleOpenFile,
  handleSaveFile,
  handleSaveAsFile,
  getMarkdownContent,
  replaceContent,
  receiveContent,
  openFileFromExternal,
})

// ===== 侧边栏交互 =====
// 从历史记录打开文件
async function handleOpenFromHistory(filePath: string) {
  try {
    const content = await window.services.readFileAsText(filePath)
    const fileName = await window.services.getFileName(filePath)
    if (noteStore.isModified) {
      const result = await showUnsavedDialog('文件')
      if (result === 'cancel') return
      if (result === 'save') {
        if (noteStore.currentFilePath) {
          await handleSaveFile()
        } else {
          await handleSaveAsFile()
        }
      }
      // 'discard' → 继续执行打开
    }
    noteStore.openFile(filePath, fileName, content)
    await nextTick()
    await replaceContent(content)
    toast.show(`已打开: ${fileName}`)
    sidebar.addToHistory(filePath, fileName, content)
    sidebar.parseOutline(content)
  } catch (err) {
    console.error('打开历史文件失败:', err)
    toast.show('文件不存在或无法打开')
    sidebar.removeFromHistory(filePath)
  }
}

// 滚动到指定行（文档大纲跳转）
function handleScrollToLine(line: number) {
  try {
    const editorEl = document.querySelector('.milkdown-editor-body')
    if (!editorEl) return
    const headings = editorEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const targetItem = sidebar.outline.find(item => item.line === line)
    if (targetItem) {
      for (const h of headings) {
        const text = (h as HTMLElement).textContent?.trim() || ''
        if (text === targetItem.text) {
          (h as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
    }
  } catch (err) {
    console.error('滚动到行失败:', err)
  }
}

// 监听快捷键
function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault()
    handleNewFile()
  } else if (e.ctrlKey && e.key === 'o') {
    e.preventDefault()
    handleOpenFile()
  } else if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    if (e.repeat) return  // 忽略长按连按
    if (e.shiftKey) {
      handleSaveAsFile()
    } else {
      handleSaveFile()
    }
  }
}

// ===== 图片粘贴处理 =====
function getImageFormat(): string {
  return window.electronAPI?.store.get('note:imageFormat') || 'base64'
}

async function handlePaste(e: ClipboardEvent) {
  // 仅在路径缓存模式下拦截图片粘贴
  if (getImageFormat() !== 'path') return

  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      e.stopPropagation()

      const file = item.getAsFile()
      if (!file) return

      // 将文件转为 base64 data URL
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64DataUrl = ev.target?.result as string
        if (!base64DataUrl) return

        // 保存到缓存目录
        const result = await window.services.saveImageToCache(base64DataUrl)
        if (result) {
          // 使用 cacheimg:// 自定义协议加载图片（兼容开发/生产模式）
          const mdImage = `![image](cacheimg://${result.relativePath})`

          // 在编辑器中插入图片
          if (noteStore.sourceMode && sourceTextareaRef.value) {
            const ta = sourceTextareaRef.value
            const start = ta.selectionStart
            const end = ta.selectionEnd
            sourceContent.value = sourceContent.value.substring(0, start) + mdImage + sourceContent.value.substring(end)
            ta.selectionStart = ta.selectionEnd = start + mdImage.length
            onSourceInput()
          } else if (editorRef.value) {
            // Milkdown：获取当前 Markdown，追加图片语法后用 replaceAll 重新解析渲染
            const currentMd = getMarkdownContent()
            const newMd = currentMd
              ? currentMd.trimEnd() + '\n\n' + mdImage + '\n'
              : mdImage + '\n'
            await replaceContent(newMd)
            sidebar.parseOutline(newMd)
          } else {
            document.execCommand('insertText', false, mdImage)
          }

          toast.show('图片已缓存到本地')
        }
      }
      reader.readAsDataURL(file)
      return // 只处理第一张图片
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('paste', handlePaste)
  window.addEventListener('beforeunload', handleBeforeUnload)
  // 加载历史记录
  sidebar.loadHistory()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('paste', handlePaste)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  // 退出时保存草稿
  saveCurrentDraft()
  if (draftTimer) {
    clearTimeout(draftTimer)
    draftTimer = null
  }
  if (unsubFloatNote) {
    unsubFloatNote()
    unsubFloatNote = null
  }
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
})
</script>

<template>
  <div class="note-editor" :class="'theme-' + settings.settings.theme">
    <!-- 左侧 VSCode 风格侧边栏 -->
    <NoteSidebar
      @open-file="handleOpenFromHistory"
      @scroll-to-line="handleScrollToLine"
    />
    <div class="note-main">
      <!-- Milkdown 编辑器（源码模式时隐藏） -->
      <div v-show="!noteStore.sourceMode" class="note-editor-container custom-scrollbar">
        <MilkdownProvider>
          <MilkdownEditor />
        </MilkdownProvider>
      </div>

      <!-- 源码模式 textarea（非源码模式时隐藏） -->
      <textarea
        v-show="noteStore.sourceMode"
        ref="sourceTextareaRef"
        v-model="sourceContent"
        class="source-textarea custom-scrollbar"
        spellcheck="false"
        @input="onSourceInput"
      ></textarea>

      <!-- 底部状态栏 -->
      <div class="note-status-bar">
        <!-- 源码模式切换按钮 -->
        <button
          class="source-mode-btn"
          :class="{ active: noteStore.sourceMode }"
          @click="toggleSourceMode"
          title="源码模式"
        >
          <Code :size="13" :stroke-width="1.8" />
        </button>
        <!-- 镜像笔记按钮 -->
        <button
          class="source-mode-btn"
          @click="handleMirrorNote"
          title="镜像笔记"
        >
          <Monitor :size="13" :stroke-width="1.8" />
        </button>
        <span class="status-item">{{ noteStore.currentFileName }}</span>
        <span v-if="noteStore.isModified" class="status-modified">已修改</span>
        <span class="status-spacer"></span>
        <span class="status-item">Markdown</span>
        <span class="status-item">UTF-8</span>
      </div>
    </div>

    <!-- 未保存更改对话框 -->
    <UnsavedChangesDialog
      v-if="unsavedDialog.visible"
      :message="unsavedDialog.message"
      @save="onUnsavedSave"
      @discard="onUnsavedDiscard"
      @cancel="onUnsavedCancel"
    />
  </div>
</template>

<style lang="scss">
/* Milkdown 编辑器全局样式（不能 scoped） */

.milkdown-editor-body {
  outline: none;
  min-height: calc(100vh - 32px - 24px);
  padding: 32px 48px;
}

.milkdown {
  outline: none;
}

.milkdown .ProseMirror {
  outline: none;
  min-height: 400px;
}

/* 标题样式 */
.milkdown h1 { font-size: 2em; font-weight: 700; margin: 0.8em 0 0.4em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
.milkdown h2 { font-size: 1.5em; font-weight: 600; margin: 0.8em 0 0.4em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.2em; }
.milkdown h3 { font-size: 1.25em; font-weight: 600; margin: 0.6em 0 0.3em; }
.milkdown h4 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.3em; }
.milkdown h5, .milkdown h6 { font-size: 1em; font-weight: 600; margin: 0.5em 0 0.3em; }

/* 段落 */
.milkdown p { margin: 0.5em 0; line-height: 1.75; }

/* 引用块 */
.milkdown blockquote {
  border-left: 4px solid var(--accent-color);
  padding: 0.5em 1em;
  margin: 0.5em 0;
  background: var(--bg-tertiary);
  border-radius: 0 4px 4px 0;
  color: var(--text-secondary);
}

/* 代码块 */
.milkdown pre {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px 16px;
  margin: 0.5em 0;
  overflow-x: auto;
  font-size: 0.9em;
}

.milkdown code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.milkdown pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}

/* 列表 */
.milkdown ul, .milkdown ol { padding-left: 2em; margin: 0.5em 0; }
.milkdown li { margin: 0.2em 0; line-height: 1.75; }

/* 任务列表 */
.milkdown input[type="checkbox"] {
  margin-right: 6px;
  accent-color: var(--accent-color);
}

/* 表格 */
.milkdown table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

.milkdown th, .milkdown td {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}

.milkdown th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

/* 水平线 */
.milkdown hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 1.5em 0;
}

/* 链接 */
.milkdown a {
  color: var(--accent-color);
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

/* 图片 */
.milkdown img {
  max-width: 100%;
  border-radius: 4px;
}

/* 删除线 */
.milkdown s, .milkdown del {
  text-decoration: line-through;
  color: var(--text-secondary);
}

/* 选区高亮 */
.milkdown .ProseMirror-selectednode {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 2px;
}

/* 占位符 */
.milkdown .ProseMirror p.is-editor-empty:first-child::before {
  content: '开始输入...';
  color: var(--text-tertiary);
  float: left;
  pointer-events: none;
  height: 0;
}
</style>

<style lang="scss" scoped>
.note-editor {
  height: 100%;
  display: flex;
  flex-direction: row;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.note-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.note-editor-container {
  flex: 1;
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.75;
  font-family: system-ui, -apple-system, sans-serif;
}

.source-textarea {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 32px 48px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.7;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  tab-size: 2;
}

.note-status-bar {
  display: flex;
  align-items: center;
  padding: 2px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 11px;
  color: var(--text-secondary);
  gap: 12px;
  flex-shrink: 0;
  height: 24px;
}

.source-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-color);
    color: #fff;
  }
}

.status-spacer {
  flex: 1;
}

.status-item {
  white-space: nowrap;
}

.status-modified {
  color: var(--accent-color);
  font-weight: 500;
}
</style>
