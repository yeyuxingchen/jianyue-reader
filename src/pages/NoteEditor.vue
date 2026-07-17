<script lang="ts" setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, defineComponent, h, computed, watch } from 'vue'
import { Milkdown as MilkdownComponent, MilkdownProvider, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx, editorViewCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { prism, prismConfig } from '@milkdown/plugin-prism'
import { getMarkdown } from '@milkdown/kit/utils'
// 注册代码块语法高亮语言（副作用导入）
import '@/editor/codeHighlight'
import { CODE_LANGS } from '@/editor/codeLanguages'
import type { Editor as EditorType } from '@milkdown/kit/core'
import { useNoteEditorStore } from '@/stores/appMode'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import { useNoteSidebarStore } from '@/stores/noteSidebar'
import {
  expandChapterImageSrcs,
  collapseChapterImageSrcs,
  rebuildChapterImageMap,
  getChapterDir,
  insertImageForCurrentFile,
  clearChapterImages,
  ensureChapterRegistered,
  currentChapterId,
} from '@/composables/useNoteImage'
import NoteSidebar from '@/components/note/NoteSidebar.vue'
import NoteToolbar from '@/components/note/NoteToolbar.vue'
import UnsavedChangesDialog from '@/components/common/UnsavedChangesDialog.vue'
import { Code, Monitor, RotateCcw } from 'lucide-vue-next'

const noteStore = useNoteEditorStore()
const settings = useSettingsStore()
const toast = useToastStore()
const sidebar = useNoteSidebarStore()

/**
 * 规范化 markdown 内容用于"是否修改"判定。
 * 目的：消除 milkdown serializer 与磁盘原文之间的微差异，避免历史记录
 * 切换时误判"已修改"。
 * 注意：用户实际编辑（增删字符）通常不会被这种规范化抹平。
 */
function normalizeMarkdown(s: string): string {
  if (!s) return ''
  return s
    // 统一换行符（\r\n → \n）
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 去除每行末尾的空白字符
    .replace(/[ \t]+$/gm, '')
    // 去除每行开头的多余空白（milkdown 解析 list/blockquote 时会重排缩进，
    // 序列化时又可能还原，但通常不会改变实际语义）
    // 这里不处理开头缩进，避免破坏 code block
    // 把 3 个或更多连续换行符合并为 2 个（标准段落分隔）
    .replace(/\n{3,}/g, '\n\n')
    // 去除整个字符串的首尾空白
    .trim()
}

/**
 * 比较两个 markdown 字符串是否"内容上相等"（规范化后）
 */
function isMarkdownContentEqual(a: string, b: string): boolean {
  if (a === b) return true
  return normalizeMarkdown(a) === normalizeMarkdown(b)
}

// ===== 编辑器文字缩放（Ctrl + 滚轮）=====
// 1.0 = 100%, 范围 [0.5, 2.0]，步进 0.1
const NOTE_ZOOM_MIN = 0.5
const NOTE_ZOOM_MAX = 2.0
const NOTE_ZOOM_STEP = 0.1
const noteZoom = ref(1.0)

function clampZoom(z: number): number {
  return Math.max(NOTE_ZOOM_MIN, Math.min(NOTE_ZOOM_MAX, z))
}

/**
 * Ctrl + 鼠标滚轮调整编辑器/源码区文字大小。
 * 仅在事件目标位于编辑器/源码区/侧边栏面板内时生效，避免与系统/其他区域缩放冲突。
 */
function handleWheelZoom(e: WheelEvent) {
  if (!e.ctrlKey) return
  // 事件目标必须位于当前组件的滚动容器内
  const target = e.target as HTMLElement | null
  if (!target) return
  // 通过 class 判定是否在编辑器区域或源码 textarea 内
  const inEditor = target.closest('.note-editor-container, .source-textarea, .side-panel, .note-status-bar')
  if (!inEditor) return
  e.preventDefault()
  // 向上滚(deltaY<0)放大，向下滚(deltaY>0)缩小
  const direction = e.deltaY < 0 ? 1 : -1
  const next = clampZoom(Math.round((noteZoom.value + direction * NOTE_ZOOM_STEP) * 100) / 100)
  if (next === noteZoom.value) return
  noteZoom.value = next
}

/**
 * 恢复缩放到 100%
 */
function resetNoteZoom() {
  noteZoom.value = 1.0
}

const editorRef = ref<EditorType | null>(null)
const sourceContent = ref('')
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)
const noteMainRef = ref<HTMLElement | null>(null)
const editorContainerRef = ref<HTMLElement | null>(null)
let isSaving = false
let isClosingAfterDialog = false // 用户在未保存对话框中做出选择后，跳过 beforeunload 拦截

