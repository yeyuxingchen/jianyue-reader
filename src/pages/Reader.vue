<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useSettingsStore } from '@/stores/settings'
import { useAnnotationsStore } from '@/stores/annotations'
import ViewerContainer from '@/components/reader/ViewerContainer.vue'
import TopBar from '@/components/reader/TopBar.vue'
import PageTurner from '@/components/reader/PageTurner.vue'
import SelectionMenu from '@/components/reader/SelectionMenu.vue'
import AISettingsDialog from '@/components/reader/AISettingsDialog.vue'
import AISearchDialog from '@/components/reader/AISearchDialog.vue'
import TocPanel from '@/components/sidebar/TocPanel.vue'
import BookmarkPanel from '@/components/sidebar/BookmarkPanel.vue'
import NotePanel from '@/components/sidebar/NotePanel.vue'
import SearchPanel from '@/components/sidebar/SearchPanel.vue'
import { Upload, Download, Bold, X, FileText, Type } from 'lucide-vue-next'
import type { SidebarTab, ThemeMode } from '@/types'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const reader = useReaderStore()
const settings = useSettingsStore()
const annotations = useAnnotationsStore()

const sidebarTab = ref<SidebarTab>('toc')
const showSettings = ref(false)
const showAISettings = ref(false)
const showAISearch = ref(false)
const aiSearchText = ref('')

const showDeleteConfirm = ref(false)
const pendingDeleteFont = ref<{ name: string; value: string } | null>(null)

// 系统字体选择相关
const showSystemFontDialog = ref(false)
const systemFonts = ref<string[]>([])
const loadingSystemFonts = ref(false)
const selectedSystemFont = ref('')

/**
 * 获取系统字体列表
 */
async function loadSystemFonts() {
  loadingSystemFonts.value = true
  try {
    // 使用 document.fonts API 获取已加载的字体
    const fonts = new Set<string>()
    
    // 添加一些常见系统字体
    const commonFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
      'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Trebuchet MS',
      'Comic Sans MS', 'Impact', 'Lucida Console', 'Monaco', 'Consolas',
      'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'STSong',
      'STHeiti', 'STKaiti', 'STFangsong', 'PingFang SC', 'Hiragino Sans GB',
      'Noto Sans CJK SC', 'Source Han Sans CN', 'WenQuanYi Micro Hei',
      'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
      'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    ]
    
    commonFonts.forEach(f => fonts.add(f))
    
    // 尝试使用 queryLocalFonts API（如果可用）
    if ('queryLocalFonts' in window) {
      try {
        const localFonts = await (window as any).queryLocalFonts()
        for (const font of localFonts) {
          fonts.add(font.family)
        }
      } catch (err) {
        console.log('queryLocalFonts not available or denied:', err)
      }
    }
    
    systemFonts.value = Array.from(fonts).sort()
  } catch (err) {
    console.error('Failed to load system fonts:', err)
  } finally {
    loadingSystemFonts.value = false
  }
}

/**
 * 打开系统字体选择弹窗
 */
function openSystemFontDialog() {
  showSystemFontDialog.value = true
  selectedSystemFont.value = settings.settings.fontFamily
  if (systemFonts.value.length === 0) {
    loadSystemFonts()
  }
}

/**
 * 选择系统字体作为默认字体
 */
function selectSystemFont(fontName: string) {
  selectedSystemFont.value = fontName
}

/**
 * 确认设置系统字体
 * 只更新默认字体设置，不立即切换当前字体
 * 如果当前选中的是"默认字体"，则切换字体
 */
function confirmSystemFont() {
  if (selectedSystemFont.value) {
    // 保存默认系统字体设置
    settings.setDefaultSystemFont(selectedSystemFont.value)
    
    // 如果当前选中的是"默认字体"，则切换字体
    if (settings.settings.fontFamily === 'system-ui') {
      settings.setFontFamily(selectedSystemFont.value)
    }
  }
  showSystemFontDialog.value = false
}

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

const isCurrentPageBookmarked = computed(() => {
  if (!reader.currentCfi) return false
  return annotations.bookmarks.some(bm => bm.cfi === reader.currentCfi)
})

onMounted(() => {
  if (reader.currentBook) {
    annotations.loadForBook(reader.currentBook.id)
  }
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('open-search', handleOpenSearch)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('open-search', handleOpenSearch)
  reader.saveProgress()
})

function handleBack() {
  // 通过事件通知 App 执行关闭动画
  window.dispatchEvent(new CustomEvent('book-close-animation'))
}

function handleAddBookmark() {
  if (!reader.currentCfi) return
  const existing = annotations.bookmarks.find(bm => bm.cfi === reader.currentCfi)
  if (existing) {
    annotations.removeBookmark(existing.id)
  } else {
    annotations.addBookmark(
      reader.currentCfi,
      reader.currentChapterTitle,
      ''
    )
  }
}

