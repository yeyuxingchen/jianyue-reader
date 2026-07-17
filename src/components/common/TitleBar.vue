<script lang="ts" setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useLibraryStore } from '@/stores/library'
import { useToastStore } from '@/stores/toast'
import { useAppModeStore, useNoteEditorStore } from '@/stores/appMode'
import { useNoteSidebarStore } from '@/stores/noteSidebar'
import { Minus, Square, X, Copy } from 'lucide-vue-next'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'
import type { ThemeMode } from '@/types'

const settings = useSettingsStore()
const library = useLibraryStore()
const toast = useToastStore()
const appModeStore = useAppModeStore()
const noteStore = useNoteEditorStore()
const sidebar = useNoteSidebarStore()

const unsavedDialog = reactive({
  visible: false,
  message: '',
  _resolve: null as ((result: string) => void) | null,
})

const themeList: ThemeMode[] = [
  'parchment', 'bamboo', 'sand', 'sky', 'nightgreen', 'inkgold',
  'deepsea', 'candle', 'softwhite', 'purewhite', 'lavender', 'charcoal', 'eyeguard'
]

const themeNames: Record<ThemeMode, string> = {
  parchment: '羊皮纸',
  bamboo: '竹青',
  sand: '沙漠',
  sky: '天空',
  nightgreen: '暗夜绿',
  inkgold: '墨金',
  deepsea: '深海',
  candle: '烛光',
  softwhite: '柔白',
  purewhite: '纯白',
  lavender: '薰衣草',
  charcoal: '炭黑',
  eyeguard: '护眼',
}

const isMaximized = ref(false)

// ===== 图标点击切换模式 =====
async function toggleMode() {
  // 如果 NoteEditor 的未保存对话框已经在显示，不重复弹出，直接返回
  if ((window as any).__unsavedDialogVisible) return

  // 如果当前是简记模式，切换到简阅模式前检查未保存的更改
  if (appModeStore.isNoteMode) {
    const hasUnsavedChanges = noteStore.isModified || !noteStore.currentFilePath
    if (hasUnsavedChanges) {
      const result = await showUnsavedDialog()
      if (result === 'save') {
        if (!noteStore.currentFilePath) {
          // 临时文件：使用“另存为”
          if ((window as any).__noteEditorSaveAs) {
            await (window as any).__noteEditorSaveAs()
          }
        } else {
          // 已有文件：直接保存
          if ((window as any).__noteEditorSave) {
            await (window as any).__noteEditorSave()
          }
        }
        noteStore.markSaved()
        noteStore.clearDraft()
      } else if (result === 'discard') {
        noteStore.markSaved()
        noteStore.clearDraft()
      } else {
        return
      }
    }
    appModeStore.switchToReader()
  } else {
    appModeStore.switchToNote()
  }
}

function showUnsavedDialog(): Promise<string> {
  return new Promise((resolve) => {
    unsavedDialog.message = noteStore.currentFilePath
      ? '当前文件已修改但尚未保存，是否保存？'
      : '当前文件是临时文件，尚未保存到磁盘，是否保存？'
    unsavedDialog.visible = true
    unsavedDialog._resolve = resolve
  })
}

function onTitleBarUnsavedResolve(result: string) {
  unsavedDialog.visible = false
  unsavedDialog._resolve?.(result)
  unsavedDialog._resolve = null
}

// ===== 菜单定义 =====
interface SubmenuItem {
  label: string
  value: string
}

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
  submenu?: SubmenuItem[]
  submenuType?: 'theme' | 'imageFormat' | 'recentFiles'
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

const imageFormat = ref<string>('base64')

function loadImageFormat() {
  const saved = window.electronAPI?.store.get('note:imageFormat')
  if (saved === 'path' || saved === 'base64') {
    imageFormat.value = saved
  }
}

function setImageFormat(format: string) {
  imageFormat.value = format
  window.electronAPI?.store.set('note:imageFormat', format)
  toast.show(format === 'base64' ? '图片存储: Base64格式' : '图片存储: 路径缓存')
}

