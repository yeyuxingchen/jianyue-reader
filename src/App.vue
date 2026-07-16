<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useReaderStore } from '@/stores/reader'
import { useSettingsStore } from '@/stores/settings'
import { useAppModeStore } from '@/stores/appMode'
import { useNoteEditorStore } from '@/stores/appMode'
import { useBookAnimation } from '@/composables/useBookAnimation'
import { useExternalFileOpen } from '@/composables/useExternalFileOpen'
import FloatNote from '@/pages/FloatNote.vue'
import FloatReader from '@/pages/FloatReader.vue'
import TitleBar from '@/components/common/TitleBar.vue'
import Toast from '@/components/common/Toast.vue'

// 检测浮窗模式
const floatMode = new URLSearchParams(window.location.search).get('float')

const route = useRoute()
const reader = useReaderStore()
const settings = useSettingsStore()
const appModeStore = useAppModeStore()
const noteEditorStore = useNoteEditorStore()

// 使用 composables
const {
  animating,
  animDirection,
  animPhase,
  animCoverUrl,
  animBookTitle,
  flyStyle,
  startBookOpenAnimation,
  startBookCloseAnimation,
} = useBookAnimation()

// 简记编辑器引用
const noteEditorRef = ref<any>(null)

onMounted(() => {
  settings.loadSettings()
  appModeStore.loadMode()

  // 监听打开书籍动画事件
  window.addEventListener('book-open-animation', ((e: CustomEvent) => {
    const { bookId, coverUrl, rect, title } = e.detail
    startBookOpenAnimation(bookId, coverUrl, rect, title)
  }) as EventListener)

  // 监听关闭书籍动画事件
  window.addEventListener('book-close-animation', (() => {
    startBookCloseAnimation()
  }) as EventListener)

  // 监听简记模式文件操作事件
  window.addEventListener('note-new-file', () => noteEditorRef.value?.handleNewFile())
  window.addEventListener('note-open-file', () => noteEditorRef.value?.handleOpenFile())
  window.addEventListener('note-save-file', () => noteEditorRef.value?.handleSaveFile())
  window.addEventListener('note-save-as-file', () => noteEditorRef.value?.handleSaveAsFile())
  window.addEventListener('note-open-history', ((e: CustomEvent) => {
    noteEditorRef.value?.handleOpenFromHistory(e.detail)
  }) as EventListener)

  // 监听"发送备注到简记"事件
  window.addEventListener('send-to-note', handleSendToNote)
})

onBeforeUnmount(() => {
  window.removeEventListener('note-new-file', () => {})
  window.removeEventListener('note-open-file', () => {})
  window.removeEventListener('note-save-file', () => {})
  window.removeEventListener('note-save-as-file', () => {})
  window.removeEventListener('send-to-note', handleSendToNote)
  window.removeEventListener('note-open-history', () => {})
})

// 处理"发送备注到简记"
async function handleSendToNote(e: Event) {
  const { content, bookTitle } = (e as CustomEvent).detail
  // 切换到简记模式
  appModeStore.switchToNote()
  // 等待 NoteEditor 组件挂载
  await nextTick()
  // 将内容填入编辑器
  if (noteEditorRef.value) {
    await noteEditorRef.value.receiveContent(content, bookTitle || '书籍')
  }
}

// 判断是否为浮动窗口模式
const isFloat = floatMode === 'reader' || floatMode === 'note'