function handleJumpProgress(fraction: number) {
  const rendition = reader.rendition
  if (!rendition) return
  try {
    if (rendition.goToFraction) {
      rendition.goToFraction(fraction)
    } else if (rendition.goTo) {
      const total = reader.totalLocations
      if (total > 0) {
        const targetLoc = Math.round(fraction * total)
        rendition.goTo(targetLoc)
      }
    }
  } catch (err) {
    console.error('Jump progress failed:', err)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleBack()
  } else if (e.key === 'ArrowLeft') {
    reader.rendition?.prev?.()
  } else if (e.key === 'ArrowRight') {
    reader.rendition?.next?.()
  } else if (e.ctrlKey && e.key === 'b') {
    e.preventDefault()
    handleAddBookmark()
  } else if (e.ctrlKey && e.key === 'f') {
    e.preventDefault()
    sidebarTab.value = 'search'
    if (!reader.sidebarOpen) reader.toggleSidebar()
  }
}

let pendingSearchKeyword = ''

function handleOpenSearch(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail.keyword) {
    pendingSearchKeyword = detail.keyword
    sidebarTab.value = 'search'
    if (!reader.sidebarOpen) reader.toggleSidebar()
    nextTick(() => {
      window.dispatchEvent(new CustomEvent('open-search', {
        detail: { keyword: pendingSearchKeyword }
      }))
      pendingSearchKeyword = ''
    })
  }
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
  // 如果选择的是"默认字体"，使用用户设置的系统字体
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

const fontOptions = computed(() => {
  const defaultName = settings.getDefaultFontDisplayName()
  const options = [{ name: defaultName, value: 'system-ui', isDefault: true }]
  for (const font of settings.customFonts) {
    options.push({ name: font.name, value: font.name, isDefault: false })
  }
  return options
})

/**
 * 判断字体选项是否被选中
 */
function isFontActive(opt: { value: string; isDefault: boolean }): boolean {
  if (opt.isDefault) {
    // 默认字体选项：当 fontFamily 是 'system-ui' 或等于 defaultSystemFont 时都算选中
    const defaultFont = settings.settings.defaultSystemFont
    return settings.settings.fontFamily === 'system-ui' || 
           Boolean(defaultFont && settings.settings.fontFamily === defaultFont)
  }
  return settings.settings.fontFamily === opt.value
}

async function handleExportNotes() {
  const anns = annotations.annotations
  if (anns.length === 0) return

  const chapterMap = new Map<string, typeof anns>()
  for (const ann of anns) {
    const chapter = ann.chapterTitle || '未知章节'
    if (!chapterMap.has(chapter)) {
      chapterMap.set(chapter, [])
    }
    chapterMap.get(chapter)!.push(ann)
  }

  let mdContent = `# ${reader.currentBook?.title || '书籍'} 备注\n\n`
  for (const [chapter, list] of chapterMap) {
    mdContent += `## ${chapter}\n\n`
    list.forEach((ann, idx) => {
      const notePart = ann.note ? `（${ann.note}）` : ''
      mdContent += `- ${idx + 1}、${ann.text}${notePart}\n`
    })
    mdContent += '\n'
  }

  const timestamp = Date.now()
  const bookName = reader.currentBook?.title || '书籍'
  const defaultName = `${bookName}_${timestamp}.md`
  const savedPath = await window.services.saveFile(defaultName, mdContent)
  if (savedPath) {
    await window.services.showItemInFolder(savedPath)
  }
}

// 构建备注 Markdown 内容
function buildNotesMarkdown(): string {
  const anns = annotations.annotations
  const chapterMap = new Map<string, typeof anns>()
  for (const ann of anns) {
    const chapter = ann.chapterTitle || '未知章节'
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, [])
    chapterMap.get(chapter)!.push(ann)
  }

  let mdContent = `# ${reader.currentBook?.title || '书籍'} 备注\n\n`
  for (const [chapter, list] of chapterMap) {
    mdContent += `## ${chapter}\n\n`
    list.forEach((ann, idx) => {
      const notePart = ann.note ? `（${ann.note}）` : ''
      mdContent += `- ${idx + 1}、${ann.text}${notePart}\n`
    })
    mdContent += '\n'
  }
  return mdContent
}

// 发送备注到简记
function handleSendToNote() {
  if (annotations.annotations.length === 0) return
  const mdContent = buildNotesMarkdown()
  const bookTitle = reader.currentBook?.title || '书籍'
  window.dispatchEvent(new CustomEvent('send-to-note', {
    detail: { content: mdContent, bookTitle }
  }))
}

function handleAISearch(text: string) {
  aiSearchText.value = text
  showAISearch.value = true
}

function handleAIHistory() {
  aiSearchText.value = ''
  showAISearch.value = true
}