// 根据当前模式动态构建菜单（确保函数引用有效）
const menus = computed<MenuGroup[]>(() => {
  if (appModeStore.isNoteMode) {
    return [
      {
        label: '文件',
        items: [
          { label: '新建文件', shortcut: 'Ctrl+N', action: handleNewFile },
          { label: '打开文件...', shortcut: 'Ctrl+O', action: handleOpenFile },
          {
            label: '最近的文件',
            submenuType: 'recentFiles',
            submenu: sidebar.history.slice(0, 10).map(h => ({ label: h.fileName, value: h.filePath })),
            disabled: sidebar.history.length === 0,
          },
          { divider: true, label: '' },
          { label: '创建epub目录', action: handleCreateEpubDirectory },
          { label: '打开epub目录...', action: handleOpenEpubDirectory },
          { divider: true, label: '' },
          { label: '保存', shortcut: 'Ctrl+S', action: handleSaveFile },
          { label: '另存为...', shortcut: 'Ctrl+Shift+S', action: handleSaveAsFile },
          { divider: true, label: '' },
          { label: '退出', shortcut: 'Alt+F4', action: handleQuit },
        ],
      },
      {
        label: '编辑',
        items: [
          { label: '撤销', shortcut: 'Ctrl+Z', action: handleUndo },
          { label: '重做', shortcut: 'Ctrl+Shift+Z', action: handleRedo },
          { divider: true, label: '' },
          { label: '复制', shortcut: 'Ctrl+C', action: handleCopy },
          { label: '粘贴', shortcut: 'Ctrl+V', action: handlePaste },
          { divider: true, label: '' },
          {
            label: '图片存储格式',
            submenuType: 'imageFormat',
            submenu: [
              { label: 'Base64格式', value: 'base64' },
              { label: '路径缓存', value: 'path' },
            ],
          },
          { divider: true, label: '' },
          { label: '全选', shortcut: 'Ctrl+A', action: handleSelectAll },
        ],
      },
      {
        label: '视图',
        items: [
          {
            label: '切换主题',
            submenuType: 'theme',
            submenu: themeList.map(t => ({ label: themeNames[t], value: t })),
          },
          { divider: true, label: '' },
          { label: '重新加载', shortcut: 'Ctrl+R', action: reload },
          { label: '开发者工具', shortcut: 'F12', action: toggleDevTools },
        ],
      },
      {
        label: '帮助',
        items: [
          { label: '打开缓存', action: openCacheFolder },
          { divider: true, label: '' },
          { label: '关于简记', action: showAbout },
        ],
      },
    ]
  }

  return [
    {
      label: '文件',
      items: [
        { label: '导入书籍...', shortcut: 'Ctrl+O', action: handleImport },
        { label: '导入文件夹...', action: handleImportFolder },
        { divider: true, label: '' },
        { label: '退出', shortcut: 'Alt+F4', action: handleQuit },
      ],
    },
    {
      label: '编辑',
      items: [
        { label: '复制', shortcut: 'Ctrl+C', action: handleCopy },
        { label: '粘贴', shortcut: 'Ctrl+V', action: handlePaste },
        { divider: true, label: '' },
        { label: '全选', shortcut: 'Ctrl+A', action: handleSelectAll },
      ],
    },
    {
      label: '视图',
      items: [
        {
          label: '切换主题',
          submenu: themeList.map(t => ({ label: themeNames[t], value: t })),
        },
        { label: '增大字体', shortcut: 'Ctrl++', action: () => adjustFontSize(2) },
        { label: '减小字体', shortcut: 'Ctrl+-', action: () => adjustFontSize(-2) },
        { label: '重置字体', shortcut: 'Ctrl+0', action: () => resetFontSize() },
        { divider: true, label: '' },
        { label: '重新加载', shortcut: 'Ctrl+R', action: reload },
        { label: '开发者工具', shortcut: 'F12', action: toggleDevTools },
      ],
    },
    {
      label: '帮助',
      items: [
        { label: '打开缓存', action: openCacheFolder },
        { divider: true, label: '' },
        { label: '关于简阅', action: showAbout },
      ],
    },
  ]
})

