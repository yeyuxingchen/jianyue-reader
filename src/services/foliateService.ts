import type { TocItem } from '@/types'

let foliateLoaded = false

async function loadFoliate(): Promise<void> {
  if (foliateLoaded) return
  if (customElements.get('foliate-view') && (window as any).__foliateMakeBook) {
    foliateLoaded = true
    return
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Foliate-js load timeout'))
    }, 15000)

    const script = document.createElement('script')
    script.type = 'module'
    script.src = './lib/bootstrap.js'
    script.onload = () => {
      clearTimeout(timeout)
      foliateLoaded = true
      resolve()
    }
    script.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Failed to load foliate-js'))
    }
    document.head.appendChild(script)
  })
}

// 存储从主进程预加载的 EPUB 条目数据
let preloadedEpubEntries: Map<string, Uint8Array> | null = null

export async function createView(
  container: HTMLElement,
  filePath: string,
  onRelocate: (detail: any) => void,
  onLoad: (detail: any) => void
): Promise<any> {
  await loadFoliate()

  const view: any = document.createElement('foliate-view')
  view.setAttribute('exportparts', 'filter')
  container.appendChild(view)

  view.addEventListener('relocate', ((e: Event) => {
    onRelocate((e as CustomEvent).detail)
  }) as EventListener)

  view.addEventListener('load', ((e: Event) => {
    onLoad((e as CustomEvent).detail)
  }) as EventListener)

  const fileName = filePath.split(/[/\\]/).pop() || 'book.epub'
  const isEpub = fileName.toLowerCase().endsWith('.epub')

  if (isEpub) {
    // EPUB: 在主进程中解压，避免渲染进程使用 zip.js 导致崩溃
    const entries = await window.services.extractEpubAll(filePath)
    if (entries && entries.length > 0) {
      preloadedEpubEntries = new Map(
        entries.map((e: { name: string; data: number[] }) => [e.name, new Uint8Array(e.data)])
      )
      // 设置全局变量供 makeZipLoader 使用
      ;(window as any).__preloadedEpubEntries = preloadedEpubEntries
    }
  }

  const arrayBuffer = await window.services.readFileAsBuffer(filePath)
  const file = new File([arrayBuffer], fileName)

  await view.open(file)

  // 清理预加载数据
  preloadedEpubEntries = null
  ;(window as any).__preloadedEpubEntries = null

  return view
}

export function getTocFromBook(book: any): TocItem[] {
  if (!book?.toc) return []
  return book.toc.map(mapTocItem)
}

function mapTocItem(item: any): TocItem {
  return {
    label: item.label?.trim() || '',
    href: item.href || '',
    subitems: item.subitems?.map(mapTocItem) || [],
  }
}

const COVER_IMAGE_NAMES = ['cover', 'coverimage', 'cover-image', 'frontcover', 'front-cover']

function isImageItem(item: any): boolean {
  if (!item?.mediaType) return false
  return item.mediaType.startsWith('image/')
}

function isCoverLikeItem(item: any): boolean {
  if (!isImageItem(item)) return false
  const hrefLower = (item.href || '').toLowerCase()
  const idLower = (item.id || '').toLowerCase()
  return COVER_IMAGE_NAMES.some(name =>
    hrefLower.includes(name) || idLower.includes(name)
  )
}

export async function getCoverFromBook(book: any): Promise<string> {
  if (!book) return ''
  try {
    if (book.getCover) {
      const blob = await book.getCover()
      if (blob) {
        return await blobToDataUrl(blob)
      }
    }
    return await findCoverFallback(book)
  } catch {
    return await findCoverFallback(book)
  }
}

async function findCoverFallback(book: any): Promise<string> {
  try {
    const manifest = book.resources?.manifest
    if (!manifest?.length || !book.loadBlob) return ''

    const coverLike = manifest.find((item: any) => isCoverLikeItem(item))
    if (coverLike) {
      const blob = await book.loadBlob(coverLike.href)
      if (blob) return await blobToDataUrl(new Blob([blob], { type: coverLike.mediaType }))
    }

    const images = manifest.filter((item: any) => isImageItem(item))
    if (images.length > 0) {
      const first = images[0]
      const blob = await book.loadBlob(first.href)
      if (blob) return await blobToDataUrl(new Blob([blob], { type: first.mediaType }))
    }

    return ''
  } catch {
    return ''
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string || '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(blob)
  })
}

export async function extractCoverFromFile(filePath: string): Promise<string> {
  await loadFoliate()
  const makeBook = (window as any).__foliateMakeBook
  if (!makeBook) return ''
  try {
    const arrayBuffer = await window.services.readFileAsBuffer(filePath)
    const fileName = filePath.split(/[/\\]/).pop() || 'book.epub'
    const file = new File([arrayBuffer], fileName)
    const book = await makeBook(file)
    return await getCoverFromBook(book)
  } catch {
    return ''
  }
}

