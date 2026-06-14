export type BookFormat = 'EPUB' | 'TXT' | 'MOBI' | 'AZW3' | 'CBZ' | 'CBR' | string

export interface Book {
  id: string
  title: string
  author: string
  format: BookFormat
  filePath: string
  coverKey?: string
  progress: number
  lastCfi?: string
  lastReadAt: number
  addedAt: number
  totalLocations?: number
  invalid?: boolean
  sortIndex?: number
}

export interface Bookmark {
  id: string
  bookId: string
  cfi: string
  chapterTitle: string
  excerpt: string
  createdAt: number
}

export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'underline'

export interface Annotation {
  id: string
  bookId: string
  cfiRange: string
  color: AnnotationColor
  text: string
  note?: string
  chapterTitle: string
  createdAt: number
}

export type ThemeMode = 'parchment' | 'bamboo' | 'sand' | 'sky' | 'nightgreen' | 'inkgold' | 'deepsea' | 'candle' | 'softwhite' | 'lavender' | 'charcoal' | 'eyeguard'
export type ReaderMode = 'scroll' | 'single' | 'double'
export type AppMode = 'reader' | 'note'
export type SortBy = 'lastRead' | 'title' | 'progress' | 'addedAt' | 'custom'
export type SidebarTab = 'toc' | 'bookmark' | 'note' | 'search'

export interface ReaderSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  letterSpacing: number
  theme: ThemeMode
  readerMode: ReaderMode
  fontBold: boolean
}

export interface CustomFont {
  name: string
  path: string
}

export interface AISettings {
  api_key: string
  base_url: string
  model: string
  tts_model: string
}