// ===== 菜单状态 =====
const activeMenuIndex = ref(-1)
const isMenuOpen = ref(false)
const activeSubmenuIndex = ref(-1)

function openMenu(index: number) {
  activeMenuIndex.value = index
  isMenuOpen.value = true
  activeSubmenuIndex.value = -1
}

function closeMenu() {
  activeMenuIndex.value = -1
  isMenuOpen.value = false
  activeSubmenuIndex.value = -1
}

function toggleMenu(index: number) {
  if (isMenuOpen.value && activeMenuIndex.value === index) {
    closeMenu()
  } else {
    openMenu(index)
  }
}

function onMenuHover(index: number) {
  if (isMenuOpen.value) {
    activeMenuIndex.value = index
  }
}

function onMenuClick(item: MenuItem) {
  if (item.disabled) return
  if (item.submenu) return
  closeMenu()
  item.action?.()
}

function onSubmenuHover(index: number) {
  const item = menus.value[activeMenuIndex.value]?.items[index]
  if (item?.disabled) {
    activeSubmenuIndex.value = -1
    return
  }
  activeSubmenuIndex.value = index
}

function selectTheme(theme: ThemeMode) {
  settings.setTheme(theme)
  toast.show(`主题: ${themeNames[theme]}`)
  closeMenu()
}

function onSelectSubmenu(item: MenuItem, sub: SubmenuItem) {
  if (item.submenuType === 'imageFormat') {
    setImageFormat(sub.value)
  } else if (item.submenuType === 'recentFiles') {
    window.dispatchEvent(new CustomEvent('note-open-history', { detail: sub.value }))
  } else {
    selectTheme(sub.value as ThemeMode)
  }
  closeMenu()
}

function isSubmenuActive(item: MenuItem, sub: SubmenuItem): boolean {
  if (item.submenuType === 'imageFormat') return imageFormat.value === sub.value
  if (item.submenuType === 'recentFiles') return false
  return settings.settings.theme === sub.value
}

