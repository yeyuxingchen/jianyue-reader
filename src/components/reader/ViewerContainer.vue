<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { useSettingsStore } from '@/stores/settings'
import { useAnnotationsStore } from '@/stores/annotations'
import { useLibraryStore } from '@/stores/library'
import { useTTSStore } from '@/stores/tts'
import { createView, getTocFromBook, getBookMetadata, applyThemeFilter, setFlowMode, applyReaderStyles, injectFontFaceToDoc, injectCustomFontFace } from '@/services/foliateService'
import { TTSPlayer } from '@/services/ttsPlayer'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

const reader = useReaderStore()
const settings = useSettingsStore()
const annotations = useAnnotationsStore()
const library = useLibraryStore()
const ttsStore = useTTSStore()
const containerRef = ref<HTMLDivElement>()
let viewInstance: any = null
let ttsPlayer: TTSPlayer | null = null
const showNextChapter = ref(false)
const showPrevChapter = ref(false)

onMounted(async () => {
  document.addEventListener('mouseup', handleMainMouseUp)
  window.addEventListener('selection-cooldown', handleSelectionCooldown)
  window.addEventListener('render-annotation', handleRenderAnnotation)
  window.addEventListener('remove-annotation-overlay', handleRemoveAnnotationOverlay)
  window.addEventListener('tts-toggle-play', handleTTSToggle)
  window.addEventListener('tts-stop', handleTTSStop)

  if (!reader.currentBook || !containerRef.value) return

  const book = reader.currentBook

  try {
    const view = await createView(
      containerRef.value,
      book.filePath,
      handleRelocate,
      handleLoad
    )

    viewInstance = view
    reader.setRendition(view)

    view.addEventListener('draw-annotation', (e: CustomEvent) => {
      handleDrawAnnotation(e.detail)
    })
    view.addEventListener('create-overlay', () => {
      handleCreateOverlay()
    })
    view.addEventListener('show-annotation', (e: CustomEvent) => {
      handleShowAnnotation(e.detail)
    })

    if (view.book) {
      const tocItems = getTocFromBook(view.book)
      reader.setToc(tocItems)

      const meta = getBookMetadata(view.book)
      // guard: never overwrite title with an id-like value (e.g. "book_whurl7")
      // or with a file-name-like value; for TXT books, the metadata extraction
      // at open-time is unreliable because the cached file name is the book id.
      const isIdLike = /^book_[a-z0-9]+$/i.test(meta.title)
      const isFileNameLike = /\.(txt|epub|mobi|azw3|cbz|cbr)$/i.test(meta.title)
      if (meta.title && meta.title !== book.title && !isIdLike && !isFileNameLike) {
        library.updateBook(book.id, { title: meta.title })
      }
      if (meta.author && !book.author) {
        library.updateBook(book.id, { author: meta.author })
      }
    }

    setFlowMode(view, settings.settings.readerMode)

    if (book.lastCfi) {
      try {
        await view.init({ lastLocation: book.lastCfi })
      } catch {
        await view.init({ showTextStart: true })
      }
    } else {
      await view.init({ showTextStart: true })
    }

    applyThemeFilter(view, settings.settings.theme)
    await injectCustomFontFace(view, settings.customFonts, settings.settings.fontFamily)
    applyReaderStyles(view, settings.settings, settings.customFonts)
  } catch (err) {
    console.error('Failed to open book:', err)
  } finally {
    reader.isLoading = false
  }
})