// ===== 代码块语言切换器（定位在光标所在代码块右下角）=====
const codeSelector = reactive({ visible: false, pos: -1, language: 'plaintext' })
const codeSelectorPos = reactive({ top: 0, left: 0 })
const codeLangDropdownOpen = ref(false)
const codeLangFilter = ref('')
const codeLangListRef = ref<HTMLElement | null>(null)
const codeLangInputRef = ref<HTMLInputElement | null>(null)

const filteredCodeLangs = computed(() => {
  const q = codeLangFilter.value.toLowerCase()
  if (!q) return [...CODE_LANGS]
  return CODE_LANGS.filter(l => l.toLowerCase().includes(q))
})

function getEditorView(): any | null {
  const editor = editorRef.value
  if (!editor || typeof editor.action !== 'function') return null
  try {
    return editor.action((ctx: any) => ctx.get(editorViewCtx))
  } catch {
    return null
  }
}

function updateCodeBlockSelector() {
  if (noteStore.sourceMode) {
    codeSelector.visible = false
    return
  }
  const view = getEditorView()
  const main = noteMainRef.value
  const container = editorContainerRef.value
  if (!view || !main) {
    codeSelector.visible = false
    return
  }
  const { state } = view
  const { $from } = state.selection
  // 查找光标所在的代码块节点位置
  let pos = -1
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'code_block') {
      pos = $from.before(d)
      break
    }
  }
  if (pos < 0) {
    codeSelector.visible = false
    return
  }
  const dom = view.nodeDOM(pos) as HTMLElement | null
  if (!dom) {
    codeSelector.visible = false
    return
  }
  const dr = dom.getBoundingClientRect()
  const mr = main.getBoundingClientRect()
  // 代码块已滚动出编辑器可视区域时隐藏
  if (container) {
    const cr = container.getBoundingClientRect()
    if (dr.bottom < cr.top || dr.top > cr.bottom) {
      codeSelector.visible = false
      return
    }
  }
  codeSelector.pos = pos
  codeSelector.language = $from.parent.attrs.language || 'plaintext'
  // 定位到代码块右下角（相对 .note-main）
  codeSelectorPos.top = dr.bottom - mr.top - 28
  codeSelectorPos.left = dr.right - mr.left - 104
  codeSelector.visible = true
}

// selectionchange 触发时，ProseMirror 尚未提交最新 state，直接读取会得到旧选区。
// 延迟到下一帧，待 PM 同步完 state 后再计算，避免"进代码块不显示 / 出代码块仍显示"。
let codeSelRaf = 0
function scheduleCodeBlockSelector() {
  if (codeSelRaf) cancelAnimationFrame(codeSelRaf)
  codeSelRaf = requestAnimationFrame(() => {
    codeSelRaf = 0
    updateCodeBlockSelector()
  })
}

function selectCodeLang(lang: string) {
  codeSelector.language = lang
  codeLangDropdownOpen.value = false
  codeLangFilter.value = ''
  const view = getEditorView()
  if (!view || codeSelector.pos < 0) return
  try {
    const tr = view.state.tr.setNodeAttribute(codeSelector.pos, 'language', lang === 'plaintext' ? '' : lang)
    view.dispatch(tr)
    scheduleCodeBlockSelector()
  } catch (err) {
    console.error('切换代码语言失败:', err)
  }
}

