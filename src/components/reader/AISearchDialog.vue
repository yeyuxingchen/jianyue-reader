<script lang="ts" setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useToastStore } from '@/stores/toast'
import { aiService, LENGTH_LIMIT_OPTIONS, type LengthLimitValue } from '@/services/aiService'
import type { AIChatMessage } from '@/types'
import { X, Send, Loader2, Copy, Trash2 } from 'lucide-vue-next'
import { marked } from 'marked'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps<{
  initialText?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const reader = useReaderStore()
const toastStore = useToastStore()

const messages = ref<AIChatMessage[]>([])
const inputText = ref('')
const isLoading = ref(false)
const streamingContent = ref('')
const errorMsg = ref('')

const modelList = ref<string[]>([])
const selectedModel = ref('')
const lengthLimit = ref<LengthLimitValue>(100)

const showConfirm = ref(false)
const confirmIdx = ref(-1)

const dialogRef = ref<HTMLElement>()
const dialogPos = ref({ x: 0, y: 0 })
const dialogSize = ref({ w: 420, h: 380 })
const MIN_W = 300
const MIN_H = 250

const isDragging = ref(false)
const isResizingR = ref(false)
const isResizingB = ref(false)
const isInteracting = computed(() => isDragging.value || isResizingR.value || isResizingB.value)

let dragStartX = 0
let dragStartY = 0
let dialogStartX = 0
let dialogStartY = 0
let resizeStartX = 0
let resizeStartY = 0
let resizeStartW = 0
let resizeStartH = 0

const chatContainer = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()

marked.setOptions({
  breaks: true,
  gfm: true,
})

function renderMarkdown(content: string): string {
  return marked.parse(content) as string
}

function initPosition() {
  const parent = document.querySelector('.reader') as HTMLElement
  if (!parent) return
  const pw = parent.clientWidth
  const ph = parent.clientHeight
  dialogPos.value = {
    x: Math.max(0, (pw - dialogSize.value.w) / 2),
    y: Math.max(0, (ph - dialogSize.value.h) / 2),
  }
}

function onTitleMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button')) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dialogStartX = dialogPos.value.x
  dialogStartY = dialogPos.value.y
  e.preventDefault()
}

function onResizeRMousedown(e: MouseEvent) {
  isResizingR.value = true
  resizeStartX = e.clientX
  resizeStartW = dialogSize.value.w
  e.preventDefault()
  e.stopPropagation()
}

function onResizeBMousedown(e: MouseEvent) {
  isResizingB.value = true
  resizeStartY = e.clientY
  resizeStartH = dialogSize.value.h
  e.preventDefault()
  e.stopPropagation()
}

// 遮罩层上的 mousemove（不会被 iframe 拦截）
function onOverlayMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    let newX = dialogStartX + dx
    let newY = dialogStartY + dy

    const parent = document.querySelector('.reader') as HTMLElement
    if (parent) {
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      newX = Math.max(0, Math.min(newX, pw - dialogSize.value.w))
      newY = Math.max(0, Math.min(newY, ph - dialogSize.value.h))
    }
    dialogPos.value = { x: newX, y: newY }
  }

  if (isResizingR.value) {
    const dx = e.clientX - resizeStartX
    const parent = document.querySelector('.reader') as HTMLElement
    const maxW = parent ? parent.clientWidth - dialogPos.value.x : 800
    dialogSize.value.w = Math.max(MIN_W, Math.min(resizeStartW + dx, maxW))
  }

  if (isResizingB.value) {
    const dy = e.clientY - resizeStartY
    const parent = document.querySelector('.reader') as HTMLElement
    const maxH = parent ? parent.clientHeight - dialogPos.value.y : 600
    dialogSize.value.h = Math.max(MIN_H, Math.min(resizeStartH + dy, maxH))
  }
}

function onOverlayMouseUp() {
  isDragging.value = false
  isResizingR.value = false
  isResizingB.value = false
}

onMounted(() => {
  initPosition()
  loadHistory()

  modelList.value = aiService.getModelList()
  selectedModel.value = aiService.getSelectedModel()
  // 如果持久化的模型不在列表中，回退到第一个
  if (modelList.value.length && !modelList.value.includes(selectedModel.value)) {
    selectedModel.value = modelList.value[0]
  }
  lengthLimit.value = aiService.getLengthLimit()

  if (props.initialText) {
    sendMessage(`搜索并解释：${props.initialText}`)
  }
})

