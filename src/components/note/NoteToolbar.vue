<script lang="ts" setup>
import { reactive, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { editorViewCtx } from '@milkdown/kit/core'
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  wrapInHeadingCommand,
  turnIntoTextCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  createCodeBlockCommand,
  insertHrCommand,
  insertImageCommand,
} from '@milkdown/kit/preset/commonmark'
import {
  toggleStrikethroughCommand,
  insertTableCommand,
} from '@milkdown/kit/preset/gfm'
import {
  Bold, Italic, Strikethrough, Code, Link2, Image as ImageIcon,
  Table as TableIcon, Minus, Quote, List, ListOrdered, Code2,
} from 'lucide-vue-next'
import { useNoteEditorStore } from '@/stores/appMode'
import { useToastStore } from '@/stores/toast'
import { CODE_LANGS } from '@/editor/codeLanguages'

const noteStore = useNoteEditorStore()
const toast = useToastStore()

// 当前选区/光标处的激活格式状态（用于高亮工具栏按钮，类似 Word 的"开始"栏）
const active = reactive({
  strong: false,
  emphasis: false,
  strike: false,
  code: false,
  link: false,
  heading: 0, // 0 = 正文（段落），1~3 = 对应标题级别
  blockquote: false,
  bulletList: false,
  orderedList: false,
  codeBlock: false,
  table: false,
})

type AnyEditor = { action: (fn: (ctx: any) => any) => any } | null

function getView(): any | null {
  const editor = noteStore.editorInstance as AnyEditor
  if (!editor || typeof editor.action !== 'function') return null
  try {
    return editor.action((ctx: any) => ctx.get(editorViewCtx))
  } catch {
    return null
  }
}

// 判断选区祖先链上是否包含指定节点类型
function hasAncestor(state: any, typeName: string): boolean {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === typeName) return true
  }
  return false
}

function updateActive() {
  const view = getView()
  if (!view) return
  const state = view.state
  const { selection } = state
  const marks = state.storedMarks || selection.$from.marks()
  const markNames = new Set(marks.map((m: any) => m.type.name))
  active.strong = markNames.has('strong')
  active.emphasis = markNames.has('emphasis')
  active.strike = markNames.has('strike')
  active.code = markNames.has('code')
  active.link = markNames.has('link')

  const node = selection.$from.parent
  active.heading = node.type.name === 'heading' ? Number(node.attrs.level) : 0
  active.blockquote = hasAncestor(state, 'blockquote')
  active.bulletList = hasAncestor(state, 'bullet_list')
  active.orderedList = hasAncestor(state, 'ordered_list')
  active.codeBlock = node.type.name === 'code_block'
  active.table = hasAncestor(state, 'table')
}

// 执行 milkdown 命令（命令为 @milkdown/kit 暴露的 $Command 单例，其 .run() 内部持有编辑器 ctx）
function exec(cmd: { run: (payload?: any) => boolean }, payload?: any) {
  const view = getView()
  if (!view) {
    toast.show('编辑器尚未就绪')
    return
  }
  view.focus()
  try {
    cmd.run(payload)
  } catch (err) {
    console.error('执行编辑器命令失败:', err)
  }
  nextTick(updateActive)
}

// ===== 弹出面板（链接 / 表格 / 代码语言）=====
type PopoverType = 'link' | 'table' | 'codeLang' | null
const popover = ref<PopoverType>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(10)

// 点击工具栏时阻止默认行为以保留编辑器选区，但放行 select/input/弹出面板本身
function onToolbarMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('select, input, .tb-popover, .tb-grid')) return
  e.preventDefault()
}

// 打开面板并将其定位到触发按钮的正下方
function openPopover(type: PopoverType, e: MouseEvent) {
  if (popover.value === type) {
    popover.value = null
    return
  }
  popover.value = type
  nextTick(() => {
    const toolbar = toolbarRef.value
    const btn = e.currentTarget as HTMLElement | null
    if (toolbar && btn) {
      const tr = toolbar.getBoundingClientRect()
      const br = btn.getBoundingClientRect()
      popoverLeft.value = Math.max(0, br.left - tr.left)
    }
  })
}

// --- 链接 ---
const linkUrl = ref('')
const linkText = ref('')
function confirmLink() {
  const url = linkUrl.value.trim()
  if (!url) {
    toast.show('请输入链接地址')
    return
  }
  const view = getView()
  if (!view) {
    popover.value = null
    return
  }
  view.focus()
  const { state } = view.state
  const { from, to, empty } = state.selection
  if (!empty) {
    // 已有选中文本：直接包裹链接
    toggleLinkCommand.run({ href: url })
  } else {
    // 无选中文本：插入链接文字（缺省用 URL 作为显示文本）
    const label = linkText.value.trim() || url
    const linkMark = state.schema.marks.link.create({ href: url, title: '' })
    const tr = state.tr.insertText(label, from)
    const end = from + label.length
    tr.addMark(from, end, linkMark)
    view.dispatch(tr)
  }
  popover.value = null
  linkUrl.value = ''
  linkText.value = ''
  nextTick(updateActive)
}