function toggleCodeLangDropdown() {
  codeLangDropdownOpen.value = !codeLangDropdownOpen.value
  if (codeLangDropdownOpen.value) {
    codeLangFilter.value = ''
    nextTick(() => {
      // 滚动到当前选中项
      const list = codeLangListRef.value
      if (list) {
        const active = list.querySelector('.code-lang-item.active') as HTMLElement | null
        active?.scrollIntoView({ block: 'nearest' })
      }
      codeLangInputRef.value?.focus()
    })
  }
}

function onCodeLangFilterInput(e: Event) {
  codeLangFilter.value = (e.target as HTMLInputElement).value
}

function onCodeLangFilterKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    codeLangDropdownOpen.value = false
    codeLangFilter.value = ''
  } else if (e.key === 'Enter') {
    const first = filteredCodeLangs.value[0]
    if (first) selectCodeLang(first)
  }
}

// 点击外部关闭语言下拉
function onCodeLangDocClick(e: MouseEvent) {
  if (!codeLangDropdownOpen.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.code-lang-selector-wrap')) {
    codeLangDropdownOpen.value = false
    codeLangFilter.value = ''
  }
}

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

function handleBeforeUnload(e: BeforeUnloadEvent) {
  // 用户已在未保存对话框中做出选择，允许关闭
  if (isClosingAfterDialog) {
    saveCurrentDraft()
    return
  }

  // 检测是否有未保存的更改或临时文件
  const hasUnsavedChanges = noteStore.isModified
  const isTempFile = !noteStore.currentFilePath

  if (hasUnsavedChanges || isTempFile) {
    // 阻止窗口关闭
    e.preventDefault()
    e.returnValue = false

    // 显示自定义未保存更改对话框
    const message = isTempFile
      ? '当前文件是临时文件，尚未保存到磁盘，是否保存？'
      : '当前文件已修改但尚未保存，是否保存？'

    unsavedDialog.message = message
    unsavedDialog.visible = true
    ;(window as any).__unsavedDialogVisible = true
    unsavedDialog._resolve = async (result) => {
      // 标记已做出选择，使下一次 beforeunload 不再拦截
      isClosingAfterDialog = true
      if (result === 'save') {
        // 用户选择保存
        if (isTempFile) {
          await handleSaveAsFile()
        } else {
          await handleSaveFile()
        }
        // 保存后标记为已保存，然后关闭
        noteStore.markSaved()
        window.close()
      } else if (result === 'discard') {
        // 用户选择放弃修改
        noteStore.markSaved()
        window.close()
      } else {
        // cancel：撤销选择，恢复拦截
        isClosingAfterDialog = false
      }
    }

    return false
  }
  // 退出前保存草稿
  saveCurrentDraft()
}

// 清除草稿（当文件正常保存到磁盘后调用）
function clearDraftAfterSave() {
  noteStore.clearDraft()
}

// ===== 未保存更改对话框 =====
const unsavedDialog = {
  visible: false,
  message: '',
  messagePrefix: '',
  _resolve: null as ((result: 'save' | 'discard' | 'cancel') => void) | null,
}

function showUnsavedDialog(messagePrefix = ''): Promise<'save' | 'discard' | 'cancel'> {
  return new Promise((resolve) => {
    unsavedDialog.messagePrefix = messagePrefix
    unsavedDialog.message = messagePrefix ? `${messagePrefix}尚未保存，是否先保存？` : '当前修改尚未保存，是否先保存？'
    unsavedDialog.visible = true
    ;(window as any).__unsavedDialogVisible = true
    unsavedDialog._resolve = resolve
  })
}

function onUnsavedSave() {
  unsavedDialog.visible = false
  ;(window as any).__unsavedDialogVisible = false
  unsavedDialog._resolve?.('save')
  unsavedDialog._resolve = null
}