export function getBookMetadata(book: any): { title: string; author: string } {
  const metadata = book?.metadata || {}
  let title = ''
  let author = ''

  if (metadata.title) {
    title = typeof metadata.title === 'string'
      ? metadata.title
      : metadata.title[Object.keys(metadata.title)[0]] || ''
  }

  if (metadata.author) {
    if (Array.isArray(metadata.author)) {
      author = metadata.author
        .map((a: any) => typeof a === 'string' ? a : a.name || '')
        .join(', ')
    } else if (typeof metadata.author === 'string') {
      author = metadata.author
    } else if (metadata.author?.name) {
      author = metadata.author.name
    }
  }

  return { title, author }
}

const createSVGElement = (tag: string) =>
  document.createElementNS('http://www.w3.org/2000/svg', tag)

function drawSearchHighlight(rects: DOMRectList, options: { color?: string } = {}) {
  const { color = '#ef4444' } = options
  const g = createSVGElement('g')
  g.setAttribute('fill', color)
  ;(g.style as any).opacity = '0.35'
  for (const { left, top, height, width } of rects) {
    const el = createSVGElement('rect')
    el.setAttribute('x', String(left))
    el.setAttribute('y', String(top))
    el.setAttribute('height', String(height))
    el.setAttribute('width', String(width))
    g.append(el)
  }
  return g
}

export async function searchInBook(view: any, query: string): Promise<any[]> {
  if (!view?.search) return []
  const results: any[] = []
  try {
    for await (const result of view.search({
      query,
      draw: drawSearchHighlight,
      drawOptions: { color: '#ef4444' },
    })) {
      if (result === 'done') break
      if (result.subitems) {
        results.push(...result.subitems)
      }
    }
  } catch {}
  return results
}

const ALL_THEME_CLASSES = [
  'theme-parchment', 'theme-bamboo', 'theme-sand', 'theme-sky',
  'theme-nightgreen', 'theme-inkgold', 'theme-deepsea', 'theme-candle',
  'theme-softwhite', 'theme-purewhite', 'theme-lavender', 'theme-charcoal', 'theme-eyeguard',
]

export function applyThemeFilter(view: any, theme: string) {
  if (!view) return
  try {
    view.classList.remove(...ALL_THEME_CLASSES)
    if (theme !== 'parchment') {
      view.classList.add('theme-' + theme)
    }
  } catch {}
}

export function setFlowMode(view: any, mode: string) {
  if (!view?.renderer) return
  try {
    const renderer = view.renderer
    if (mode === 'scroll') {
      renderer.setAttribute('flow', 'scrolled')
    } else {
      renderer.setAttribute('flow', 'paginated')
    }
  } catch {}
}

const DARK_THEMES = new Set(['nightgreen', 'inkgold', 'deepsea', 'candle', 'charcoal'])

const THEME_READER_COLORS: Record<string, { bg: string; text: string }> = {
  parchment: { bg: '#F5F0E8', text: '#3A2E1E' },
  bamboo: { bg: '#E8F5E0', text: '#1B3A1A' },
  sand: { bg: '#FAF3E0', text: '#3D2F00' },
  sky: { bg: '#E6F0F5', text: '#1A2E3A' },
  nightgreen: { bg: '#1E2A1E', text: '#C8DEB0' },
  inkgold: { bg: '#1C1A14', text: '#D4C89A' },
  deepsea: { bg: '#1A1E2A', text: '#B0C4DE' },
  candle: { bg: '#2A1F1A', text: '#D4B896' },
  softwhite: { bg: '#F2F0F0', text: '#2C2C2C' },
  purewhite: { bg: '#ffffff', text: '#1a1a1a' },
  lavender: { bg: '#F0EBF4', text: '#2E1A3A' },
  charcoal: { bg: '#3A3A3A', text: '#E0E0E0' },
  eyeguard: { bg: '#FFFDE8', text: '#333300' },
}

const FONT_FACE_STYLE_ID = 'custom-reader-font-face'

// 字体 base64 缓存，避免重复读取文件
const fontBase64Cache = new Map<string, { data: string; mimeType: string }>()

/**
 * 预加载字体数据到缓存（在设置加载时调用）
 */
export async function preloadFontData(customFonts: { name: string; path: string }[], fontFamily: string): Promise<void> {
  const matchedFont = customFonts.find(f => f.name === fontFamily)
  if (!matchedFont || fontBase64Cache.has(matchedFont.path)) return
  try {
    const fontData = await (window as any).electronAPI?.font?.getBase64(matchedFont.path)
    if (fontData) {
      fontBase64Cache.set(matchedFont.path, fontData)
    }
  } catch (err) {
    console.error('Failed to preload font:', err)
  }
}

