import { contextBridge, ipcRenderer } from 'electron'
import Store from 'electron-store'

// 在 preload 中直接创建 store 实例（preload 可以访问 Node.js）
const store = new Store({
  name: 'jianyue-reader',
})

// 通过 contextBridge 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== electron-store 键值存储（同步版本） =====
  store: {
    get: (key: string) => store.get(key),
    set: (key: string, value: any) => store.set(key, value),
  },

  // ===== 文件系统操作 =====
  fs: {
    readFileAsBuffer: (filePath: string) => ipcRenderer.invoke('fs:readFileAsBuffer', filePath),
    readFileAsText: (filePath: string) => ipcRenderer.invoke('fs:readFileAsText', filePath),
    checkFileExists: (filePath: string) => ipcRenderer.invoke('fs:checkFileExists', filePath),
    getFileName: (filePath: string) => ipcRenderer.invoke('fs:getFileName', filePath),
    getFileSize: (filePath: string) => ipcRenderer.invoke('fs:getFileSize', filePath),
    writeTextFile: (text: string) => ipcRenderer.invoke('fs:writeTextFile', text),
    writeImageFile: (base64Url: string) => ipcRenderer.invoke('fs:writeImageFile', base64Url),
    scanFolder: (folderPath: string) => ipcRenderer.invoke('fs:scanFolder', folderPath),
    generateNextFileName: (dirPath: string, prefix: string) => ipcRenderer.invoke('fs:generateNextFileName', dirPath, prefix),
    writeToFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:writeToFile', filePath, data),
  },

  // ===== 文件对话框 =====
  dialog: {
    showFilePicker: () => ipcRenderer.invoke('dialog:showFilePicker'),
    showNoteFilePicker: () => ipcRenderer.invoke('dialog:showNoteFilePicker'),
    showImagePicker: () => ipcRenderer.invoke('dialog:showImagePicker'),
    showFontPicker: () => ipcRenderer.invoke('dialog:showFontPicker'),
    showFolderPicker: () => ipcRenderer.invoke('dialog:showFolderPicker'),
    saveFile: (defaultName: string, data: string | Buffer) => ipcRenderer.invoke('dialog:saveFile', defaultName, data),
    showNoteSaveDialog: (data: string) => ipcRenderer.invoke('dialog:showNoteSaveDialog', data),
  },

  // ===== 书籍缓存管理 =====
  book: {
    copyToCache: (bookId: string, srcPath: string) => ipcRenderer.invoke('book:copyToCache', bookId, srcPath),
    deleteCached: (filePath: string) => ipcRenderer.invoke('book:deleteCached', filePath),
    cachedExists: (filePath: string) => ipcRenderer.invoke('book:cachedExists', filePath),
  },

  // ===== 封面管理 =====
  cover: {
    save: (bookId: string, base64DataUrl: string) => ipcRenderer.invoke('cover:save', bookId, base64DataUrl),
    delete: (filePath: string) => ipcRenderer.invoke('cover:delete', filePath),
    exists: (filePath: string) => ipcRenderer.invoke('cover:exists', filePath),
    findEpubCover: (bookId: string, filePath: string) => ipcRenderer.invoke('cover:findEpubCover', bookId, filePath),
  },

  // ===== 字体管理 =====
  font: {
    copyToCache: (srcPath: string) => ipcRenderer.invoke('font:copyToCache', srcPath),
    delete: (filePath: string) => ipcRenderer.invoke('font:delete', filePath),
    getFiles: () => ipcRenderer.invoke('font:getFiles'),
  },

  // ===== AI 缓存管理 =====
  ai: {
    ensureCacheDir: () => ipcRenderer.invoke('ai:ensureCacheDir'),
    readCacheFile: (filePath: string) => ipcRenderer.invoke('ai:readCacheFile', filePath),
    writeCacheFile: (filePath: string, data: string) => ipcRenderer.invoke('ai:writeCacheFile', filePath, data),
    deleteCacheFile: (filePath: string) => ipcRenderer.invoke('ai:deleteCacheFile', filePath),
    listCacheFiles: () => ipcRenderer.invoke('ai:listCacheFiles'),
  },

  // ===== 剪贴板 =====
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
  },

  // ===== 图片缓存 =====
  image: {
    saveToCache: (base64DataUrl: string) => ipcRenderer.invoke('image:saveToCache', base64DataUrl),
  },

  // ===== 系统操作 =====
  shell: {
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },

  // ===== 开发者工具 =====
  devTools: {
    toggle: () => ipcRenderer.invoke('window:toggleDevTools'),
  },

  // ===== 浮动阅读窗口 =====
  floatReader: {
    create: (text: string, chapterTitle: string, opacity: number) => ipcRenderer.invoke('floatReader:create', text, chapterTitle, opacity),
    close: (returnToMain?: boolean) => ipcRenderer.invoke('floatReader:close', returnToMain !== false),
    isOpen: () => ipcRenderer.invoke('floatReader:isOpen'),
    togglePin: () => ipcRenderer.invoke('floatReader:togglePin'),
  },

  // ===== 镜像笔记浮窗（可编辑）=====
  floatNote: {
    create: (text: string, fileName: string, opacity: number) => ipcRenderer.invoke('floatNote:create', text, fileName, opacity),
    close: () => ipcRenderer.invoke('floatNote:close'),
    isOpen: () => ipcRenderer.invoke('floatNote:isOpen'),
    syncContent: (content: string) => ipcRenderer.invoke('floatNote:syncContent', content),
    togglePin: () => ipcRenderer.invoke('floatNote:togglePin'),
    onContentUpdate: (callback: (content: string) => void) => {
      const handler = (_event: any, content: string) => callback(content)
      ipcRenderer.on('floatNote:contentUpdate', handler)
      return () => { ipcRenderer.removeListener('floatNote:contentUpdate', handler) }
    },
  },

  // ===== 窗口控制 =====
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    setupMaximizeListener: () => ipcRenderer.invoke('window:setupMaximizeListener'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window:maximize-change', (_event, value) => callback(value))
    },
  },

  // ===== 获取路径 =====
  app: {
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openCacheFolder: () => ipcRenderer.invoke('app:openCacheFolder'),
  },
})