// 点击外部关闭菜单
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.menu-bar') && !target.closest('.menu-dropdown') && !target.closest('.menu-submenu')) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  loadImageFormat()
  if (window.electronAPI?.window) {
    window.electronAPI.window.isMaximized().then((v: boolean) => {
      isMaximized.value = v
    })
    window.electronAPI.window.setupMaximizeListener()
    window.electronAPI.window.onMaximizeChange((v: boolean) => {
      isMaximized.value = v
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

// ===== 窗口控制 =====
function minimize() {
  window.electronAPI?.window.minimize()
}

function maximize() {
  window.electronAPI?.window.maximize()
}

function close() {
  window.electronAPI?.window.close()
}

// ===== 简阅菜单动作 =====
async function handleImport() {
  try {
    const filePaths = await window.services.showFilePicker()
    if (filePaths && filePaths.length > 0) {
      const beforeCount = library.books.length
      await library.importBook(filePaths)
      const newCount = library.books.length - beforeCount
      if (newCount > 0) {
        toast.show(`成功导入 ${newCount} 本书籍`)
      } else {
        toast.show('所选书籍已在书架中')
      }
    }
  } catch (err) {
    console.error('导入书籍失败:', err)
    toast.show('导入失败，请重试')
    library.isLoading = false
  }
}

async function handleImportFolder() {
  try {
    const folderPath = await window.electronAPI?.dialog.showFolderPicker()
    if (!folderPath) return
    const files = await scanFolderForBooks(folderPath)
    if (files.length > 0) {
      const beforeCount = library.books.length
      await library.importBook(files)
      const newCount = library.books.length - beforeCount
      if (newCount > 0) {
        toast.show(`成功导入 ${newCount} 本书籍`)
      } else {
        toast.show('所选书籍已在书架中')
      }
    } else {
      toast.show('该文件夹中未找到电子书文件')
    }
  } catch (err) {
    console.error('导入文件夹失败:', err)
    toast.show('导入文件夹失败')
  }
}

async function scanFolderForBooks(folderPath: string): Promise<string[]> {
  const result = await window.electronAPI?.fs.scanFolder(folderPath)
  return result || []
}

function handleQuit() {
  window.electronAPI?.window.close()
}

// ===== 编辑菜单 =====
async function handleCopy() {
  const selection = window.getSelection()?.toString()
  if (selection) {
    await window.electronAPI?.clipboard.writeText(selection)
    toast.show('已复制到剪贴板')
  } else {
    toast.show('没有选中文本')
  }
}

async function handlePaste() {
  try {
    const text = await window.electronAPI?.clipboard.readText()
    if (text) {
      document.execCommand('insertText', false, text)
      toast.show('已粘贴')
    } else {
      toast.show('剪贴板为空')
    }
  } catch {
    toast.show('粘贴失败')
  }
}

function handleSelectAll() {
  document.execCommand('selectAll')
}

// 简记模式编辑菜单
function handleUndo() {
  document.execCommand('undo')
}

function handleRedo() {
  document.execCommand('redo')
}

// ===== 视图菜单 =====
function adjustFontSize(delta: number) {
  const current = settings.settings.fontSize || 16
  const newSize = current + delta
  settings.setFontSize(newSize)
  const clamped = Math.max(14, Math.min(24, newSize))
  toast.show(`字号: ${clamped}px`)
}

function resetFontSize() {
  settings.setFontSize(16)
  toast.show('字号已重置')
}

function reload() {
  location.reload()
}

function toggleDevTools() {
  window.electronAPI?.devTools.toggle()
}

// ===== 帮助菜单 =====
function openCacheFolder() {
  window.electronAPI?.app.openCacheFolder()
}

async function showAbout() {
  let version = '1.0.0'
  try {
    version = await window.electronAPI?.app.getVersion() || '1.0.0'
  } catch {}
  const appName = appModeStore.isNoteMode ? '简记' : '简阅'
  const desc = appModeStore.isNoteMode ? '简洁优雅的 Markdown 编辑器' : '简洁优雅的电子书阅读器'
  toast.show(`${appName} v${version} — ${desc}`, 3000)
}

// ===== 简记模式文件菜单动作 =====
async function handleNewFile() {
  window.dispatchEvent(new CustomEvent('note-new-file'))
}

async function handleOpenFile() {
  window.dispatchEvent(new CustomEvent('note-open-file'))
}

async function handleSaveFile() {
  window.dispatchEvent(new CustomEvent('note-save-file'))
}

async function handleSaveAsFile() {
  window.dispatchEvent(new CustomEvent('note-save-as-file'))
}

/**
 * 创建 epub 目录（特殊目录）。
 * 1. 先弹出文件夹选择器，让用户选 epub 目录的父位置
 * 2. 在所选目录下创建名为 "epub" 的子目录
 * 3. 创建成功后：
 *    - 授权该 epub 目录
 *    - 自动打开文件目录面板
 *    - 将根目录切换为 epub 目录本身（这样它就在根级别展示）
 *    - 选中新创建的 epub 目录
 */
async function handleCreateEpubDirectory() {
  try {
    // 1. 弹出文件夹选择器，让用户选父目录
    const parentDir = await window.electronAPI?.dialog.showFolderPicker()
    if (!parentDir) return

    // 2. 授权父目录（创建子目录需要先授权父目录）
    await window.electronAPI?.security.addAuthorizedDir(parentDir)

    // 3. 在所选目录下创建 epub 目录
    const result = await window.services.createEpubDirectory(parentDir)
    if (!result) {
      toast.show('创建失败')
      return
    }
    toast.show('已创建 epub 目录')

    // 4. 授权 epub 目录本身（后续需要扫描该目录）
    await window.electronAPI?.security.addAuthorizedDir(result.path)

    // 5. 自动打开文件目录面板并把根目录切换到 epub 目录本身
    sidebar.setFileTreeRoot(result.path)
    sidebar.selectNode(result.path)
    sidebar.togglePanel('files')
    await sidebar.refreshFileTree()
    // 通知编辑器清空内容（类似新建未保存文件的状态）
    window.dispatchEvent(new CustomEvent('note-reset-editor'))
  } catch (err: any) {
    console.error('创建 epub 目录失败:', err)
    toast.show(err?.message || '创建失败')
  }
}

/**
 * 打开已有的 epub 目录：选择文件夹后切换文件树根到该目录。
 * 选中目录名不要求为 "epub"（兼容用户已有的小说项目目录）。
 */
async function handleOpenEpubDirectory() {
  try {
    const dirPath = await window.electronAPI?.dialog.showFolderPicker()
    if (!dirPath) return

    await window.electronAPI?.security.addAuthorizedDir(dirPath)
    sidebar.setFileTreeRoot(dirPath)
    sidebar.selectNode(dirPath)
    sidebar.togglePanel('files')
    await sidebar.refreshFileTree()
    sidebar.addToHistory(dirPath)
    toast.show('已打开目录')
  } catch (err: any) {
    console.error('打开 epub 目录失败:', err)
    toast.show(err?.message || '打开失败')
  }
}
</script>

<template>
  <div class="title-bar" style="-webkit-app-region: drag">
    <!-- 左侧：应用图标（点击切换模式） -->
    <div class="title-bar-left" style="-webkit-app-region: no-drag">
      <div class="app-icon-trigger" @click="toggleMode" :title="appModeStore.isNoteMode ? '切换到简阅' : '切换到简记'">
        <img src="/logo.png" alt="简阅" class="app-logo" />
      </div>
    </div>

    <!-- 中间：菜单栏 -->
    <div class="menu-bar" style="-webkit-app-region: no-drag">
      <div
        v-for="(menu, index) in menus"
        :key="appModeStore.appMode + '-' + menu.label"
        class="menu-item"
        :class="{ active: activeMenuIndex === index && isMenuOpen }"
        @mousedown.stop="toggleMenu(index)"
        @mouseenter="onMenuHover(index)"
      >
        <span class="menu-label">{{ menu.label }}</span>

        <!-- 下拉菜单 -->
        <Transition name="menu-fade">
          <div
            v-if="activeMenuIndex === index && isMenuOpen"
            class="menu-dropdown"
          >
            <template v-for="(item, i) in menu.items" :key="i">
              <div v-if="item.divider" class="menu-divider" />
              <div
                v-else
                class="menu-dropdown-item"
                :class="{ disabled: item.disabled, 'has-submenu': item.submenu, 'submenu-active': activeSubmenuIndex === i }"
                @mousedown.stop.prevent="onMenuClick(item)"
                @mouseenter="item.submenu ? onSubmenuHover(i) : undefined"
              >
                <span class="menu-dropdown-label">{{ item.label }}</span>
                <span v-if="item.shortcut" class="menu-dropdown-shortcut">{{ item.shortcut }}</span>
                <span v-if="item.submenu" class="menu-dropdown-arrow">›</span>

                <!-- 二级子菜单 -->
                <Transition name="menu-fade">
                  <div
                    v-if="item.submenu && activeSubmenuIndex === i"
                    class="menu-submenu custom-scrollbar-compact"
                  >
                    <div
                      v-for="sub in item.submenu"
                      :key="sub.value"
                      class="menu-submenu-item"
                      :class="{ active: isSubmenuActive(item, sub) }"
                      @mousedown.stop.prevent="onSelectSubmenu(item, sub)"
                    >
                      <span v-if="item.submenuType !== 'recentFiles'" class="menu-submenu-check">{{ isSubmenuActive(item, sub) ? '✓' : '' }}</span>
                      <span class="menu-submenu-label">{{ sub.label }}</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 可拖拽的间隔区域 -->
    <div class="title-bar-spacer" style="-webkit-app-region: drag"></div>

    <!-- 右侧：窗口控制按钮 -->
    <div class="window-controls" style="-webkit-app-region: no-drag;">
      <button class="window-btn minimize" @click="minimize" title="最小化">
        <Minus :size="14" />
      </button>
      <button class="window-btn maximize" @click="maximize" :title="isMaximized ? '还原' : '最大化'">
        <template v-if="isMaximized">
          <Copy :size="12" />
        </template>
        <template v-else>
          <Square :size="12" />
        </template>
      </button>
      <button class="window-btn close" @click="close" title="关闭">
        <X :size="14" />
      </button>
    </div>
  </div>

  <!-- 未保存更改对话框 -->
  <UnsavedChangesDialog
    v-if="unsavedDialog.visible"
    :message="unsavedDialog.message"
    @save="onTitleBarUnsavedResolve('save')"
    @discard="onTitleBarUnsavedResolve('discard')"
    @cancel="onTitleBarUnsavedResolve('cancel')"
  />
</template>

<style lang="scss" scoped>
.title-bar {
  display: flex;
  align-items: center;
  height: 32px;
  // 使用主题专属的 chrome 色阶（--bg-chrome），保留主题色相、干净不灰，
  // 与下方编辑区（bg-secondary，最浅）及面板（bg-primary，中间）形成清晰层次
  background: var(--bg-chrome);
  // 去掉底边框，改用底部投影与页面内容区分层次
  box-shadow: 0 1px 5px -1px rgba(0, 0, 0, 0.14);
  user-select: none;
  flex-shrink: 0;
  position: relative;
  z-index: 1000;
}

.title-bar-left {
  display: flex;
  align-items: center;
  padding: 0 8px;
  position: relative;
}

.app-icon-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;

  &:hover {
    background: color-mix(in srgb, #fff 14%, transparent);
  }

  &:active {
    transform: scale(0.88);
    background: color-mix(in srgb, #fff 22%, transparent);
  }
}

.app-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

// ===== 菜单栏 =====
.menu-bar {
  display: flex;
  align-items: center;
  height: 100%;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 10px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12px;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: color-mix(in srgb, #fff 14%, transparent);
    color: var(--text-primary);
  }

  &.active {
    background: color-mix(in srgb, #fff 20%, transparent);
    color: var(--text-primary);
  }
}

.menu-label {
  line-height: 1;
}

// ===== 下拉菜单 =====
.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10000;
  -webkit-app-region: no-drag;
}

.menu-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 12px;
  transition: background 0.1s;
  position: relative;

  &:hover {
    background: #378ADD;
    color: #fff;

    .menu-dropdown-shortcut {
      color: rgba(255, 255, 255, 0.8);
    }

    .menu-dropdown-arrow {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &.disabled {
    opacity: 0.4;
    cursor: default;
    &:hover {
      background: transparent;
      color: var(--text-primary);
    }
  }

  &.submenu-active:not(:hover) {
    background: rgba(0, 0, 0, 0.08);
  }
}

.menu-dropdown-label {
  white-space: nowrap;
}

.menu-dropdown-shortcut {
  margin-left: 24px;
  color: var(--text-secondary);
  font-size: 11px;
  opacity: 0.7;
}

.menu-dropdown-arrow {
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1;
}

// ===== 二级子菜单 =====
.menu-submenu {
  position: absolute;
  left: 100%;
  top: -4px;
  min-width: 140px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10001;
}

.menu-submenu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 12px;
  transition: background 0.1s;

  &:hover {
    background: #378ADD;
    color: #fff;
  }

  &.active {
    color: var(--accent-color);
    font-weight: 600;

    &:hover {
      color: #fff;
    }
  }
}

.menu-submenu-check {
  width: 16px;
  font-size: 11px;
  flex-shrink: 0;
}

.menu-submenu-label {
  white-space: nowrap;
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 8px;
}

// ===== 可拖拽间隔区域 =====
.title-bar-spacer {
  flex: 1;
  height: 100%;
}

// ===== 窗口控制按钮 =====
.window-controls {
  display: flex;
  align-items: center;
  height: 100%;
}

.window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: color-mix(in srgb, #fff 14%, transparent);
    color: var(--text-primary);
  }

  &.close:hover {
    background: #E81123;
    color: #fff;
  }
}

// ===== 菜单动画 =====
.menu-fade-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.menu-fade-leave-active {
  transition: opacity 0.08s ease, transform 0.08s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