function handleRelocate(detail: any) {
  const cfi = detail.cfi || ''
  const tocItem = detail.tocItem
  const chapterTitle = tocItem?.label || ''
  const fraction = detail.fraction ?? 0
  const total = detail.section?.total ?? detail.loc?.total ?? 0
  const current = detail.section?.current ?? detail.loc?.current ?? 0

  reader.updateLocation(cfi, chapterTitle, current, total, fraction)

  if (fraction > 0) {
    const progress = Math.round(fraction * 100)
    if (reader.currentBook) {
      library.updateBook(reader.currentBook.id, {
        progress,
        lastCfi: cfi,
        lastReadAt: Date.now(),
      })
    }
  }

  if (settings.settings.readerMode === 'scroll') {
    const renderer = viewInstance?.renderer
    if (renderer) {
      const start = renderer.start ?? 0
      const viewSize = renderer.viewSize ?? 0
      const containerSize = renderer.size ?? 0
      const maxScroll = viewSize - containerSize
      const isNearBottom = maxScroll > 0 && start >= maxScroll - 150
      const isSinglePage = maxScroll <= 0
      const isNearTop = start <= 150
      showNextChapter.value = isNearBottom || isSinglePage
      showPrevChapter.value = isNearTop && current > 0
    } else {
      showNextChapter.value = false
      showPrevChapter.value = false
    }
  } else {
    showNextChapter.value = false
    showPrevChapter.value = false
  }
}

let lastMouseX = 0
let lastMouseY = 0

const ANNOTATION_COLORS: Record<string, string> = {
  yellow: '#fef08a',
  green: '#86efac',
  blue: '#93c5fd',
  pink: '#fda4af',
  underline: '#333333',
}

const createSVGElement = (tag: string) =>
  document.createElementNS('http://www.w3.org/2000/svg', tag)

const noteRangesMap = new Map<string, { range: Range, note: string }>()

function drawHighlight(rects: DOMRectList, options: { color?: string; hasNote?: boolean } = {}) {
  const { color = 'red', hasNote = false } = options
  const wrapper = createSVGElement('g')
  const g = createSVGElement('g')
  g.setAttribute('fill', color)
  ;(g.style as any).opacity = 'var(--overlayer-highlight-opacity, .3)'
  ;(g.style as any).mixBlendMode = 'var(--overlayer-highlight-blend-mode, normal)'
  for (const { left, top, height, width } of rects) {
    const el = createSVGElement('rect')
    el.setAttribute('x', String(left))
    el.setAttribute('y', String(top))
    el.setAttribute('height', String(height))
    el.setAttribute('width', String(width))
    g.append(el)
  }
  wrapper.append(g)
  if (hasNote) wrapper.append(createNoteBadge(rects))
  return wrapper
}

function drawUnderline(rects: DOMRectList, options: { color?: string; width?: number; hasNote?: boolean } = {}) {
  const { color = 'red', width: strokeWidth = 2, hasNote = false } = options
  const wrapper = createSVGElement('g')
  const g = createSVGElement('g')
  g.setAttribute('fill', color)
  for (const { left, bottom, width } of rects) {
    const el = createSVGElement('rect')
    el.setAttribute('x', String(left))
    el.setAttribute('y', String(bottom - strokeWidth))
    el.setAttribute('height', String(strokeWidth))
    el.setAttribute('width', String(width))
    g.append(el)
  }
  wrapper.append(g)
  if (hasNote) wrapper.append(createNoteBadge(rects))
  return wrapper
}

function createNoteBadge(rects: DOMRectList): SVGElement {
  const g = createSVGElement('g')
  const lastRect = rects[rects.length - 1]
  if (!lastRect) return g
  const bx = lastRect.right - 10
  const by = lastRect.bottom + 1
  const bw = 11
  const bh = 9
  const br = 2

  // 消息气泡外形（圆角矩形 + 左下尾巴）
  const bubble = createSVGElement('path')
  bubble.setAttribute('d', [
    `M${bx + br},${by}`,
    `h${bw - 2 * br}`, `a${br},${br} 0 0 1 ${br},${br}`,
    `v${bh - 2 * br}`, `a${br},${br} 0 0 1 -${br},${br}`,
    `h-3`, `l-1.5,3`, `l-1,-3`, `h-1.5`,
    `a${br},${br} 0 0 1 -${br},-${br}`,
    `v-${bh - 2 * br}`, `a${br},${br} 0 0 1 ${br},-${br}`,
    'z'
  ].join(' '))
  bubble.setAttribute('fill', '#6366f1')
  bubble.setAttribute('stroke', '#fff')
  bubble.setAttribute('stroke-width', '1.2')
  bubble.setAttribute('stroke-linejoin', 'round')
  g.append(bubble)

  // 气泡内两条短横线（代表消息文字）
  const line1 = createSVGElement('line')
  line1.setAttribute('x1', String(bx + 2.5))
  line1.setAttribute('y1', String(by + 3.5))
  line1.setAttribute('x2', String(bx + bw - 2.5))
  line1.setAttribute('y2', String(by + 3.5))
  line1.setAttribute('stroke', '#fff')
  line1.setAttribute('stroke-width', '1')
  line1.setAttribute('stroke-linecap', 'round')
  g.append(line1)

  const line2 = createSVGElement('line')
  line2.setAttribute('x1', String(bx + 2.5))
  line2.setAttribute('y1', String(by + 5.5))
  line2.setAttribute('x2', String(bx + bw - 5))
  line2.setAttribute('y2', String(by + 5.5))
  line2.setAttribute('stroke', '#fff')
  line2.setAttribute('stroke-width', '1')
  line2.setAttribute('stroke-linecap', 'round')
  g.append(line2)

  return g
}

