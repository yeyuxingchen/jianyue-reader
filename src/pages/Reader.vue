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
import ReaderSettingsPanel from '@/components/reader/ReaderSettingsPanel.vue'
import TocPanel from '@/components/sidebar/TocPanel.vue'
import BookmarkPanel from '@/components/sidebar/BookmarkPanel.vue'
import NotePanel from '@/components/sidebar/NotePanel.vue'
import SearchPanel from '@/components/sidebar/SearchPanel.vue'
import { Download, FileText } from 'lucide-vue-next'
import type { SidebarTab } from '@/types'

const reader = useReaderStore()
const settings = useSettingsStore()
const annotations = useAnnotationsStore()

const sidebarTab = ref<SidebarTab>('toc')
const showSettings = ref(false)
const showAISettings = ref(false)
const showAISearch = ref(false)
const aiSearchText = ref('')

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

async function handleExportNotes() {
  if (annotations.annotations.length === 0) return

  const mdContent = buildNotesMarkdown()

  const timestamp = Date.now()
  const bookName = reader.currentBook?.title || '书籍'
  const defaultName = `${bookName}_${timestamp}.md`
  const savedPath = await window.services.saveFile(defaultName, mdContent)
  if (savedPath) {
    await window.services.showItemInFolder(savedPath)
  }
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

    <ReaderSettingsPanel v-model:visible="showSettings" />

    <AISettingsDialog v-if="showAISettings" @close="showAISettings = false" />
    <AISearchDialog v-if="showAISearch" :initial-text="aiSearchText" @close="showAISearch = false" />
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
</style>