export interface AIChatMeta {
  bookId: string
  sessionId: string
  filePath: string
  updatedAt: number
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface TocItem {
  label: string
  href: string
  subitems?: TocItem[]
}

export interface SearchResult {
  cfi: string
  excerpt: string
  chapterTitle: string
}

// ==================== TTS 相关类型 ====================

export type TTSVoice = '冰糖' | '苏打' | '茉莉' | '白桦' | 'Mia' | 'Chloe' | 'Milo' | 'Dean' | 'MimoDefault' | 'DefaultEn' | 'DefaultZh'

export type TTSSpeed = 'slow' | 'normal' | 'fast'

export type TTSStyleCategory = 'literature' | 'novel' | 'humanities'

export interface ReadingStyleItem {
  id: string
  name: string
  description: string
  stylePrompt: string
  defaultVoice: TTSVoice
  speed: string
}

export interface TTSSettings {
  voice: TTSVoice
  speed: TTSSpeed
  stylePrompt: string
  prefetchSize: number
  highlightSync: boolean
  /** 朗读风格分类（文学/小说/人文社科） */
  styleCategory: TTSStyleCategory
  /** 朗读风格 ID，'custom' 表示自定义 */
  styleId: string
  /** 自定义朗读提示词（当 styleId='custom' 时使用） */
  customStylePrompt: string
  /** 选择朗读风格时是否自动应用推荐音色 */
  applyStyleVoice: boolean
}

export interface TTSState {
  isPlaying: boolean
  currentSentenceIndex: number
  totalSentences: number
  isLoading: boolean
}

declare global {
  interface Window {
    electronAPI?: {
      store: {
        get: (key: string) => any
        set: (key: string, value: any) => void
      }
      clipboard: {
        writeText: (text: string) => Promise<void>
        readText: () => Promise<string>
      }
      image: {
        saveToCache: (base64DataUrl: string) => Promise<{ filePath: string; relativePath: string } | null>
      }
      fs: {
        readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>
        readFileAsText: (filePath: string) => Promise<string>
        checkFileExists: (filePath: string) => Promise<boolean>
        getFileName: (filePath: string) => Promise<string>
        getFileSize: (filePath: string) => Promise<number>
        writeTextFile: (text: string) => Promise<string>
        writeImageFile: (base64Url: string) => Promise<string | undefined>
        scanFolder: (folderPath: string) => Promise<string[]>
        generateNextFileName: (dirPath: string, prefix: string) => Promise<string>
        writeToFile: (filePath: string, data: string) => Promise<string | null>
      }
      dialog: {
        showFilePicker: () => Promise<string[] | undefined>
        showNoteFilePicker: () => Promise<string[] | undefined>
        showImagePicker: () => Promise<string[] | undefined>
        showFontPicker: () => Promise<string[] | undefined>
        showFolderPicker: () => Promise<string | undefined>
        saveFile: (defaultName: string, data: string | Buffer) => Promise<string | null>
        showNoteSaveDialog: (data: string) => Promise<{ filePath: string; fileName: string } | null>
      }
      book: {
        copyToCache: (bookId: string, srcPath: string) => Promise<string>
        deleteCached: (filePath: string) => Promise<void>
        cachedExists: (filePath: string) => Promise<boolean>
      }
      cover: {
        save: (bookId: string, base64DataUrl: string) => Promise<string | null>
        delete: (filePath: string) => Promise<void>
        exists: (filePath: string) => Promise<boolean>
        findEpubCover: (bookId: string, filePath: string) => Promise<string | null>
      }
      font: {
        copyToCache: (srcPath: string) => Promise<string>
        delete: (filePath: string) => Promise<void>
        getFiles: () => Promise<{ name: string; path: string }[]>
      }
      ai: {
        ensureCacheDir: () => Promise<string>
        readCacheFile: (filePath: string) => Promise<string | null>
        writeCacheFile: (filePath: string, data: string) => Promise<void>
        deleteCacheFile: (filePath: string) => Promise<void>
        listCacheFiles: () => Promise<string[]>
      }
      shell: {
        showItemInFolder: (filePath: string) => Promise<void>
      }
      floatReader: {
        create: (text: string, chapterTitle: string, opacity: number) => Promise<boolean>
        close: (returnToMain?: boolean) => Promise<void>
        isOpen: () => Promise<boolean>
        togglePin: () => Promise<boolean>
      }
      floatNote: {
        create: (text: string, fileName: string, opacity: number) => Promise<boolean>
        close: () => Promise<void>
        isOpen: () => Promise<boolean>
        syncContent: (content: string) => Promise<void>
        onContentUpdate: (callback: (content: string) => void) => () => void
        togglePin: () => Promise<boolean>
      }
      window: {
        show: () => Promise<void>
        hide: () => Promise<void>
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
        setupMaximizeListener: () => Promise<void>
        onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
      }
      devTools: {
        toggle: () => Promise<void>
      }
      app: {
        getPath: (name: string) => Promise<string>
        getVersion: () => Promise<string>
        openCacheFolder: () => Promise<void>
      }
    }
  }

  var services: {
    readFileAsBuffer: (filePath: string) => Promise<ArrayBuffer>
    readFileAsText: (filePath: string) => Promise<string>
    checkFileExists: (filePath: string) => Promise<boolean>
    showFilePicker: () => Promise<string[] | undefined>
    showNoteFilePicker: () => Promise<string[] | undefined>
    showImagePicker: () => Promise<string[] | undefined>
    saveFile: (defaultName: string, data: string | Buffer) => Promise<string | null>
    showNoteSaveDialog: (data: string) => Promise<{ filePath: string; fileName: string } | null>
    writeTextFile: (text: string) => Promise<string>
    writeImageFile: (base64Url: string) => Promise<string | undefined>
    getFileName: (filePath: string) => Promise<string>
    getFileSize: (filePath: string) => Promise<number>
    copyBookToCache: (bookId: string, srcPath: string) => Promise<string>
    deleteCachedBook: (filePath: string) => Promise<void>
    cachedBookExists: (filePath: string) => Promise<boolean>
    saveCoverFile: (bookId: string, base64DataUrl: string) => Promise<string | null>
    deleteCoverFile: (filePath: string) => Promise<void>
    coverFileExists: (filePath: string) => Promise<boolean>
    findEpubCover: (bookId: string, filePath: string) => Promise<string | null>
    showFontPicker: () => Promise<string[] | undefined>
    copyFontToCache: (srcPath: string) => Promise<string>
    deleteFontFile: (filePath: string) => Promise<void>
    getFontFiles: () => Promise<{ name: string; path: string }[]>
    showItemInFolder: (filePath: string) => Promise<void>
    ensureAiCacheDir: () => Promise<string>
    readAiCacheFile: (filePath: string) => Promise<string | null>
    writeAiCacheFile: (filePath: string, data: string) => Promise<void>
    deleteAiCacheFile: (filePath: string) => Promise<void>
    listAiCacheFiles: () => Promise<string[]>
    showFolderPicker: () => Promise<string | undefined>
    generateNextFileName: (dirPath: string, prefix: string) => Promise<string>
    writeToFile: (filePath: string, data: string) => Promise<string | null>
    saveImageToCache: (base64DataUrl: string) => Promise<{ filePath: string; relativePath: string } | null>
    createFloatReader: (text: string, bookTitle: string, chapterTitle: string, opacity: number) => Promise<boolean>
    closeFloatReader: (returnToMain?: boolean) => Promise<void>
    isFloatReaderOpen: () => Promise<boolean>
    createFloatNote: (text: string, fileName: string, opacity: number) => Promise<boolean>
    closeFloatNote: () => Promise<void>
    isFloatNoteOpen: () => Promise<boolean>
    syncFloatNoteContent: (content: string) => Promise<void>
    onFloatNoteContentUpdate: (callback: (content: string) => void) => () => void
    extractEpubAll: (filePath: string) => Promise<{ name: string; data: number[] }[] | null>
  }
}