async function loadHistory() {
  const bookId = reader.currentBook?.id
  if (!bookId) return
  const history = await aiService.loadChatHistory(bookId)
  messages.value = Array.isArray(history) ? history : []
  nextTick(() => scrollToBottom())
}

function saveHistory() {
  const bookId = reader.currentBook?.id
  if (!bookId) return
  aiService.saveChatHistory(bookId, messages.value)
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function buildBookContext(): string {
  const book = reader.currentBook
  if (!book) return ''

  const toc = reader.toc
  const chapterTitle = reader.currentChapterTitle
  const currentCfi = reader.currentCfi

  let context = `【阅读背景信息】\n`
  context += `你正在阅读的书籍是《${book.title}》${book.author ? `，作者是 ${book.author}` : ''}。\n`

  if (toc && toc.length > 0) {
    context += `\n本书包含以下章节：\n`
    toc.forEach((item, index) => {
      context += `${index + 1}. ${item.label}\n`
    })
  }

  if (chapterTitle) {
    context += `\n当前所在章节：「${chapterTitle}」`
    if (currentCfi) {
      context += `（位置标识：${currentCfi}）`
    }
    context += `\n`
  }

  context += `\n请基于以上书籍背景信息来回答用户的问题。`
  return context
}

async function sendMessage(text: string) {
  if (!text.trim() || isLoading.value) return

  errorMsg.value = ''
  const userMsg: AIChatMessage = {
    role: 'user',
    content: text.trim(),
    timestamp: Date.now(),
  }
  messages.value.push(userMsg)
  inputText.value = ''
  scrollToBottom()

  if (!aiService.isConfigured()) {
    errorMsg.value = '请先配置 AI 设置（点击顶部 AI 设置图标）'
    return
  }

  isLoading.value = true
  streamingContent.value = ''

  const contextMessages = messages.value.slice(-20)
  const bookContext = buildBookContext()

  const messagesWithContext: AIChatMessage[] = [
    { role: 'system', content: bookContext, timestamp: Date.now() },
    ...contextMessages,
  ]

  await aiService.chat(
    messagesWithContext,
    (chunk) => {
      streamingContent.value += chunk
      scrollToBottom()
    },
    () => {
      const assistantMsg: AIChatMessage = {
        role: 'assistant',
        content: streamingContent.value,
        timestamp: Date.now(),
      }
      messages.value.push(assistantMsg)
      streamingContent.value = ''
      isLoading.value = false
      saveHistory()
      scrollToBottom()
    },
    (err) => {
      errorMsg.value = err
      isLoading.value = false
      streamingContent.value = ''
    },
    { model: selectedModel.value, lengthLimit: lengthLimit.value },
  )
}

function handleSend() {
  sendMessage(inputText.value)
}

function onModelChange() {
  aiService.saveSelectedModel(selectedModel.value)
}

function onLengthLimitChange() {
  aiService.saveLengthLimit(lengthLimit.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function formatTime(timestamp: number): string {
  const now = new Date()
  const msgDate = new Date(timestamp)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1)

  const h = msgDate.getHours()
  const m = msgDate.getMinutes()
  const mm = `${m}`.padStart(2, '0')
  const timeStr = `${h}:${mm}`

  if (msgDate >= startOfToday) {
    return timeStr
  }
  if (msgDate >= startOfYesterday) {
    return `昨天 ${timeStr}`
  }
  if (msgDate >= startOfYear) {
    return `${msgDate.getMonth() + 1}月${msgDate.getDate()}日 ${timeStr}`
  }
  if (msgDate >= startOfLastYear) {
    return `${msgDate.getFullYear()}年${msgDate.getMonth() + 1}月${msgDate.getDate()}日`
  }
  return `${msgDate.getFullYear()}年${msgDate.getMonth() + 1}月${msgDate.getDate()}日`
}

function handleCopy(content: string) {
  if (window.electronAPI?.clipboard) {
    window.electronAPI.clipboard.writeText(content)
  } else {
    navigator.clipboard.writeText(content)
  }
  toastStore.show('已复制到剪贴板')
}

// 删除用户消息及其后续AI回复（一问一答整轮删除）
function handleDelete(idx: number) {
  const msg = messages.value[idx]
  if (!msg || msg.role !== 'user') return
  confirmIdx.value = idx
  showConfirm.value = true
}

function onConfirmDelete() {
  const idx = confirmIdx.value
  const toRemove = [idx]
  if (messages.value[idx + 1]?.role === 'assistant') {
    toRemove.push(idx + 1)
  }
  messages.value = messages.value.filter((_, i) => !toRemove.includes(i))
  saveHistory()
  showConfirm.value = false
}
</script>

<template>
  <!-- 全屏遮罩层：拖拽/调整时拦截所有鼠标事件，防止 iframe 吞事件 -->
  <div
    v-if="isInteracting"
    class="ai-interact-overlay"
    :class="{
      'cursor-move': isDragging,
      'cursor-ew': isResizingR,
      'cursor-ns': isResizingB,
    }"
    @mousemove="onOverlayMouseMove"
    @mouseup="onOverlayMouseUp"
  ></div>

  <div
    ref="dialogRef"
    class="ai-search-dialog"
    :style="{
      left: dialogPos.x + 'px',
      top: dialogPos.y + 'px',
      width: dialogSize.w + 'px',
      height: dialogSize.h + 'px',
    }"
  >
    <!-- 标题栏 - 可拖拽 -->
    <div class="ai-dialog-titlebar" @mousedown="onTitleMouseDown">
      <span class="ai-dialog-title">AI 搜索</span>
      <button class="ai-dialog-close" @click="emit('close')" title="关闭">
        <X :size="14" />
      </button>
    </div>

    <!-- 对话内容区 -->
    <div ref="chatContainer" class="ai-chat-content custom-scrollbar-compact">
      <div v-if="messages.length === 0 && !isLoading" class="ai-chat-empty">
        选中文字后点击 AI 搜索，或直接输入问题
      </div>
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="ai-chat-msg"
        :class="msg.role"
      >
        <div class="ai-msg-bubble">
          <div class="ai-msg-label">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
          <div v-if="msg.role === 'user'" class="ai-msg-content">{{ msg.content }}</div>
          <div v-else class="ai-msg-content ai-msg-md" v-html="renderMarkdown(msg.content)"></div>
          <div class="ai-msg-footer">
            <template v-if="msg.role === 'user'">
              <span class="ai-msg-time">{{ formatTime(msg.timestamp) }}</span>
              <button class="ai-msg-action-btn" title="复制" @click="handleCopy(msg.content)">
                <Copy :size="10" />
              </button>
              <button class="ai-msg-action-btn" title="删除" @click="handleDelete(idx)">
                <Trash2 :size="10" />
              </button>
            </template>
            <template v-else>
              <button class="ai-msg-action-btn" title="复制原文" @click="handleCopy(msg.content)">
                <Copy :size="10" />
              </button>
            </template>
          </div>
        </div>
      </div>
      <!-- 流式输出 -->
      <div v-if="isLoading && streamingContent" class="ai-chat-msg assistant">
        <div class="ai-msg-bubble">
          <div class="ai-msg-label">AI</div>
          <div class="ai-msg-content ai-msg-md" v-html="renderMarkdown(streamingContent)"></div>
          <span class="ai-cursor">▌</span>
        </div>
      </div>
      <!-- 加载中 -->
      <div v-if="isLoading && !streamingContent" class="ai-chat-msg assistant">
        <div class="ai-msg-bubble">
          <div class="ai-msg-label">AI</div>
          <div class="ai-msg-content ai-loading">
            <Loader2 :size="14" class="spin" />
            <span>思考中...</span>
          </div>
        </div>
      </div>
      <!-- 错误信息 -->
      <div v-if="errorMsg" class="ai-chat-error">{{ errorMsg }}</div>
    </div>

    <!-- 输入区 -->
    <div class="ai-chat-input-area">
      <textarea
        ref="inputRef"
        v-model="inputText"
        placeholder="输入问题..."
        rows="2"
        @keydown="handleKeydown"
      ></textarea>
      <div class="ai-input-actions">
        <select
          v-model="lengthLimit"
          class="ai-select-inline"
          title="回复字数限制"
          @change="onLengthLimitChange"
        >
          <option v-for="opt in LENGTH_LIMIT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select
          v-if="modelList.length > 1"
          v-model="selectedModel"
          class="ai-select-inline"
          title="切换模型"
          @change="onModelChange"
        >
          <option v-for="m in modelList" :key="m" :value="m">{{ m }}</option>
        </select>
        <button class="ai-send-btn" :disabled="isLoading || !inputText.trim()" @click="handleSend" title="发送">
          <Send :size="14" />
        </button>
      </div>
    </div>

    <!-- 右边框调整手柄 -->
    <div class="ai-resize-handle-r" @mousedown="onResizeRMousedown"></div>
    <!-- 底部边框调整手柄 -->
    <div class="ai-resize-handle-b" @mousedown="onResizeBMousedown"></div>
  </div>

  <!-- 确认弹窗 -->
  <ConfirmDialog
    v-if="showConfirm"
    title="删除确认"
    message="确定删除此消息及其AI回复？"
    @confirm="onConfirmDelete"
    @cancel="showConfirm = false"
  />