// 暴露兼容层：将新的 electronAPI 映射到旧的 window.services 接口
// 这样可以减少对 Vue 组件的修改
contextBridge.exposeInMainWorld('services', {
  readFileAsBuffer: (filePath: string) => ipcRenderer.invoke('fs:readFileAsBuffer', filePath),
  readFileAsText: (filePath: string) => ipcRenderer.invoke('fs:readFileAsText', filePath),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('fs:checkFileExists', filePath),
  showFilePicker: () => ipcRenderer.invoke('dialog:showFilePicker'),
  showNoteFilePicker: () => ipcRenderer.invoke('dialog:showNoteFilePicker'),
  showImagePicker: () => ipcRenderer.invoke('dialog:showImagePicker'),
  showFontPicker: () => ipcRenderer.invoke('dialog:showFontPicker'),
  showFolderPicker: () => ipcRenderer.invoke('dialog:showFolderPicker'),
  saveFile: (defaultName: string, data: string | Buffer) => ipcRenderer.invoke('dialog:saveFile', defaultName, data),
  showNoteSaveDialog: (data: string) => ipcRenderer.invoke('dialog:showNoteSaveDialog', data),
  writeTextFile: (text: string) => ipcRenderer.invoke('fs:writeTextFile', text),
  writeImageFile: (base64Url: string) => ipcRenderer.invoke('fs:writeImageFile', base64Url),
  getFileName: (filePath: string) => ipcRenderer.invoke('fs:getFileName', filePath),
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:getFileSize', filePath),
  copyBookToCache: (bookId: string, srcPath: string) => ipcRenderer.invoke('book:copyToCache', bookId, srcPath),
  deleteCachedBook: (filePath: string) => ipcRenderer.invoke('book:deleteCached', filePath),
  cachedBookExists: (filePath: string) => ipcRenderer.invoke('book:cachedExists', filePath),
  saveCoverFile: (bookId: string, base64DataUrl: string) => ipcRenderer.invoke('cover:save', bookId, base64DataUrl),
  deleteCoverFile: (filePath: string) => ipcRenderer.invoke('cover:delete', filePath),
  coverFileExists: (filePath: string) => ipcRenderer.invoke('cover:exists', filePath),
  findEpubCover: (bookId: string, filePath: string) => ipcRenderer.invoke('cover:findEpubCover', bookId, filePath),
  extractEpubAll: (filePath: string) => ipcRenderer.invoke('epub:extractAll', filePath),
  copyFontToCache: (srcPath: string) => ipcRenderer.invoke('font:copyToCache', srcPath),
  deleteFontFile: (filePath: string) => ipcRenderer.invoke('font:delete', filePath),
  getFontFiles: () => ipcRenderer.invoke('font:getFiles'),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  ensureAiCacheDir: () => ipcRenderer.invoke('ai:ensureCacheDir'),
  readAiCacheFile: (filePath: string) => ipcRenderer.invoke('ai:readCacheFile', filePath),
  writeAiCacheFile: (filePath: string, data: string) => ipcRenderer.invoke('ai:writeCacheFile', filePath, data),
  deleteAiCacheFile: (filePath: string) => ipcRenderer.invoke('ai:deleteCacheFile', filePath),
  listAiCacheFiles: () => ipcRenderer.invoke('ai:listCacheFiles'),
  generateNextFileName: (dirPath: string, prefix: string) => ipcRenderer.invoke('fs:generateNextFileName', dirPath, prefix),
  writeToFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:writeToFile', filePath, data),
  saveImageToCache: (base64DataUrl: string) => ipcRenderer.invoke('image:saveToCache', base64DataUrl),
  createFloatReader: (text: string, bookTitle: string, chapterTitle: string, opacity: number) => ipcRenderer.invoke('floatReader:create', text, bookTitle, chapterTitle, opacity),
  closeFloatReader: () => ipcRenderer.invoke('floatReader:close'),
  isFloatReaderOpen: () => ipcRenderer.invoke('floatReader:isOpen'),
  createFloatNote: (text: string, fileName: string, opacity: number) => ipcRenderer.invoke('floatNote:create', text, fileName, opacity),
  closeFloatNote: () => ipcRenderer.invoke('floatNote:close'),
  isFloatNoteOpen: () => ipcRenderer.invoke('floatNote:isOpen'),
  syncFloatNoteContent: (content: string) => ipcRenderer.invoke('floatNote:syncContent', content),
  onFloatNoteContentUpdate: (callback: (content: string) => void) => {
    const handler = (_event: any, content: string) => callback(content)
    ipcRenderer.on('floatNote:contentUpdate', handler)
    return () => { ipcRenderer.removeListener('floatNote:contentUpdate', handler) }
  },
})