// 判断是否为简记模式（基于路由或 appMode）
const isNoteMode = () => appModeStore.isNoteMode || route.name === 'note'
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
            :ref="(el: any) => {
              if (currentRoute.name === 'note') noteEditorRef = el
            }"
          />
        </keep-alive>
      </router-view>

      <!-- ===== 打开动画 ===== -->
      <div v-if="animating && animDirection === 'open'" class="book-anim-overlay">
        <!-- Phase 1: 封面飞到中央 -->
        <div
          v-if="animPhase === 'fly'"
          class="book-anim-cover fly-phase"
          :style="flyStyle"
        >
          <img v-if="animCoverUrl" :src="animCoverUrl" class="cover-fly-img" />
          <div v-else class="cover-fly-placeholder">{{ animBookTitle }}</div>
        </div>

        <!-- Phase 2: 翻书展开 -->
        <div v-if="animPhase === 'open'" class="book-anim-open">
          <div class="book-3d-scene">
            <div class="book-3d">
              <div class="book-page book-page-left">
                <img v-if="animCoverUrl" :src="animCoverUrl" class="page-img" />
                <div v-else class="page-placeholder">{{ animBookTitle }}</div>
              </div>
              <div class="book-page book-page-right">
                <div class="page-lines">
                  <div class="fake-line" v-for="i in 8" :key="i" :style="{ width: (60 + Math.random() * 30) + '%', animationDelay: i * 0.03 + 's' }"></div>
                </div>
              </div>
              <div class="book-page book-page-flip">
                <img v-if="animCoverUrl" :src="animCoverUrl" class="page-img" />
                <div v-else class="page-placeholder">{{ animBookTitle }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 3: 全屏淡入 -->
        <div v-if="animPhase === 'fade'" class="book-anim-fade"></div>
      </div>

      <!-- ===== 关闭动画 ===== -->
      <div v-if="animating && animDirection === 'close'" class="book-anim-overlay">
        <!-- Phase 1: 阅读器淡出 -->
        <div v-if="animPhase === 'unfade'" class="book-anim-unfade"></div>

        <!-- Phase 2: 合书 -->
        <div v-if="animPhase === 'close-book'" class="book-anim-close-book">
          <div class="book-3d-scene">
            <div class="book-3d">
              <div class="book-page book-page-left-close">
                <img v-if="animCoverUrl" :src="animCoverUrl" class="page-img" />
                <div v-else class="page-placeholder">{{ animBookTitle }}</div>
              </div>
              <div class="book-page book-page-right-close">
                <div class="page-lines-close">
                  <div class="fake-line-close" v-for="i in 6" :key="i" :style="{ width: (50 + Math.random() * 40) + '%' }"></div>
                </div>
              </div>
              <div class="book-page book-page-flip-close">
                <img v-if="animCoverUrl" :src="animCoverUrl" class="page-img" />
                <div v-else class="page-placeholder">{{ animBookTitle }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 3: 封面飞回书架 -->
        <div
          v-if="animPhase === 'fly-back'"
          class="book-anim-cover fly-back-phase"
          :style="flyStyle"
        >
          <img v-if="animCoverUrl" :src="animCoverUrl" class="cover-fly-img" />
          <div v-else class="cover-fly-placeholder">{{ animBookTitle }}</div>
        </div>
      </div>
    </div><!-- /app-content -->
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

.book-anim-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

/* ==================== 打开动画 ==================== */

/* Phase 1: 封面飞到中央 */
.fly-phase {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 268px;
  transform: translate(-50%, -50%);
  will-change: top, left, width, height, transform;
  animation: flyToCenter 250ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.cover-fly-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fly-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  padding: 16px;
  text-align: center;
  line-height: 1.4;
}

@keyframes flyToCenter {
  0% {
    top: var(--start-y);
    left: var(--start-x);
    width: var(--start-w);
    height: var(--start-h);
    transform: translate(-50%, -50%);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  100% {
    top: 50%;
    left: 50%;
    width: 200px;
    height: 268px;
    transform: translate(-50%, -50%);
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
}

/* Phase 2: 翻书展开 */
.book-anim-open {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  animation: fadeInBg 120ms ease forwards;
}

@keyframes fadeInBg {
  from { background: transparent; }
  to { background: rgba(0, 0, 0, 0.15); }
}

.book-3d-scene {
  perspective: 1200px;
  width: 380px;
  height: 268px;
}

.book-3d {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.book-page {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 2px;
  overflow: hidden;
}

.book-page-left {
  left: 0;
  background: var(--bg-secondary);
  border-radius: 4px 0 0 4px;
  box-shadow: inset -2px 0 8px rgba(0,0,0,0.1);
}

.book-page-right {
  right: 0;
  background: var(--bg-secondary);
  border-radius: 0 4px 4px 0;
  padding: 24px 20px;
  box-shadow: inset 2px 0 8px rgba(0,0,0,0.06);
}

.book-page-flip {
    left: 0;
    transform-origin: left center;
    transform: rotateY(0deg);
    will-change: transform;
    animation: flipPage 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  border-radius: 4px 0 0 4px;
  z-index: 2;
}

.page-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  padding: 12px;
  text-align: center;
  line-height: 1.4;
}

@keyframes flipPage {
  0% {
    transform: rotateY(0deg);
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  }
  40% {
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.3);
  }
  100% {
    transform: rotateY(-170deg);
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  }
}

.page-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.fake-line {
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  opacity: 0;
  animation: lineAppear 180ms ease forwards;
}

@keyframes lineAppear {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Phase 3: 全屏淡入 */
.book-anim-fade {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  animation: fadeInCover 200ms ease forwards;
}

@keyframes fadeInCover {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ==================== 关闭动画 ==================== */

/* Phase 1: 阅读器淡出 */
.book-anim-unfade {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  will-change: opacity;
  animation: unfadeCover 180ms ease forwards;
}

@keyframes unfadeCover {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Phase 2: 合书 */
.book-anim-close-book {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  animation: fadeOutBg 120ms ease forwards;
}

@keyframes fadeOutBg {
  from { background: var(--bg-primary); }
  to { background: rgba(0, 0, 0, 0.15); }
}

.book-page-left-close {
  left: 0;
  background: var(--bg-secondary);
  border-radius: 4px 0 0 4px;
  box-shadow: inset -2px 0 8px rgba(0,0,0,0.1);
}

.book-page-right-close {
  right: 0;
  background: var(--bg-secondary);
  border-radius: 0 4px 4px 0;
  padding: 24px 20px;
  box-shadow: inset 2px 0 8px rgba(0,0,0,0.06);
}

.book-page-flip-close {
    left: 0;
    transform-origin: left center;
    transform: rotateY(-170deg);
    will-change: transform;
    animation: flipPageClose 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px 0 0 4px;
  z-index: 2;
}

@keyframes flipPageClose {
  0% {
    transform: rotateY(-170deg);
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  }
  60% {
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.3);
  }
  100% {
    transform: rotateY(0deg);
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
  }
}

.page-lines-close {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

.fake-line-close {
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  animation: lineDisappear 150ms ease forwards;
}

@keyframes lineDisappear {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(10px);
  }
}

/* Phase 3: 封面飞回书架 */
.fly-back-phase {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 268px;
  transform: translate(-50%, -50%);
  will-change: top, left, width, height, transform;
  animation: flyBackToShelf 250ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

@keyframes flyBackToShelf {
  0% {
    top: 50%;
    left: 50%;
    width: 200px;
    height: 268px;
    transform: translate(-50%, -50%);
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
  100% {
    top: var(--start-y);
    left: var(--start-x);
    width: var(--start-w);
    height: var(--start-h);
    transform: translate(-50%, -50%);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

/* ==================== 路由过渡 ==================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