function buildFontFaceCss(fontPath: string): string {
  // 从缓存获取字体数据（同步）
  const fontData = fontBase64Cache.get(fontPath)
  if (fontData) {
    return `@font-face { font-family: 'CustomReaderFont'; src: url('data:${fontData.mimeType};base64,${fontData.data}'); }`
  }
  // 缓存未命中时回退到 fontfile 协议
  const normalizedPath = fontPath.replace(/\\/g, '/')
  const encodedPath = encodeURIComponent(normalizedPath)
  return `@font-face { font-family: 'CustomReaderFont'; src: url('fontfile:///?path=${encodedPath}'); }`
}

export function injectFontFaceToDoc(doc: Document, customFonts: { name: string; path: string }[] | undefined, fontFamily: string) {
  const matchedFont = customFonts?.find(f => f.name === fontFamily)
  let styleEl = doc.getElementById(FONT_FACE_STYLE_ID) as HTMLStyleElement | null
  if (!matchedFont) {
    if (styleEl) styleEl.remove()
    return
  }
  const css = buildFontFaceCss(matchedFont.path)
  if (!styleEl) {
    styleEl = doc.createElement('style')
    styleEl.id = FONT_FACE_STYLE_ID
    doc.head.appendChild(styleEl)
  }
  if (styleEl.textContent !== css) {
    styleEl.textContent = css
  }
}

export async function injectCustomFontFace(view: any, customFonts: { name: string; path: string }[] | undefined, fontFamily: string) {
  // 先预加载字体数据到缓存
  if (customFonts) {
    await preloadFontData(customFonts, fontFamily)
  }
  // 同步注入字体（使用缓存数据）
  injectFontFaceToDoc(document, customFonts, fontFamily)
  if (!view?.renderer?.getContents) return
  try {
    const contents = view.renderer.getContents()
    for (const { doc } of contents) {
      if (doc) injectFontFaceToDoc(doc, customFonts, fontFamily)
    }
  } catch {}
}

export function applyReaderStyles(view: any, settings: { fontSize: number; lineHeight: number; letterSpacing: number; fontFamily: string; theme: string; fontBold?: boolean }, customFonts?: { name: string; path: string }[]) {
  if (!view?.renderer?.setStyles) return
  try {
    const colors = THEME_READER_COLORS[settings.theme]
    const isDark = DARK_THEMES.has(settings.theme)
    let colorCss = ''
    if (colors) {
      colorCss = `
html:not(#_):not(#_), html:not(#_):not(#_) > body:not(#_):not(#_) {
  background-color: ${colors.bg} !important;
  color: ${colors.text} !important;
}
html:not(#_):not(#_) > body:not(#_):not(#_) > *:not(#_):not(#_) {
  color: ${colors.text} !important;
}
html:not(#_):not(#_) > body:not(#_):not(#_) > *:not(#_):not(#_) *:not(#_):not(#_) {
  color: ${colors.text} !important;
}
${isDark ? `svg:not(#_):not(#_) { filter: invert(1) hue-rotate(180deg); } img:not(#_):not(#_) { filter: none; }` : ''}
`
    }
    const matchedFont = customFonts?.find(f => f.name === settings.fontFamily)
    const fontFamilyValue = matchedFont ? "'CustomReaderFont', system-ui, sans-serif" : (settings.fontFamily !== 'system-ui' ? settings.fontFamily : 'system-ui')
    const css = `
html, body {
  font-size: ${settings.fontSize}px !important;
  line-height: ${settings.lineHeight} !important;
  ${settings.letterSpacing > 0 ? `letter-spacing: ${settings.letterSpacing}px !important;` : ''}
  font-family: ${fontFamilyValue} !important;
  ${settings.fontBold ? 'font-weight: bold !important;' : ''}
}
p, div, span, a, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre, code, em, strong, i, b, u, s, del, ins, mark, small, sub, sup {
  font-size: ${settings.fontSize}px !important;
  line-height: ${settings.lineHeight} !important;
  ${settings.letterSpacing > 0 ? `letter-spacing: ${settings.letterSpacing}px !important;` : ''}
  font-family: ${fontFamilyValue} !important;
  ${settings.fontBold ? 'font-weight: bold !important;' : ''}
}
img, svg, ruby, rt, rp, sup, sub {
  font-size: initial !important;
}
*:not(#_):not(#_) {
  margin-top: initial !important;
  margin-bottom: initial !important;
}
.tts-highlight:not(#_):not(#_) {
  background-color: rgba(55, 138, 221, 0.15) !important;
  border-radius: 3px !important;
  transition: background-color 0.3s ease !important;
}
${colorCss}
`
    view.renderer.setStyles(css)
  } catch {}
}

export function setMaxInlineSize(view: any, size: number) {
  if (!view?.renderer) return
  try {
    if (view.renderer.setAttribute) {
      view.renderer.setAttribute('max-inline-size', size + 'px')
    }
  } catch {}
}