function onUnsavedDiscard() {
  unsavedDialog.visible = false
  ;(window as any).__unsavedDialogVisible = false
  unsavedDialog._resolve?.('discard')
  unsavedDialog._resolve = null
}

function onUnsavedCancel() {
  unsavedDialog.visible = false
  ;(window as any).__unsavedDialogVisible = false
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
  // 用规范化字符串比较，避免与 milkdown 序列化结果之间的微差异误判
  if (noteStore.pendingBaselineSync) {
    // 首次输入即同步基准（与 markdownUpdated 同样的机制）
    noteStore.syncBaseline(sourceContent.value)
  } else if (!isMarkdownContentEqual(sourceContent.value, noteStore.lastSavedContent)) {
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
    if (noteStore.pendingBaselineSync) {
      noteStore.syncBaseline(content)
    } else if (!isMarkdownContentEqual(content, noteStore.lastSavedContent)) {
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
            attributes: { class: 'milkdown-editor-body', spellcheck: 'false' },
          })
          ctx.get(listenerCtx)
            .markdownUpdated((_ctx, markdown) => {
              // 章节文件：把编辑器里的 file:// URL 还原为 .image/... 相对引用
              const normalized = collapseChapterImageSrcs(markdown)
              if (noteStore.pendingBaselineSync) {
                // openFile/newFile 后的首次 markdownUpdated：
                // 把 lastSavedContent 同步为当前 markdown 字符串，
                // 作为后续"是否修改"判定的基准（消除磁盘原文与 serializer 的微差异）。
                // 不修改 isModified（保持 openFile 时设置的 false）。
                noteStore.syncBaseline(normalized)
              } else if (!isMarkdownContentEqual(normalized, noteStore.lastSavedContent)) {
                noteStore.markModified()
              } else {
                noteStore.markSaved()
              }
              // 实时更新文档大纲
              sidebar.parseOutline(markdown)
              // 触发草稿自动保存
              scheduleSaveDraft()
            })
          // 语法高亮：语言已在 @/editor/codeHighlight 注册到共享 refractor 单例
          ctx.set(prismConfig.key, {
            configureRefractor: (r) => r,
          })
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(prism)
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
    // 章节文件：把编辑器里的 file:// URL 还原为 .image/... 相对引用
    return collapseChapterImageSrcs(editor.action(getMarkdown()))
  } catch {
    return ''
  }
}

// ===== 章节图片双向转换（使用 composable）=====

