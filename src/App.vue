<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, nextTick, type ComponentPublicInstance } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAppModeStore } from '@/stores/appMode'
import FloatNote from '@/pages/FloatNote.vue'
import FloatReader from '@/pages/FloatReader.vue'
import TitleBar from '@/components/common/TitleBar.vue'
import Toast from '@/components/common/Toast.vue'
import BookAnimationOverlay from '@/components/common/BookAnimationOverlay.vue'

// 检测浮窗模式
const floatMode = new URLSearchParams(window.location.search).get('float')

const settings = useSettingsStore()
const appModeStore = useAppModeStore()

// 简记编辑器暴露的方法契约（对应 NoteEditor.vue 的 defineExpose）
interface NoteEditorExpose {
  handleNewFile: () => Promise<void>
  handleOpenFile: () => Promise<void>
  handleSaveFile: () => Promise<void>
  handleSaveAsFile: () => Promise<void>
  receiveContent: (content: string, bookTitle: string) => Promise<void>
  handleOpenFromHistory: (filePath: string) => Promise<void>
}

// 简记编辑器引用
const noteEditorRef = ref<NoteEditorExpose | null>(null)

// 简记模式文件操作事件处理（具名引用，确保 onBeforeUnmount 能正确移除）
const handleNoteNewFile = () => noteEditorRef.value?.handleNewFile()
const handleNoteOpenFile = () => noteEditorRef.value?.handleOpenFile()
const handleNoteSaveFile = () => noteEditorRef.value?.handleSaveFile()
const handleNoteSaveAsFile = () => noteEditorRef.value?.handleSaveAsFile()
const handleNoteOpenHistory = ((e: CustomEvent) => {
  noteEditorRef.value?.handleOpenFromHistory(e.detail)
}) as EventListener

async function handleSendToNote(e: Event) {
  const { content, bookTitle } = (e as CustomEvent).detail
  appModeStore.switchToNote()
  await nextTick()
  if (noteEditorRef.value) {
    await noteEditorRef.value.receiveContent(content, bookTitle || '书籍')
  }
}

onMounted(() => {
  settings.loadSettings()
  appModeStore.loadMode()

  window.addEventListener('note-new-file', handleNoteNewFile)
  window.addEventListener('note-open-file', handleNoteOpenFile)
  window.addEventListener('note-save-file', handleNoteSaveFile)
  window.addEventListener('note-save-as-file', handleNoteSaveAsFile)
  window.addEventListener('note-open-history', handleNoteOpenHistory)
  window.addEventListener('send-to-note', handleSendToNote)
})

onBeforeUnmount(() => {
  window.removeEventListener('note-new-file', handleNoteNewFile)
  window.removeEventListener('note-open-file', handleNoteOpenFile)
  window.removeEventListener('note-save-file', handleNoteSaveFile)
  window.removeEventListener('note-save-as-file', handleNoteSaveAsFile)
  window.removeEventListener('note-open-history', handleNoteOpenHistory)
  window.removeEventListener('send-to-note', handleSendToNote)
})
</script>

<template>
  <!-- 浮窗阅读模式 -->
  <FloatReader v-if="floatMode === 'reader'" />

  <!-- 浮窗笔记模式 -->
  <FloatNote v-else-if="floatMode === 'note'" />

  <!-- 正常应用模式 -->
  <div v-else class="app-root" :class="'theme-' + settings.settings.theme">
    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- 全局 Toast -->
    <Toast />

    <!-- 主内容区 -->
    <div class="app-content">
      <!-- 使用 router-view 渲染页面，使用 keep-alive 缓存组件 -->
      <router-view v-slot="{ Component, route: currentRoute }">
        <keep-alive>
          <component
            :is="Component"
            :ref="(el: ComponentPublicInstance | null) => {
              if (currentRoute.name === 'note') noteEditorRef = el as unknown as NoteEditorExpose
            }"
          />
        </keep-alive>
      </router-view>

      <!-- 书架 ↔ 阅读器 打开/关闭动画 -->
      <BookAnimationOverlay />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-root {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