// --- 表格（WPS 风格网格选择）---
const TABLE_MAX = 8
// 默认不选中（鼠标移到方格上才动态高亮）
const tableHover = reactive({ r: -1, c: -1 })
function setTableHover(r: number, c: number) {
  tableHover.r = r
  tableHover.c = c
}
function resetTableHover() {
  tableHover.r = -1
  tableHover.c = -1
}
function pickTable(r: number, c: number) {
  exec(insertTableCommand, { row: r + 1, col: c + 1 })
  popover.value = null
}

// --- 代码块语言 ---
const codeLang = ref('plaintext')
function confirmCodeLang() {
  try {
    const view = getView()
    if (!view) return
    view.focus()
    // createCodeBlockCommand 直接接受 language 参数设置语言
    createCodeBlockCommand.run(codeLang.value === 'plaintext' ? '' : codeLang.value)
    nextTick(updateActive)
  } finally {
    // 无论成功与否，确认后都关闭面板
    popover.value = null
  }
}

// --- 图片 ---
async function insertImage() {
  try {
    const paths = await window.services.showImagePicker()
    if (!paths || paths.length === 0) return
    const filePath = paths[0]
    const dataUrl = await readFileAsDataURL(filePath)
    if (!dataUrl) {
      toast.show('读取图片失败')
      return
    }
    // 章节文件：存到 .image/，markdown 用相对引用；其他：走全局缓存
    const inserted = await insertImageForCurrentFile({ base64DataUrl: dataUrl, sourceFilePath: filePath })
    if (!inserted) {
      toast.show('插入图片失败')
      return
    }
    // src 给 milkdown 渲染用（file:// 或 cacheimg://），markdown 是落到磁盘的语法
    exec(insertImageCommand, { src: inserted.src, alt: '' })
  } catch (err) {
    console.error('插入图片失败:', err)
    toast.show('插入图片失败')
  }
}