// 替换编辑器内容
// 关键：openFile/newFile 后会置 pendingBaselineSync=true，
// markdownUpdated 首次触发时把 lastSavedContent 同步为当前 markdown 字符串，
// 消除磁盘原文与 milkdown serializer 之间的微差异（末尾空白、连续空行等），
// 避免历史记录切换时误判"已修改"。
async function replaceContent(markdown: string) {
  const editor = editorRef.value
  if (!editor) return
  // 章节文件：扫描 markdown 中的 .image/... 引用，重建 chimg:// 映射
  const chapterDir = getChapterDir(noteStore.currentFilePath, sidebar.fileTreeRootPath)
  if (chapterDir) {
    await ensureChapterRegistered(chapterDir)
    if (currentChapterId.value) {
      rebuildChapterImageMap(markdown)
    } else {
      clearChapterImages()
    }
  } else {
    clearChapterImages()
    currentChapterId.value = null
  }
  try {
    const { replaceAll } = await import('@milkdown/kit/utils')
    // 章节文件：把 .image/... 相对引用展开为 file:// URL，编辑器才能渲染
    editor.action(replaceAll(expandChapterImageSrcs(markdown)))
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

/**
 * 静默重置编辑器（不弹未保存对话框）。
 * 用于"创建 epub 目录"等场景：用户已做出明确选择，无需再询问。
 */
async function handleResetEditor() {
  noteStore.newFile()
  await nextTick()
  await replaceContent('# 未命名\n\n')
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
          // 若文件目录面板有根目录且与当前文件同目录，刷新文件树
          if (sidebar.fileTreeRootPath) {
            const fileDirIdx = Math.max(noteStore.currentFilePath.lastIndexOf('/'), noteStore.currentFilePath.lastIndexOf('\\'))
            if (fileDirIdx > 0) {
              const fileDir = noteStore.currentFilePath.substring(0, fileDirIdx)
              // 简单判断：根目录与文件目录相同，或根目录是文件目录的祖先
              if (fileDir === sidebar.fileTreeRootPath || fileDir.startsWith(sidebar.fileTreeRootPath)) {
                sidebar.refreshFileTree()
              }
            }
          }
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

    // 决定保存对话框的默认目录：
    //   1. 当前正在编辑的文件的父目录
    //   2. 文件目录面板的根目录
    //   3. 都不存在则不传，使用后端默认（用户文档目录）
    let defaultDir: string | undefined
    if (noteStore.currentFilePath) {
      const idx = Math.max(noteStore.currentFilePath.lastIndexOf('/'), noteStore.currentFilePath.lastIndexOf('\\'))
      if (idx > 0) defaultDir = noteStore.currentFilePath.substring(0, idx)
    }
    if (!defaultDir && sidebar.fileTreeRootPath) {
      defaultDir = sidebar.fileTreeRootPath
    }

    // 弹出保存对话框（文件名输入框，默认"简记-XX.md"）
    const result = await window.electronAPI?.dialog.showNoteSaveDialog(content, defaultDir)
    if (result) {
      // 注意：不要调 openFile（它会置 pendingBaselineSync=true，导致下次
      // markdownUpdated 误用序列化结果覆盖刚保存的 lastSavedContent）。
      // 直接设置状态即可。
      noteStore.currentFilePath = result.filePath
      noteStore.currentFileName = result.fileName
      noteStore.lastSavedContent = content
      noteStore.markSaved()
      noteStore.clearPendingBaselineSync()
      toast.show(`已保存: ${result.fileName}`)
      sidebar.addToHistory(result.filePath, result.fileName, content)
      sidebar.parseOutline(content)
      // 清除草稿（已正常保存到磁盘）
      clearDraftAfterSave()
      // 若文件目录面板的根目录与保存目录一致（或为其祖先），刷新文件树
      if (sidebar.fileTreeRootPath) {
        const fileDirIdx = Math.max(result.filePath.lastIndexOf('/'), result.filePath.lastIndexOf('\\'))
        if (fileDirIdx > 0) {
          const fileDir = result.filePath.substring(0, fileDirIdx)
          if (fileDir === sidebar.fileTreeRootPath || fileDir.startsWith(sidebar.fileTreeRootPath)) {
            sidebar.refreshFileTree()
          }
        }
      }
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
  handleOpenFromHistory,
  handleResetEditor,
})

// ===== 侧边栏交互 =====
// 从历史记录或文件目录打开文件
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
    // 同步文件目录面板的高亮
    sidebar.selectNode(filePath)
  } catch (err) {
    console.error('打开历史文件失败:', err)
    toast.show('文件不存在或无法打开')
    sidebar.removeFromHistory(filePath)
  }
}