</template>

<style lang="scss" scoped>
// 全屏遮罩层：覆盖 iframe，确保鼠标事件不被吞
.ai-interact-overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  &.cursor-move { cursor: move; }
  &.cursor-ew { cursor: ew-resize; }
  &.cursor-ns { cursor: ns-resize; }
}

.ai-search-dialog {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 120;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.ai-dialog-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  cursor: move;
  flex-shrink: 0;
}

.ai-dialog-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.ai-dialog-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.ai-chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  user-select: text;
  min-height: 0;
}

.ai-chat-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 40px 0;
  opacity: 0.7;
}

.ai-chat-msg {
  margin-bottom: 10px;
  display: flex;

  &.user {
    justify-content: flex-end;
  }

  &.assistant {
    justify-content: flex-start;
  }
}

.ai-msg-bubble {
  display: inline-flex;
  flex-direction: column;
  max-width: 85%;
}

.ai-msg-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 3px;
  opacity: 0.7;
}

.ai-chat-msg.user .ai-msg-label {
  text-align: right;
}

.ai-msg-content {
  display: inline-block;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  width: fit-content;
  max-width: 100%;
}

.ai-chat-msg.user .ai-msg-content {
  background: #378ADD;
  color: #fff;
  align-self: flex-end;
}

.ai-chat-msg.assistant .ai-msg-content {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  align-self: flex-start;
}