// 将本地图片文件读取为 data URL（用于缓存协议）
async function readFileAsDataURL(filePath: string): Promise<string | null> {
  try {
    const buf = await window.services.readFileAsBuffer(filePath)
    const mime = mimeFromPath(filePath)
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[])
    }
    return `data:${mime};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function mimeFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
  }
  return map[ext] || 'image/png'
}

// 监听编辑器交互，刷新激活状态
function onDocInteraction() {
  updateActive()
}

// 点击工具栏外部时关闭弹出面板
function onDocMouseDownClose(e: MouseEvent) {
  if (popover.value && !(e.target as HTMLElement).closest('.note-toolbar')) {
    popover.value = null
  }
}

onMounted(() => {
  document.addEventListener('keyup', onDocInteraction)
  document.addEventListener('mouseup', onDocInteraction)
  document.addEventListener('focusin', onDocInteraction)
  document.addEventListener('mousedown', onDocMouseDownClose)
  const timer = setInterval(() => {
    if (getView()) {
      updateActive()
      clearInterval(timer)
    }
  }, 300)
  onBeforeUnmount(() => clearInterval(timer))
})

onBeforeUnmount(() => {
  document.removeEventListener('keyup', onDocInteraction)
  document.removeEventListener('mouseup', onDocInteraction)
  document.removeEventListener('focusin', onDocInteraction)
  document.removeEventListener('mousedown', onDocMouseDownClose)
})
</script>

<template>
  <div class="note-toolbar" ref="toolbarRef" @mousedown="onToolbarMouseDown">
    <!-- 段落 / 标题 -->
    <div class="tb-group">
      <select class="tb-select" :value="active.heading" @change="(e) => {
        const l = parseInt((e.target as HTMLSelectElement).value, 10)
        l === 0 ? exec(turnIntoTextCommand) : exec(wrapInHeadingCommand, l)
      }" title="段落样式">
        <option :value="0">正文</option>
        <option :value="1">标题 1</option>
        <option :value="2">标题 2</option>
        <option :value="3">标题 3</option>
      </select>
    </div>

    <span class="tb-sep"></span>

    <!-- 文字样式 -->
    <div class="tb-group">
      <button class="tb-btn" :class="{ active: active.strong }" title="加粗" @click="exec(toggleStrongCommand)">
        <Bold :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.emphasis }" title="斜体" @click="exec(toggleEmphasisCommand)">
        <Italic :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.strike }" title="删除线" @click="exec(toggleStrikethroughCommand)">
        <Strikethrough :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.code }" title="行内代码" @click="exec(toggleInlineCodeCommand)">
        <Code :size="15" :stroke-width="2" />
      </button>
    </div>

    <span class="tb-sep"></span>

    <!-- 插入 -->
    <div class="tb-group">
      <button class="tb-btn" :class="{ active: active.link, open: popover === 'link' }" title="插入链接" @click="openPopover('link', $event)">
        <Link2 :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" title="插入图片" @click="insertImage">
        <ImageIcon :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ open: popover === 'table' }" title="插入表格" @click="openPopover('table', $event)">
        <TableIcon :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" title="插入分割线" @click="exec(insertHrCommand)">
        <Minus :size="15" :stroke-width="2" />
      </button>
    </div>

    <span class="tb-sep"></span>

    <!-- 块级结构 -->
    <div class="tb-group">
      <button class="tb-btn" :class="{ active: active.blockquote }" title="引用" @click="exec(wrapInBlockquoteCommand)">
        <Quote :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.bulletList }" title="无序列表" @click="exec(wrapInBulletListCommand)">
        <List :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.orderedList }" title="有序列表" @click="exec(wrapInOrderedListCommand)">
        <ListOrdered :size="15" :stroke-width="2" />
      </button>
      <button class="tb-btn" :class="{ active: active.codeBlock, open: popover === 'codeLang' }" title="代码块" @click="openPopover('codeLang', $event)">
        <Code2 :size="15" :stroke-width="2" />
      </button>
    </div>

    <!-- 弹出面板 -->
    <div v-if="popover === 'link'" class="tb-popover tb-popover-link" :style="{ left: popoverLeft + 'px' }" @mousedown.stop>
      <div class="tb-popover-title">插入链接</div>
      <label class="tb-field">
        <span>地址</span>
        <input v-model="linkUrl" type="text" placeholder="https://" @keyup.enter="confirmLink" />
      </label>
      <label class="tb-field">
        <span>显示文字</span>
        <input v-model="linkText" type="text" placeholder="留空则使用地址" @keyup.enter="confirmLink" />
      </label>
      <div class="tb-popover-actions">
        <button class="tb-pop-btn cancel" @click="popover = null">取消</button>
        <button class="tb-pop-btn ok" @click="confirmLink">确定</button>
      </div>
    </div>

    <div v-if="popover === 'table'" class="tb-popover tb-popover-table" :style="{ left: popoverLeft + 'px' }" @mousedown.stop>
      <div class="tb-grid" @mouseleave="resetTableHover()">
        <div
          v-for="r in TABLE_MAX"
          :key="'row' + r"
          class="tb-grid-row"
        >
          <div
            v-for="c in TABLE_MAX"
            :key="'col' + c"
            class="tb-grid-cell"
            :class="{ on: r - 1 <= tableHover.r && c - 1 <= tableHover.c }"
            @mouseenter="setTableHover(r - 1, c - 1)"
            @click="pickTable(r - 1, c - 1)"
          ></div>
        </div>
      </div>
      <div class="tb-popover-hint">{{ tableHover.r >= 0 ? `${tableHover.r + 1} 行 × ${tableHover.c + 1} 列` : '将鼠标移到方格上选择尺寸' }}</div>
    </div>

    <div v-if="popover === 'codeLang'" class="tb-popover tb-popover-code" :style="{ left: popoverLeft + 'px' }" @mousedown.stop>
      <div class="tb-popover-title">选择代码语言</div>
      <select v-model="codeLang" class="tb-select tb-select-wide">
        <option v-for="lang in CODE_LANGS" :key="lang" :value="lang">{{ lang }}</option>
      </select>
      <div class="tb-popover-actions">
        <button class="tb-pop-btn cancel" @click="popover = null">取消</button>
        <button class="tb-pop-btn ok" @click="confirmCodeLang">确定</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.note-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  // 去掉底边框，改用底部投影与编辑区区分层次
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.10);
  flex-shrink: 0;
  min-height: 36px;
}

.tb-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tb-sep {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
}

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--accent-color);
    color: #fff;
  }

  &.open {
    background: var(--bg-tertiary);
    color: var(--accent-color);
  }
}

.tb-select {
  height: 28px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  cursor: pointer;
  outline: none;

  &:hover {
    border-color: var(--accent-color);
  }

  &:focus {
    border-color: var(--accent-color);
  }

  &.tb-select-wide {
    width: 100%;
  }
}

/* 弹出面板 */
.tb-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 10px;
  z-index: 50;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 12px;
  min-width: 220px;
}

.tb-popover-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.tb-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  span {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    width: 56px;
  }

  input {
    flex: 1;
    height: 28px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 4px;
    padding: 0 8px;
    font-size: 12px;
    outline: none;

    &:focus {
      border-color: var(--accent-color);
    }
  }
}

.tb-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.tb-pop-btn {
  height: 26px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;

  &.ok {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: #fff;
  }

  &:hover {
    opacity: 0.85;
  }
}

/* 表格网格（WPS 风格） */
.tb-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  margin-bottom: 8px;
}

.tb-grid-row {
  display: contents;
}

.tb-grid-cell {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: 2px;
  cursor: pointer;

  &.on {
    background: var(--accent-color);
    border-color: var(--accent-color);
  }
}

.tb-popover-hint {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
