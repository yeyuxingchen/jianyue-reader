import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReaderSettings, ThemeMode, ReaderMode, CustomFont } from '@/types'
import { db } from '@/services/dbService'

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'system-ui',
  lineHeight: 1.8,
  letterSpacing: 0,
  theme: 'parchment',
  readerMode: 'scroll',
  fontBold: false,
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<ReaderSettings>({ ...DEFAULT_SETTINGS })
  const customFonts = ref<CustomFont[]>([])

  const hasCustomFonts = computed(() => customFonts.value.length > 0)

  function loadSettings() {
    const saved = db.getSettings<ReaderSettings>()
    if (saved) {
      settings.value = { ...DEFAULT_SETTINGS, ...saved }
    }
    loadFonts()
  }

  function saveSettings() {
    db.saveSettings(settings.value)
  }

  function loadFonts() {
    const saved = db.getFonts<CustomFont>()
    customFonts.value = saved || []
  }

  function saveFonts() {
    db.saveFonts(customFonts.value)
  }

  function addFont(font: CustomFont) {
    if (!customFonts.value.find(f => f.path === font.path)) {
      customFonts.value.push(font)
      saveFonts()
    }
  }

  async function removeFont(path: string) {
    const font = customFonts.value.find(f => f.path === path)
    if (font) {
      await window.services.deleteFontFile(font.path)
      customFonts.value = customFonts.value.filter(f => f.path !== path)
      saveFonts()
      if (settings.value.fontFamily === font.name) {
        settings.value.fontFamily = 'system-ui'
        saveSettings()
      }
    }
  }

  async function syncFontsWithDisk() {
    const diskFonts = await window.services.getFontFiles()
    const diskPaths = new Set(diskFonts.map(f => f.path))
    customFonts.value = customFonts.value.filter(f => diskPaths.has(f.path))
    for (const df of diskFonts) {
      if (!customFonts.value.find(f => f.path === df.path)) {
        customFonts.value.push(df)
      }
    }
    saveFonts()
  }

  function setFontSize(size: number) {
    settings.value.fontSize = Math.max(14, Math.min(24, size))
    saveSettings()
  }

  function setFontFamily(family: string) {
    settings.value.fontFamily = family
    saveSettings()
  }

  function setLineHeight(height: number) {
    settings.value.lineHeight = Math.max(1.2, Math.min(3.0, height))
    saveSettings()
  }

  function setLetterSpacing(spacing: number) {
    settings.value.letterSpacing = Math.max(0, Math.min(5, spacing))
    saveSettings()
  }

  function setTheme(theme: ThemeMode) {
    settings.value.theme = theme
    saveSettings()
  }

  function setReaderMode(mode: ReaderMode) {
    settings.value.readerMode = mode
    saveSettings()
  }

  function setFontBold(bold: boolean) {
    settings.value.fontBold = bold
    saveSettings()
  }

  return {
    settings,
    customFonts,
    hasCustomFonts,
    loadSettings,
    saveSettings,
    loadFonts,
    addFont,
    removeFont,
    syncFontsWithDisk,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setLetterSpacing,
    setTheme,
    setReaderMode,
    setFontBold,
  }
})