function handleDrawAnnotation(detail: any) {
  const { draw, annotation, range } = detail
  const color = annotation?.color || 'yellow'
  const bookId = reader.currentBook?.id
  const ann = annotations.annotations.find(
    (a: any) => a.bookId === bookId && a.cfiRange === annotation.value
  )
  const hasNote = !!ann?.note
  if (hasNote && range) {
    noteRangesMap.set(annotation.value, { range, note: ann!.note! })
  }
  if (color === 'underline') {
    draw(drawUnderline, { color: ANNOTATION_COLORS.underline, width: 2, hasNote })
  } else {
    draw(drawHighlight, { color: ANNOTATION_COLORS[color] || ANNOTATION_COLORS.yellow, hasNote })
  }
}

function handleCreateOverlay() {
  const bookId = reader.currentBook?.id
  if (!bookId) return
  const anns = annotations.annotations.filter(
    (a: any) => a.bookId === bookId && a.cfiRange
  )
  for (const ann of anns) {
    viewInstance?.addAnnotation?.({
      value: ann.cfiRange,
      color: ann.color,
    })
  }
}

function renderAnnotation(cfiRange: string, color: string) {
  if (!viewInstance?.addAnnotation) return
  viewInstance.addAnnotation({ value: cfiRange, color })
}

function removeAnnotationOverlay(cfiRange: string) {
  if (!viewInstance?.deleteAnnotation) return
  viewInstance.deleteAnnotation({ value: cfiRange })
}

function handleRenderAnnotation(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail?.cfiRange) {
    renderAnnotation(detail.cfiRange, detail.color || 'yellow')
  }
}

function handleRemoveAnnotationOverlay(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail?.cfiRange) {
    removeAnnotationOverlay(detail.cfiRange)
    noteRangesMap.delete(detail.cfiRange)
  }
}

function handleShowAnnotation(detail: any) {
  const { value, range } = detail
  const bookId = reader.currentBook?.id
  if (!bookId) return
  const ann = annotations.annotations.find(
    (a: any) => a.bookId === bookId && a.note && a.cfiRange === value
  )
  if (!ann) return
  try {
    const rects = range?.getClientRects?.()
    if (!rects?.length) return
    const rect = rects[0]
    const iframe = range.startContainer.ownerDocument?.defaultView?.frameElement as HTMLElement | null
    if (iframe) {
      const iframeRect = iframe.getBoundingClientRect()
      tooltipPos.value = {
        x: iframeRect.left + rect.left + rect.width / 2,
        y: iframeRect.top + rect.top - 10,
      }
    }
    tooltipText.value = ann.note || ''
    tooltipVisible.value = true
    if (tooltipTimer) clearTimeout(tooltipTimer)
    tooltipTimer = setTimeout(() => {
      tooltipVisible.value = false
    }, 3000)
  } catch {}
}

const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipPos = ref({ x: 0, y: 0 })
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

const imageViewerVisible = ref(false)
const imageViewerSrc = ref('')