function handleOpenFloatReader() {
  const rendition = reader.rendition
  if (!rendition) return

  let chapterText = ''
  try {
    const contents = rendition.renderer?.getContents?.()
    if (contents?.length) {
      const doc = contents[0].doc
      chapterText = doc.body?.innerText || doc.body?.textContent || ''
    }
  } catch {}

  if (!chapterText.trim()) return

  const chapterTitle = reader.currentChapterTitle || '当前章节'
  const bookTitle = reader.currentBook?.title || ''
  window.services.createFloatReader(chapterText, bookTitle, chapterTitle, 0.85)
}
</script>

<template>
  <div class="reader" :class="'theme-' + settings.settings.theme">
    <TopBar
      :title="reader.currentBook?.title || ''"
      :chapter="reader.currentChapterTitle"
      :progress="reader.progress"
      :is-bookmarked="isCurrentPageBookmarked"
      @back="handleBack"
      @toggle-sidebar="reader.toggleSidebar"
      @add-bookmark="handleAddBookmark"
      @open-settings="showSettings = !showSettings"
      @open-ai-settings="showAISettings = true"
      @open-ai-history="handleAIHistory"
      @jump-progress="handleJumpProgress"
      @open-float-reader="handleOpenFloatReader"
    />

    <div class="reader-body">
      <div class="reader-sidebar" :class="{ open: reader.sidebarOpen }">
        <div class="sidebar-tabs">
          <button
            v-for="tab in (['toc', 'bookmark', 'note', 'search'] as SidebarTab[])"
            :key="tab"
            class="sidebar-tab"
            :class="{ active: sidebarTab === tab }"
            @click="sidebarTab = tab"
          >
            {{ { toc: '目录', bookmark: '书签', note: '备注', search: '搜索' }[tab] }}
          </button>
        </div>
        <div class="sidebar-content custom-scrollbar">
          <TocPanel v-if="sidebarTab === 'toc'" />
          <BookmarkPanel v-if="sidebarTab === 'bookmark'" />
          <NotePanel v-if="sidebarTab === 'note'" />
          <SearchPanel v-if="sidebarTab === 'search'" />
          <div
            v-if="sidebarTab === 'note' && annotations.annotations.length > 0"
            class="note-actions"
          >
            <button class="export-notes-btn" title="发送到简记" @click="handleSendToNote">
              <FileText :size="14" />
            </button>
            <button class="export-notes-btn" title="导出备注" @click="handleExportNotes">
              <Download :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div class="reader-main">
        <ViewerContainer v-if="reader.currentBook" />
        <PageTurner v-if="settings.settings.readerMode !== 'scroll'" />
      </div>
    </div>

    <SelectionMenu v-if="!showAISearch" @ai-search="handleAISearch" />

    <div v-if="showSettings" class="settings-overlay" @click="showSettings = false">
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
            <button class="upload-font-btn" title="选择系统字体" @click="openSystemFontDialog">
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
    </div>

    <AISettingsDialog v-if="showAISettings" @close="showAISettings = false" />
    <AISearchDialog v-if="showAISearch" :initial-text="aiSearchText" @close="showAISearch = false" />
    <ConfirmDialog
      v-if="showDeleteConfirm"
      title="删除确认"
      :message="`确定删除字体「${pendingDeleteFont?.name}」吗？`"
      @confirm="confirmDeleteFont"
      @cancel="showDeleteConfirm = false; pendingDeleteFont = null"
    />

    <!-- 系统字体选择弹窗 -->
    <div v-if="showSystemFontDialog" class="settings-overlay" @click="showSystemFontDialog = false">
      <div class="system-font-dialog" @click.stop>
        <h3>设置默认字体</h3>
        <div class="system-font-content">
          <div v-if="loadingSystemFonts" class="system-font-loading">
            加载中...
          </div>
          <div v-else class="system-font-list custom-scrollbar">
            <div
              v-for="font in systemFonts"
              :key="font"
              class="system-font-item"
              :class="{ active: selectedSystemFont === font }"
              @click="selectSystemFont(font)"
            >
              <span class="system-font-preview" :style="{ fontFamily: font }">{{ font }}</span>
              <span v-if="selectedSystemFont === font" class="system-font-check">✓</span>
            </div>
          </div>
        </div>
        <div class="system-font-actions">
          <button class="system-font-btn cancel" @click="showSystemFontDialog = false">取消</button>
          <button class="system-font-btn confirm" @click="confirmSystemFont">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reader {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--reader-bg);
  color: var(--reader-text);
}

.reader-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.reader-sidebar {
  width: 0;
  overflow: hidden;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: width 0.25s ease;
  display: flex;
  flex-direction: column;

  &.open {
    width: 260px;
  }
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.sidebar-tab {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;

  &.active {
    color: var(--accent-color);
    border-bottom-color: var(--accent-color);
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  position: relative;
}

.note-actions {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.export-notes-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--reader-bg);
  color: var(--reader-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.08) translateY(-2px);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.3),
      0 3px 6px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  &:active {
    transform: scale(0.95) translateY(0);
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.15),
      inset 0 1px 2px rgba(0, 0, 0, 0.1);
  }
}
</style>

<style lang="scss">
.reader-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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