.ai-msg-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.ai-chat-msg:hover .ai-msg-footer {
  opacity: 1;
}

.ai-chat-msg.user .ai-msg-footer {
  justify-content: flex-end;
}

.ai-chat-msg.assistant .ai-msg-footer {
  justify-content: flex-start;
}

.ai-msg-time {
  font-size: 9px;
  color: var(--text-secondary);
  opacity: 0.7;
  line-height: 1;
}

.ai-msg-action-btn {
  background: none;
  border: none;
  padding: 2px;
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-secondary);
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, background 0.15s;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.08);
  }
}

.ai-msg-md {
  white-space: normal;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 8px 0 4px;
    font-weight: 600;
    line-height: 1.3;
  }
  :deep(h1) { font-size: 16px; }
  :deep(h2) { font-size: 15px; }
  :deep(h3) { font-size: 14px; }
  :deep(h4) { font-size: 13px; }

  :deep(p) { margin: 4px 0; }
  :deep(strong) { font-weight: 600; }
  :deep(em) { font-style: italic; }

  :deep(ul), :deep(ol) {
    margin: 4px 0;
    padding-left: 20px;
  }
  :deep(li) { margin: 2px 0; }

  :deep(blockquote) {
    margin: 6px 0;
    padding: 4px 10px;
    border-left: 3px solid #378ADD;
    background: rgba(55, 138, 221, 0.08);
    border-radius: 0 4px 4px 0;
  }

  :deep(code) {
    background: rgba(0, 0, 0, 0.08);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
  }

  :deep(pre) {
    margin: 6px 0;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
      font-size: 12px;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 8px 0;
  }

  :deep(a) {
    color: #378ADD;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  :deep(table) {
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 12px;
    th, td {
      border: 1px solid var(--border-color);
      padding: 4px 8px;
    }
    th {
      background: rgba(0, 0, 0, 0.04);
      font-weight: 600;
    }
  }
}

.ai-cursor {
  animation: blink 1s step-end infinite;
  font-size: 13px;
  color: var(--text-primary);
}

@keyframes blink {
  50% { opacity: 0; }
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 6px;

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}

.ai-chat-error {
  background: #fef2f2;
  color: #dc2626;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-top: 6px;
}

.ai-chat-input-area {
  position: relative;
  flex-shrink: 0;

  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 8px 10px 32px 10px;
    margin: 8px 12px;
    width: calc(100% - 24px);
    font-size: 13px;
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
}

.ai-input-actions {
  position: absolute;
  right: 16px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-select-inline {
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  outline: none;
  cursor: pointer;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;

  &:hover {
    color: var(--text-primary);
  }
}

.ai-send-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #378ADD;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;

  &:hover:not(:disabled) { opacity: 0.8; }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.ai-resize-handle-r {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 2;
}

.ai-resize-handle-b {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize;
  z-index: 2;
}
</style>