function openImageViewer(src: string) {
  imageViewerSrc.value = src
  imageViewerVisible.value = true
}

function closeImageViewer() {
  imageViewerVisible.value = false
  imageViewerSrc.value = ''
}

function checkAnnotationAtPoint(e: MouseEvent) {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer)
    tooltipTimer = null
  }
  if (!noteRangesMap.size) return
  const x = e.clientX
  const y = e.clientY
  let found = false
  for (const [, { range, note }] of noteRangesMap) {
    try {
      const rects = range.getClientRects()
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i]
        if (rect.top <= y && rect.left <= x && rect.bottom > y && rect.right > x) {
          const iframe = range.startContainer.ownerDocument?.defaultView?.frameElement as HTMLElement | null
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect()
            tooltipPos.value = {
              x: iframeRect.left + rect.left + rect.width / 2,
              y: iframeRect.top + rect.top - 10,
            }
          }
          tooltipText.value = note
          tooltipVisible.value = true
          tooltipTimer = setTimeout(() => {
            tooltipVisible.value = false
          }, 3000)
          found = true
          break
        }
      }
    } catch {}
    if (found) break
  }
  if (!found) {
    tooltipVisible.value = false
  }
}

async function handleLoad(detail: any) {
  noteRangesMap.clear()
  const { doc } = detail
  if (doc) {
    await injectFontFaceToDoc(doc, settings.customFonts, settings.settings.fontFamily)
    
    // 处理 mousedown 事件
    doc.addEventListener('mousedown', (e: MouseEvent) => {
      window.dispatchEvent(new CustomEvent('iframe-mousedown'))
      tooltipVisible.value = false
      // 提前检测图片点击
      const target = e.target as HTMLElement
      const img = target.closest('img') || (target.tagName === 'IMG' ? target : null) as HTMLImageElement | null
      if (img) {
        handleImageClick(img)
        e.preventDefault()
        return
      }
    })
    
    doc.addEventListener('mouseup', (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const img = target.closest('img') || (target.tagName === 'IMG' ? target : null) as HTMLImageElement | null
      if (img) {
        return
      }
      if (selectionCooldown) {
        selectionCooldown = false
        return
      }
      setTimeout(checkSelection, 50)
    })
    
    doc.addEventListener('mousemove', (e: MouseEvent) => {
      lastMouseX = e.clientX
      lastMouseY = e.clientY
      const target = e.target as HTMLElement
      const img = target.closest('img') as HTMLImageElement | null
      if (img) {
        img.style.cursor = 'zoom-in'
      }
      checkAnnotationAtPoint(e)
    })
  }
}

function handleImageClick(img: HTMLImageElement) {
  // 直接使用 img.src，避免复杂转换可能带来的问题
  console.log('Image clicked:', img.src)
  openImageViewer(img.src)
}

let selectionCooldown = false
let selectionCooldownTimer: ReturnType<typeof setTimeout> | null = null

function handleSelectionCooldown() {
  selectionCooldown = true
  if (selectionCooldownTimer) clearTimeout(selectionCooldownTimer)
  selectionCooldownTimer = setTimeout(() => {
    selectionCooldown = false
  }, 300)
}

function handleMainMouseUp() {
  if (selectionCooldown) return
  setTimeout(checkSelection, 50)
}

/**
 * 获取当前章节的纯文本内容
 */
function getCurrentChapterText(): string {
  if (!viewInstance) return ''
  try {
    const contents = viewInstance.renderer?.getContents?.()
    if (!contents?.length) return ''
    const doc = contents[0].doc
    return doc.body?.innerText || doc.body?.textContent || ''
  } catch {
    return ''
  }
}

/**
 * 清除 TTS 高亮：将 .tts-highlight span 解包回纯文本节点
 */
function clearTTSHighlight(doc: Document) {
  doc.querySelectorAll('span.tts-highlight').forEach((el: Element) => {
    const span = el as HTMLSpanElement
    const parent = span.parentNode
    if (!parent) return
    // 将 span 的子节点移回父节点
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span)
    }
    parent.removeChild(span)
    // 合并相邻文本节点
    parent.normalize()
  })
}