// 滚动到指定行（文档大纲跳转）
function handleScrollToLine(line: number) {
  try {
    // 源码模式：在 textarea 中滚动到对应行
    if (noteStore.sourceMode && sourceTextareaRef.value) {
      scrollSourceToLine(line)
      return
    }
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

// 源码模式下将 textarea 平滑滚动到指定行（兼容软换行）
function scrollSourceToLine(line: number) {
  const ta = sourceTextareaRef.value
  if (!ta) return
  const text = sourceContent.value
  const lines = text.split('\n')
  // 目标行的字符偏移
  let offset = 0
  for (let i = 0; i < line && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  // 聚焦到该行，便于后续编辑
  ta.focus()
  ta.setSelectionRange(offset, offset)

  // 用镜像 div 复刻 textarea 的字体/内边距/换行，测量目标行像素位置
  const cs = getComputedStyle(ta)
  const mirror = document.createElement('div')
  const copyProps = [
    'boxSizing', 'width', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
    'lineHeight', 'textTransform', 'wordSpacing', 'tabSize',
  ] as const
  copyProps.forEach((prop) => {
    // 复制计算后的样式，确保换行方式一致
    // @ts-ignore - 动态拷贝样式
    mirror.style[prop] = cs[prop]
  })
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.overflow = 'hidden'
  mirror.textContent = text.substring(0, offset)
  document.body.appendChild(mirror)
  // offsetHeight 包含上内边距，约等于目标行起始位置
  const targetY = Math.max(0, mirror.offsetHeight - ta.clientHeight / 2)
  document.body.removeChild(mirror)

  // 平滑滚动
  const startY = ta.scrollTop
  const dist = targetY - startY
  if (Math.abs(dist) < 2) {
    ta.scrollTop = targetY
    return
  }
  const dur = 260
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / dur)
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    ta.scrollTop = startY + dist * eased
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
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
  // 章节文件始终拦截并存入 .image（与全局图片格式设置无关）；
  // 非章节文件仅在全局 path 模式下拦截
  const chapterDir = getChapterDir(noteStore.currentFilePath, sidebar.fileTreeRootPath)
  if (!chapterDir && getImageFormat() !== 'path') return

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

        // 章节文件 / 普通文件：分别走不同存储路径
        const inserted = await insertImageForCurrentFile({
          base64DataUrl,
          filePath: noteStore.currentFilePath,
          rootPath: sidebar.fileTreeRootPath,
        })
        if (!inserted) return
        const { src, markdown: mdImage } = inserted

        // 在编辑器中插入图片
        if (noteStore.sourceMode && sourceTextareaRef.value) {
          // 源码模式：直接插入 markdown 语法（相对引用）
          const ta = sourceTextareaRef.value
          const start = ta.selectionStart
          const end = ta.selectionEnd
          sourceContent.value = sourceContent.value.substring(0, start) + mdImage + sourceContent.value.substring(end)
          ta.selectionStart = ta.selectionEnd = start + mdImage.length
          onSourceInput()
        } else if (editorRef.value) {
          // Milkdown：用 imageCommand 插入，src 给可渲染的 URL（file:// 或 cacheimg://）
          try {
            const { insertImageCommand } = await import('@milkdown/kit/preset/commonmark')
            // 通过 Milkdown 自身的命令插入
            ;(editorRef.value as any).action(insertImageCommand.key, { src, alt: 'image' })
          } catch (err) {
            // 兜底：把整段 markdown 追加到当前内容
            const currentMd = getMarkdownContent()
            const newMd = currentMd
              ? currentMd.trimEnd() + '\n\n' + mdImage + '\n'
              : mdImage + '\n'
            await replaceContent(newMd)
            sidebar.parseOutline(newMd)
          }
        } else {
          document.execCommand('insertText', false, mdImage)
        }

        toast.show(chapterDir ? '图片已保存到 .image 文件夹' : '图片已缓存到本地')
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
  // Ctrl+滚轮缩放监听：必须 passive:false 才能 preventDefault 阻止浏览器内置缩放
  window.addEventListener('wheel', handleWheelZoom, { passive: false })
  // 光标在代码块内时显示语言切换器，并在编辑器滚动时重新定位
  document.addEventListener('selectionchange', scheduleCodeBlockSelector)
  editorContainerRef.value?.addEventListener('scroll', scheduleCodeBlockSelector)
  // 点击外部关闭代码语言下拉框
  document.addEventListener('mousedown', onCodeLangDocClick)
  // 加载历史记录
  sidebar.loadHistory?.();
  // 暴露保存函数到全局，供 TitleBar 调用
  ;(window as any).__noteEditorSave = handleSaveFile
  ;(window as any).__noteEditorSaveAs = handleSaveAsFile
  // 监听 currentFilePath 变化：切换/新建文件时清空章节图片映射
  watch(() => noteStore.currentFilePath, () => {
    clearChapterImages()
    currentChapterId.value = null
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('paste', handlePaste)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('wheel', handleWheelZoom)
  window.removeEventListener('note-reset-editor', handleResetEditor)
  document.removeEventListener('selectionchange', scheduleCodeBlockSelector)
  document.removeEventListener('mousedown', onCodeLangDocClick)
  editorContainerRef.value?.removeEventListener('scroll', scheduleCodeBlockSelector)
  // 清除全局暴露的保存函数
  delete (window as any).__noteEditorSave
  delete (window as any).__noteEditorSaveAs
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
    <div class="note-main" ref="noteMainRef" :style="{ '--note-zoom': noteZoom }">
      <!-- 顶部格式化工具栏（类似 Word 的"开始"栏；源码模式下隐藏） -->
      <NoteToolbar v-show="!noteStore.sourceMode" />

      <!-- Milkdown 编辑器（源码模式时隐藏） -->
      <div v-show="!noteStore.sourceMode" ref="editorContainerRef" class="note-editor-container custom-scrollbar">
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
        <!-- 缩放状态：始终显示百分比；非 100% 时显示恢复按钮 -->
        <span class="status-item status-zoom" :class="{ 'status-zoom-modified': noteZoom !== 1.0 }">
          {{ Math.round(noteZoom * 100) }}%
        </span>
        <button
          v-if="noteZoom !== 1.0"
          class="status-zoom-reset"
          @click="resetNoteZoom"
          title="恢复 100% 缩放"
        >
          <RotateCcw :size="11" :stroke-width="2" />
          <span>恢复</span>
        </button>
      </div>

      <!-- 代码块语言切换器（定位在光标所在代码块右下角） -->
      <div
        v-if="codeSelector.visible"
        class="code-lang-selector-wrap"
        :style="{ top: codeSelectorPos.top + 'px', left: codeSelectorPos.left + 'px' }"
        @mousedown.stop
      >
        <!-- 触发按钮：显示当前语言 -->
        <button
          class="code-lang-selector"
          :class="{ open: codeLangDropdownOpen }"
          title="切换代码语言"
          @click="toggleCodeLangDropdown"
        >
          <span class="code-lang-label">{{ codeSelector.language }}</span>
          <span class="code-lang-arrow">▾</span>
        </button>

        <!-- 下拉列表面板 -->
        <Transition name="code-lang-fade">
          <div v-if="codeLangDropdownOpen" class="code-lang-dropdown">
            <!-- 搜索框 -->
            <div class="code-lang-search">
              <input
                ref="codeLangInputRef"
                type="text"
                class="code-lang-search-input"
                placeholder="筛选语言..."
                :value="codeLangFilter"
                @input="onCodeLangFilterInput"
                @keydown="onCodeLangFilterKeydown"
                spellcheck="false"
              />
            </div>
            <!-- 语言列表 -->
            <ul ref="codeLangListRef" class="code-lang-list custom-scrollbar-compact">
              <li
                v-for="lang in filteredCodeLangs"
                :key="lang"
                class="code-lang-item"
                :class="{ active: lang === codeSelector.language }"
                @mousedown.stop.prevent="selectCodeLang(lang)"
              >{{ lang }}</li>
              <li v-if="filteredCodeLangs.length === 0" class="code-lang-item empty">无匹配</li>
            </ul>
          </div>
        </Transition>
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
  // 用 em 让 padding 跟随 Ctrl+滚轮缩放（保持视觉比例）
  padding: 2em 3em;
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

/* 代码块语法高亮（refractor / Prism token 类名） */
.milkdown .token.comment,
.milkdown .token.prolog,
.milkdown .token.doctype,
.milkdown .token.cdata {
  color: #8b949e;
}
.milkdown .token.punctuation {
  color: var(--text-secondary);
}
.milkdown .token.keyword,
.milkdown .token.boolean,
.milkdown .token.selector,
.milkdown .token.important {
  color: #e06c75;
}
.milkdown .token.string,
.milkdown .token.attr-value,
.milkdown .token.char,
.milkdown .token.inserted {
  color: #98c379;
}
.milkdown .token.number,
.milkdown .token.property,
.milkdown .token.constant,
.milkdown .token.symbol,
.milkdown .token.variable {
  color: #d19a66;
}
.milkdown .token.function,
.milkdown .token.class-name {
  color: #61afef;
}
.milkdown .token.tag,
.milkdown .token.operator {
  color: #56b6c2;
}
.milkdown .token.attr-name,
.milkdown .token.builtin,
.milkdown .token.deleted {
  color: #e5c07b;
}
.milkdown .token.regex {
  color: #d19a66;
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
  position: relative;
}

/* 代码块右下角的语言切换下拉框 */
// 代码块语言切换器：包裹层（绝对定位在代码块右下角）
.code-lang-selector-wrap {
  position: absolute;
  z-index: 40;
}

// 触发按钮（替换原生 <select>）
.code-lang-selector {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: border-color 0.12s, color 0.12s;

  &:hover, &.open {
    border-color: var(--accent-color);
    color: var(--text-primary);
  }
}

.code-lang-label {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-lang-arrow {
  font-size: 10px;
  opacity: 0.6;
  flex-shrink: 0;
}

// 下拉面板
.code-lang-dropdown {
  position: absolute;
  bottom: calc(100% + 4px);
  right: 0;
  width: 160px;
  max-height: 260px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

// 搜索框
.code-lang-search {
  padding: 4px 6px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.code-lang-search-input {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 11px;
  outline: none;

  &::placeholder {
    color: var(--text-tertiary);
  }

  &:focus {
    border-color: var(--accent-color);
  }
}

// 语言列表
.code-lang-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  flex: 1;
  overflow-y: auto;
}

.code-lang-item {
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.08s, color 0.08s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    color: var(--accent-color);
    font-weight: 600;
  }

  &.empty {
    color: var(--text-tertiary);
    font-style: italic;
    cursor: default;

    &:hover {
      background: transparent;
      color: var(--text-tertiary);
    }
  }
}

// 下拉动画
.code-lang-fade-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.code-lang-fade-leave-active {
  transition: opacity 0.08s ease, transform 0.08s ease;
}
.code-lang-fade-enter-from,
.code-lang-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.note-editor-container {
  flex: 1;
  overflow-y: auto;
  // 编辑区为最浅一档（bg-secondary），与面板、图标栏形成由浅入深的层次
  background: var(--bg-secondary);
  // 基础 16px × 缩放系数（由 note-main 上的 --note-zoom 控制，Ctrl+滚轮调节）
  font-size: calc(16px * var(--note-zoom, 1));
  line-height: 1.75;
  font-family: system-ui, -apple-system, sans-serif;
}

.source-textarea {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  // 用 em 让 padding 跟随 Ctrl+滚轮缩放
  padding: 2em 3em;
  background: var(--bg-secondary);
  color: var(--text-primary);
  // 基础 14px × 缩放系数（与编辑器共用同一个 CSS 变量）
  font-size: calc(14px * var(--note-zoom, 1));
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

// 缩放百分比：非 100% 时用强调色提示用户当前处于非默认缩放
.status-zoom {
  font-variant-numeric: tabular-nums;
  transition: color 0.15s;
}
.status-zoom-modified {
  color: var(--accent-color);
  font-weight: 500;
}

// 恢复默认缩放按钮（纯文字，无边框/方框）
.status-zoom-reset {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--accent-color);
  font-size: 11px;
  cursor: pointer;
  transition: opacity 0.12s;
  line-height: 1;
  font-variant-numeric: tabular-nums;

  &:hover {
    opacity: 0.7;
    text-decoration: underline;
  }
}
</style>