/**
 * 在文本节点中查找并包裹匹配文本
 */
function wrapTextInNode(doc: Document, textNode: Text, searchText: string): boolean {
  const nodeText = textNode.textContent || ''
  // 去除引号后匹配
  const normalizedNode = nodeText.replace(/[\u201c\u201d\u2018\u2019"']/g, '')
  const normalizedSearch = searchText.replace(/[\u201c\u201d\u2018\u2019"']/g, '')
  const idx = normalizedNode.indexOf(normalizedSearch)
  if (idx === -1) return false

  // 需要将 normalized 索引映射回原始文本索引
  // 逐字符遍历，跳过引号字符来对齐位置
  let realStart = 0
  let normPos = 0
  for (let i = 0; i < nodeText.length; i++) {
    const ch = nodeText[i]
    if (!/[\u201c\u201d\u2018\u2019"']/.test(ch)) {
      if (normPos === idx) { realStart = i; break }
      normPos++
    }
  }
  // 计算实际结束位置
  let realEnd = realStart
  let endNormPos = 0
  for (let i = realStart; i < nodeText.length && endNormPos < normalizedSearch.length; i++) {
    const ch = nodeText[i]
    if (!/[\u201c\u201d\u2018\u2019"']/.test(ch)) {
      endNormPos++
    }
    realEnd = i + 1
  }

  const before = nodeText.substring(0, realStart)
  const match = nodeText.substring(realStart, realEnd)
  const after = nodeText.substring(realEnd)

  const parent = textNode.parentNode!
  const span = doc.createElement('span')
  span.className = 'tts-highlight'
  span.textContent = match

  if (before) parent.insertBefore(doc.createTextNode(before), textNode)
  parent.insertBefore(span, textNode)
  if (after) parent.insertBefore(doc.createTextNode(after), textNode)
  parent.removeChild(textNode)

  return true
}

/**
 * 高亮当前播放的句子
 * 在 iframe DOM 中精确定位句子文本，用 <span class="tts-highlight"> 包裹
 */
function highlightCurrentSentence(originalText: string) {
  if (!viewInstance) return
  try {
    const contents = viewInstance.renderer?.getContents?.()
    if (!contents?.length) return
    const doc = contents[0].doc

    // 清除之前的高亮（解包 span）
    clearTTSHighlight(doc)

    if (!originalText) return

    // 用前 30 字符定位文本节点，用完整句子文本包裹高亮
    const searchKey = originalText.replace(/[\u201c\u201d\u2018\u2019"']/g, '').trim().slice(0, 30)
    const fullText = originalText.replace(/[\u201c\u201d\u2018\u2019"']/g, '').trim()
    if (!searchKey) return

    // 遍历所有文本节点，查找包含目标文本的节点
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null)
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (!node.textContent || node.textContent.trim().length < 3) continue
      const normalized = node.textContent.replace(/[\u201c\u201d\u2018\u2019"']/g, '')
      if (normalized.includes(searchKey)) {
        // 优先用完整句子文本包裹，如果节点内包含完整句子则包裹全部，否则回退到搜索关键词
        const wrapText = normalized.includes(fullText) ? fullText : searchKey
        const found = wrapTextInNode(doc, node, wrapText)
        if (found) {
          // 滚动到高亮元素
          const highlightEl = doc.querySelector('.tts-highlight')
          if (highlightEl) {
            try { highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
          }
          break
        }
      }
    }
  } catch {}
}

function handleTTSToggle() {
  if (!ttsStore.isEnabled) return

  if (ttsStore.state.isPlaying) {
    ttsPlayer?.pause()
    return
  }

  // 暂停后恢复：player 存在且已有句子数据，从当前位置继续
  if (ttsPlayer && ttsStore.state.currentSentenceIndex > 0) {
    ttsPlayer.play(ttsStore.state.currentSentenceIndex)
    return
  }

  // 首次播放：创建 player 并从头开始
  startTTSPlayback()
}

/**
 * 创建 TTSPlayer 并开始播放当前章节
 */
function startTTSPlayback() {
  ttsPlayer = new TTSPlayer()
  ttsPlayer.onSentenceChange = (_index, originalText) => {
    if (ttsStore.settings.highlightSync) {
      highlightCurrentSentence(originalText)
    }
  }
  ttsPlayer.onChapterEnd = () => {
    // 当前章节播完，尝试翻到下一章继续
    playNextChapter()
  }
  ttsPlayer.onBookEnd = () => {
    ttsStore.resetState()
  }
  ttsPlayer.onError = (err) => {
    console.error('TTS 播放错误:', err)
  }

  const chapterText = getCurrentChapterText()
  if (chapterText) {
    ttsPlayer.prepare(chapterText)
    ttsPlayer.play()
  }
}

/**
 * 翻到下一章并继续 TTS 播放
 */
async function playNextChapter() {
  if (!viewInstance) {
    ttsStore.resetState()
    return
  }

  // 清除当前高亮
  try {
    const contents = viewInstance.renderer?.getContents?.()
    if (contents?.length) {
      clearTTSHighlight(contents[0].doc)
    }
  } catch {}

  // 翻到下一页/下一章
  const couldGo = viewInstance.next?.()
  if (!couldGo) {
    // 已到书末，停止播放
    ttsStore.resetState()
    ttsPlayer?.stop()
    ttsPlayer = null
    return
  }

  // 等待新内容加载
  await waitForContentLoad()

  // 获取新章节文本并继续播放
  const chapterText = getCurrentChapterText()
  if (chapterText && ttsPlayer) {
    ttsPlayer.prepare(chapterText)
    ttsPlayer.play()
  } else {
    ttsStore.resetState()
  }
}

/**
 * 等待新页面/章节内容加载完成
 */
function waitForContentLoad(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false
    const done = () => {
      if (resolved) return
      resolved = true
      resolve()
    }

    // 监听 handleLoad 事件（foliate 在新 section 加载时触发 draw-annotation）
    // 用轮询检测内容变化，最多等 3 秒
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      const text = getCurrentChapterText()
      if (text && text.trim().length > 10) {
        clearInterval(interval)
        done()
      } else if (elapsed >= 3000) {
        clearInterval(interval)
        done()
      }
    }, 100)
  })
}

function handleTTSStop() {
  ttsPlayer?.stop()
  ttsPlayer = null
  ttsStore.resetState()
  // 清除高亮
  if (viewInstance) {
    try {
      const contents = viewInstance.renderer?.getContents?.()
      if (contents?.length) {
        clearTTSHighlight(contents[0].doc)
      }
    } catch {}
  }
}

function checkSelection() {
  if (selectionCooldown) return
  if (!viewInstance) return
  try {
    const contents = viewInstance.renderer?.getContents?.()
    if (!contents?.length) return
    const content = contents[0]
    const doc = content.doc
    const win = doc.defaultView
    if (!win) return
    const selection = win.getSelection()
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0)
      const cfi = viewInstance.getCFI?.(content.index, range)
      const text = selection.toString()
      const rect = range.getBoundingClientRect()
      const iframe = win.frameElement as HTMLElement | null
      const iframeRect = iframe?.getBoundingClientRect()
      let x: number
      let y: number
      if (iframe && iframeRect) {
        x = iframeRect.left + rect.left + rect.width / 2
        y = iframeRect.top + rect.top - 10
      } else {
        x = lastMouseX
        y = lastMouseY - 10
      }

      window.dispatchEvent(new CustomEvent('text-selected', {
        detail: { cfiRange: cfi, text, x, y, rectRight: iframeRect ? iframeRect.left + rect.right : 0, rectBottom: iframeRect ? iframeRect.top + rect.bottom : 0 }
      }))
    }
  } catch {}
}

function goNextChapter() {
  if (!viewInstance) return
  showNextChapter.value = false
  viewInstance.next?.()
}

function goPrevChapter() {
  if (!viewInstance) return
  showPrevChapter.value = false
  viewInstance.prev?.()
}

watch(() => settings.settings.theme, async (theme) => {
  applyThemeFilter(viewInstance, theme)
  await injectCustomFontFace(viewInstance, settings.customFonts, settings.settings.fontFamily)
  applyReaderStyles(viewInstance, settings.settings, settings.customFonts)
})

watch(() => settings.settings.readerMode, (mode) => {
  setFlowMode(viewInstance, mode)
})

watch(() => [settings.settings.fontSize, settings.settings.lineHeight, settings.settings.letterSpacing, settings.settings.fontFamily, settings.settings.fontBold], async () => {
  await injectCustomFontFace(viewInstance, settings.customFonts, settings.settings.fontFamily)
  applyReaderStyles(viewInstance, settings.settings, settings.customFonts)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', handleMainMouseUp)
  window.removeEventListener('selection-cooldown', handleSelectionCooldown)
  window.removeEventListener('render-annotation', handleRenderAnnotation)
  window.removeEventListener('remove-annotation-overlay', handleRemoveAnnotationOverlay)
  window.removeEventListener('tts-toggle-play', handleTTSToggle)
  window.removeEventListener('tts-stop', handleTTSStop)
  ttsPlayer?.stop()
  ttsPlayer = null
  noteRangesMap.clear()
  if (viewInstance) {
    try {
      viewInstance.close?.()
    } catch {}
  }
  viewInstance = null
})
</script>

<template>
  <div ref="containerRef" class="viewer-container">
    <div v-if="reader.isLoading" class="viewer-loading">
      <div class="spinner"></div>
      <span>正在加载书籍...</span>
    </div>
    <Transition name="chapter-float">
      <button v-if="showPrevChapter" class="chapter-btn prev-chapter-btn" @click="goPrevChapter">
        <ChevronUp :size="12" />
        <span>上一章</span>
      </button>
    </Transition>
    <Transition name="chapter-float">
      <button v-if="showNextChapter" class="chapter-btn next-chapter-btn" @click="goNextChapter">
        <ChevronDown :size="12" />
        <span>下一章</span>
      </button>
    </Transition>
    <Transition name="tooltip-fade">
      <div v-if="tooltipVisible" class="annotation-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
        {{ tooltipText }}
      </div>
    </Transition>
    <Transition name="image-viewer-fade">
      <div v-if="imageViewerVisible" class="image-viewer-overlay" @click="closeImageViewer">
        <img :src="imageViewerSrc" class="image-viewer-img" @click.stop />
      </div>
    </Transition>
  </div>
</template>
<style lang="scss" scoped>
.viewer-container {
  flex: 1;
  overflow: hidden;
  position: relative;

  :deep(foliate-view) {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.viewer-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--reader-bg);
  color: var(--text-secondary);
  z-index: 5;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chapter-btn {
  position: absolute;
  right: 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: var(--reader-bg);
  color: var(--reader-text);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.2s, box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  &:active {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
}

.prev-chapter-btn {
  top: 24px;
}

.next-chapter-btn {
  bottom: 24px;
}

.chapter-float-enter-active,
.chapter-float-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.prev-chapter-btn.chapter-float-enter-from,
.prev-chapter-btn.chapter-float-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.next-chapter-btn.chapter-float-enter-from,
.next-chapter-btn.chapter-float-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.annotation-tooltip {
  position: fixed;
  z-index: 60;
  max-width: 280px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
  transform: translateX(-50%) translateY(-100%);
  pointer-events: none;
  word-break: break-word;

  &::before {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    margin-left: -6px;
    border-width: 6px 6px 0;
    border-style: solid;
    border-color: var(--border-color) transparent transparent transparent;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    margin-left: -5px;
    border-width: 5px 5px 0;
    border-style: solid;
    border-color: var(--bg-secondary) transparent transparent transparent;
  }
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.image-viewer-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
  user-select: none;
}

.image-viewer-fade-enter-active,
.image-viewer-fade-leave-active {
  transition: opacity 0.25s;
}

.image-viewer-fade-enter-from,
.image-viewer-fade-leave-to {
  opacity: 0;
}
</style>
