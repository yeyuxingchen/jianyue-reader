import * as CFI from './epubcfi.js'
import { TOCProgress, SectionProgress } from './progress.js'
import { Overlayer } from './overlayer.js'
import { textWalker } from './text-walker.js'

const SEARCH_PREFIX = 'foliate-search:'

const isZip = async file => {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    return arr[0] === 0x50 && arr[1] === 0x4b && arr[2] === 0x03 && arr[3] === 0x04
}

const isCBZ = ({ name, type }) =>
    type === 'application/vnd.comicbook+zip' || name.endsWith('.cbz')

const isFB2 = ({ name, type }) =>
    type === 'application/x-fictionbook+xml' || name.endsWith('.fb2')

const isFBZ = ({ name, type }) =>
    type === 'application/x-zip-compressed-fb2'
    || name.endsWith('.fb2.zip') || name.endsWith('.fbz')

const isTXT = ({ name, type }) =>
    type === 'text/plain' || name.endsWith('.txt')

const escapeHtml = str => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const detectChapters = text => {
    const chapters = []
    const lines = text.split('\n')
    const patterns = [
        { regex: /^第[零一二三四五六七八九十百千万\d]+[章回节卷集部篇]\s*.*/ },
        { regex: /^chapter\s+\d+.*$/i },
        { regex: /^[一二三四五六七八九十\d]+[.、）)]\s*\S.*/ },
        { regex: /^[（(][一二三四五六七八九十\d]+[）)]\s*.*/ },
    ]
    let currentChapter = null
    let firstChapterLine = -1
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (!trimmed) continue
        let matched = false
        for (const pattern of patterns) {
            if (pattern.regex.test(trimmed)) {
                if (firstChapterLine === -1) firstChapterLine = i
                if (currentChapter) chapters.push(currentChapter)
                currentChapter = { title: trimmed, lineStart: i, lineEnd: i }
                matched = true
                break
            }
        }
        if (!matched && currentChapter) currentChapter.lineEnd = i
    }
    if (currentChapter) chapters.push(currentChapter)
    // preserve content before the first chapter as a prologue
    if (firstChapterLine > 0) {
        const prologueText = lines.slice(0, firstChapterLine).join('\n').trim()
        if (prologueText) {
            chapters.unshift({ title: '序', lineStart: 0, lineEnd: firstChapterLine - 1 })
        }
    }
    return chapters
}

const optimizeChapterBoundaries = (chapters, totalLines) => {
    for (let i = 0; i < chapters.length; i++) {
        chapters[i].lineEnd = i < chapters.length - 1
            ? chapters[i + 1].lineStart - 1
            : totalLines - 1
    }
    // merge short chapters (< 10 lines)
    const optimized = []
    let i = 0
    while (i < chapters.length) {
        let current = { ...chapters[i] }
        while (i + 1 < chapters.length && (current.lineEnd - current.lineStart) < 10) {
            current.lineEnd = chapters[i + 1].lineEnd
            current.title = current.title + ' / ' + chapters[i + 1].title
            i++
        }
        optimized.push(current)
        i++
    }
    return optimized
}

const handleNoChapters = text => {
    const totalLines = text.split('\n').length
    if (totalLines < 500) {
        return [{ title: '全文', lineStart: 0, lineEnd: totalLines - 1 }]
    }
    const chapters = []
    const linesPerChapter = 1000
    for (let i = 0; i < totalLines; i += linesPerChapter) {
        chapters.push({
            title: `第${chapters.length + 1}部分`,
            lineStart: i,
            lineEnd: Math.min(i + linesPerChapter, totalLines) - 1,
        })
    }
    return chapters
}

const detectEncoding = buffer => {
    const bytes = new Uint8Array(buffer)
    // BOM detection
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
        return 'utf-8'
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE)
        return 'utf-16le'
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF)
        return 'utf-16be'
    // Try UTF-8 validation
    try {
        const decoder = new TextDecoder('utf-8', { fatal: true })
        decoder.decode(buffer)
        return 'utf-8'
    } catch {}
    // Fallback to GBK for Chinese text
    return 'gbk'
}

const decodeBuffer = buffer => {
    const encoding = detectEncoding(buffer)
    const decoder = new TextDecoder(encoding, { fatal: false })
    return decoder.decode(buffer)
}

const extractMetadata = (text, fileName) => {
    // only scan the first 50 lines for metadata
    const headLines = text.split('\n').slice(0, 50)
    const head = headLines.join('\n')
    let title = ''
    let author = ''

    // author patterns (order matters: specific first)
    const authorPatterns = [
        /(?:作者|著者|原著者)[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
        /(?:作者|著者|原著者)[：:\s]+(.+)/,
        /(?:原著|著|撰|编写|编撰|编写)[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
        /(?:原著|著|撰|编写|编撰|编写)[：:\s]+(.+)/,
        /[【\[](?:作者|著者)[】\]][：:\s]*(.+?)(?:\s*$|\s*[【\[])/,
        /[【\[](?:作者|著者)[】\]][：:\s]*(.+)/,
        /(.+?)(?:\s+著\s*$|\s+撰\s*$|\s+编写\s*$)/,
    ]

    // title patterns
    const titlePatterns = [
        /《([^》]+)》/,
        /[【\[]书名[】\]][：:\s]*([^【\[\n]+)/,
        /书名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t]|\s*作者)/,
        /作品名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t]|\s*作者)/,
        /原名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
        /(?:标题|题目)[：:\s]*(\S+)/,
    ]

    // try to find title
    for (const pattern of titlePatterns) {
        const match = head.match(pattern)
        if (match) { title = match[1].trim(); break }
    }

    // try to find author
    for (const pattern of authorPatterns) {
        const match = head.match(pattern)
        if (match) { author = match[1].trim(); break }
    }

    // if title contains author marker, split them (e.g. "《夜月血》 作者：乱")
    if (title && !author) {
        const splitMatch = title.match(/^(.+?)\s+(?:作者|著|撰|原著|编写)[：:\s]/)
        if (splitMatch) {
            title = splitMatch[1].trim()
        }
    }

    // clean author: remove trailing punctuation and "著"
    author = author.replace(/[\s　]+(著|撰|编写)?$/, '').replace(/[，,。.；;！!？?]+$/, '')

    // clean title: remove author info if accidentally included
    title = title.replace(/\s*(?:作者|著|撰|原著|编写)[：:\s]+.*$/, '').trim()

    // note: do NOT fallback to file name here, otherwise opening will overwrite
    // the user-defined title in the library with the file name.

    const metadata = { title }
    if (author) metadata.author = { name: author }
    return metadata
}

const makeTXTBook = async file => {
    const buffer = await file.arrayBuffer()
    const text = decodeBuffer(buffer)
    const lines = text.split('\n')
    const totalLines = lines.length
    const rawChapters = detectChapters(text)
    const chapters = rawChapters.length > 0
        ? optimizeChapterBoundaries(rawChapters, totalLines)
        : handleNoChapters(text)

    const urls = []
    const book = {}
    book.metadata = extractMetadata(text, file.name)
    book.sections = chapters.map((chapter, index) => {
        const chapterText = lines.slice(chapter.lineStart, chapter.lineEnd + 1).join('\n')
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre style="white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 1em;">${escapeHtml(chapterText)}</pre></body></html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        urls.push(url)
        return {
            id: `section-${index}`,
            load: () => url,
            createDocument: () => new DOMParser().parseFromString(html, 'text/html'),
            size: blob.size,
        }
    })
    book.toc = chapters.map((chapter, index) => ({
        label: chapter.title,
        href: `section-${index}`,
    }))
    book.resolveHref = href => {
        const index = book.sections.findIndex(s => s.id === href)
        return { index: index >= 0 ? index : 0 }
    }
    book.splitTOCHref = href => [href, null]
    book.getTOCFragment = doc => doc.documentElement
    book.isExternal = uri => /^\w+:/i.test(uri) && !uri.startsWith('#')
    book.destroy = () => { for (const url of urls) URL.revokeObjectURL(url) }
    return book
}

const makeZipLoader = async file => {
    // 如果有预加载的 EPUB 条目数据（从主进程传递过来），直接使用
    // 避免在渲染进程中使用 zip.js 导致崩溃
    const preloaded = typeof window !== 'undefined' && window.__preloadedEpubEntries
    if (preloaded) {
        const entries = Array.from(preloaded.keys())
        const loadText = async name => {
            const data = preloaded.get(name)
            if (!data) return null
            return new TextDecoder().decode(data)
        }
        const loadBlob = (name, type) => {
            const data = preloaded.get(name)
            if (!data) return null
            return new Blob([data], { type })
        }
        const getSize = name => preloaded.get(name)?.length ?? 0
        return { entries, loadText, loadBlob, getSize }
    }

    const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } =
        await import('./vendor/zip.js')
    configure({ useWebWorkers: false, useCompressionStream: false })
    const reader = new ZipReader(new BlobReader(file))
    const entries = await reader.getEntries()
    const map = new Map(entries.map(entry => [entry.filename, entry]))
    const load = f => (name, ...args) =>
        map.has(name) ? f(map.get(name), ...args) : null
    const loadText = load(entry => entry.getData(new TextWriter()))
    const loadBlob = load((entry, type) => entry.getData(new BlobWriter(type)))
    const getSize = name => map.get(name)?.uncompressedSize ?? 0
    return { entries, loadText, loadBlob, getSize }
}

const getFileEntries = async entry => entry.isFile ? entry
    : (await Promise.all(Array.from(
        await new Promise((resolve, reject) => entry.createReader()
            .readEntries(entries => resolve(entries), error => reject(error))),
        getFileEntries))).flat()

const makeDirectoryLoader = async entry => {
    const entries = await getFileEntries(entry)
    const files = await Promise.all(
        entries.map(entry => new Promise((resolve, reject) =>
            entry.file(file => resolve([file, entry.fullPath]),
                error => reject(error)))))
    const map = new Map(files.map(([file, path]) =>
        [path.replace(entry.fullPath + '/', ''), file]))
    const decoder = new TextDecoder()
    const decode = x => x ? decoder.decode(x) : null
    const getBuffer = name => map.get(name)?.arrayBuffer() ?? null
    const loadText = async name => decode(await getBuffer(name))
    const loadBlob = name => map.get(name)
    const getSize = name => map.get(name)?.size ?? 0
    return { loadText, loadBlob, getSize }
}

export class ResponseError extends Error {}
export class NotFoundError extends Error {}
export class UnsupportedTypeError extends Error {}

const fetchFile = async url => {
    const res = await fetch(url)
    if (!res.ok) throw new ResponseError(
        `${res.status} ${res.statusText}`, { cause: res })
    return new File([await res.blob()], new URL(res.url).pathname)
}

export const makeBook = async file => {
    if (typeof file === 'string') file = await fetchFile(file)
    let book
    if (file.isDirectory) {
        const loader = await makeDirectoryLoader(file)
        const { EPUB } = await import('./epub.js')
        book = await new EPUB(loader).init()
    }
    else if (!file.size) throw new NotFoundError('File not found')
    else if (await isZip(file)) {
        const loader = await makeZipLoader(file)
        if (isCBZ(file)) {
            const { makeComicBook } = await import('./comic-book.js')
            book = makeComicBook(loader, file)
        }
        else if (isFBZ(file)) {
            const { makeFB2 } = await import('./fb2.js')
            const { entries } = loader
            const entry = entries.find(entry => entry.filename.endsWith('.fb2'))
            const blob = await loader.loadBlob((entry ?? entries[0]).filename)
            book = await makeFB2(blob)
        }
        else {
            const { EPUB } = await import('./epub.js')
            book = await new EPUB(loader).init()
        }
    }
    else {
        const { isMOBI, MOBI } = await import('./mobi.js')
        if (await isMOBI(file)) {
            const fflate = await import('./vendor/fflate.js')
            book = await new MOBI({ unzlib: fflate.unzlibSync }).open(file)
        }
        else if (isFB2(file)) {
            const { makeFB2 } = await import('./fb2.js')
            book = await makeFB2(file)
        }
        else if (isTXT(file)) {
            book = await makeTXTBook(file)
        }
    }
    if (!book) throw new UnsupportedTypeError('File type not supported')
    return book
}

class CursorAutohider {
    #timeout
    #el
    #check
    #state
    constructor(el, check, state = {}) {
        this.#el = el
        this.#check = check
        this.#state = state
        if (this.#state.hidden) this.hide()
        this.#el.addEventListener('mousemove', ({ screenX, screenY }) => {
            // check if it actually moved
            if (screenX === this.#state.x && screenY === this.#state.y) return
            this.#state.x = screenX, this.#state.y = screenY
            this.show()
            if (this.#timeout) clearTimeout(this.#timeout)
            if (check()) this.#timeout = setTimeout(this.hide.bind(this), 1000)
        }, false)
    }
    cloneFor(el) {
        return new CursorAutohider(el, this.#check, this.#state)
    }
    hide() {
        this.#el.style.cursor = 'none'
        this.#state.hidden = true
    }
    show() {
        this.#el.style.removeProperty('cursor')
        this.#state.hidden = false
    }
}

class History extends EventTarget {
    #arr = []
    #index = -1
    pushState(x) {
        const last = this.#arr[this.#index]
        if (last === x || last?.fraction && last.fraction === x.fraction) return
        this.#arr[++this.#index] = x
        this.#arr.length = this.#index + 1
        this.dispatchEvent(new Event('index-change'))
    }
    replaceState(x) {
        const index = this.#index
        this.#arr[index] = x
    }
    back() {
        const index = this.#index
        if (index <= 0) return
        const detail = { state: this.#arr[index - 1] }
        this.#index = index - 1
        this.dispatchEvent(new CustomEvent('popstate', { detail }))
        this.dispatchEvent(new Event('index-change'))
    }
    forward() {
        const index = this.#index
        if (index >= this.#arr.length - 1) return
        const detail = { state: this.#arr[index + 1] }
        this.#index = index + 1
        this.dispatchEvent(new CustomEvent('popstate', { detail }))
        this.dispatchEvent(new Event('index-change'))
    }
    get canGoBack() {
        return this.#index > 0
    }
    get canGoForward() {
        return this.#index < this.#arr.length - 1
    }
    clear() {
        this.#arr = []
        this.#index = -1
    }
}

const languageInfo = lang => {
    if (!lang) return {}
    try {
        const canonical = Intl.getCanonicalLocales(lang)[0]
        const locale = new Intl.Locale(canonical)
        const isCJK = ['zh', 'ja', 'kr'].includes(locale.language)
        const direction = (locale.getTextInfo?.() ?? locale.textInfo)?.direction
        return { canonical, locale, isCJK, direction }
    } catch (e) {
        console.warn(e)
        return {}
    }
}

export class View extends HTMLElement {
    #root = this.attachShadow({ mode: 'closed' })
    #sectionProgress
    #tocProgress
    #pageProgress
    #searchResults = new Map()
    #searchDraw
    #searchDrawOptions
    #cursorAutohider = new CursorAutohider(this, () =>
        this.hasAttribute('autohide-cursor'))
    isFixedLayout = false
    lastLocation
    history = new History()
    constructor() {
        super()
        this.history.addEventListener('popstate', ({ detail }) => {
            const resolved = this.resolveNavigation(detail.state)
            this.renderer.goTo(resolved)
        })
    }
    async open(book) {
        if (typeof book === 'string'
        || typeof book.arrayBuffer === 'function'
        || book.isDirectory) book = await makeBook(book)
        this.book = book
        this.language = languageInfo(book.metadata?.language)

        if (book.splitTOCHref && book.getTOCFragment) {
            const ids = book.sections.map(s => s.id)
            this.#sectionProgress = new SectionProgress(book.sections, 1500, 1600)
            const splitHref = book.splitTOCHref.bind(book)
            const getFragment = book.getTOCFragment.bind(book)
            this.#tocProgress = new TOCProgress()
            await this.#tocProgress.init({
                toc: book.toc ?? [], ids, splitHref, getFragment })
            this.#pageProgress = new TOCProgress()
            await this.#pageProgress.init({
                toc: book.pageList ?? [], ids, splitHref, getFragment })
        }

        this.isFixedLayout = this.book.rendition?.layout === 'pre-paginated'
        if (this.isFixedLayout) {
            await import('./fixed-layout.js')
            this.renderer = document.createElement('foliate-fxl')
        } else {
            await import('./paginator.js')
            this.renderer = document.createElement('foliate-paginator')
        }
        this.renderer.setAttribute('exportparts', 'head,foot,filter')
        this.renderer.addEventListener('load', e => this.#onLoad(e.detail))
        this.renderer.addEventListener('relocate', e => this.#onRelocate(e.detail))
        this.renderer.addEventListener('create-overlayer', e =>
            e.detail.attach(this.#createOverlayer(e.detail)))
        this.renderer.open(book)
        this.#root.append(this.renderer)

        if (book.sections.some(section => section.mediaOverlay)) {
            const activeClass = book.media.activeClass
            const playbackActiveClass = book.media.playbackActiveClass
            this.mediaOverlay = book.getMediaOverlay()
            let lastActive
            this.mediaOverlay.addEventListener('highlight', e => {
                const resolved = this.resolveNavigation(e.detail.text)
                this.renderer.goTo(resolved)
                    .then(() => {
                        const { doc } = this.renderer.getContents()
                            .find(x => x.index = resolved.index)
                        const el = resolved.anchor(doc)
                        el.classList.add(activeClass)
                        if (playbackActiveClass) el.ownerDocument
                            .documentElement.classList.add(playbackActiveClass)
                        lastActive = new WeakRef(el)
                    })
            })
            this.mediaOverlay.addEventListener('unhighlight', () => {
                const el = lastActive?.deref()
                if (el) {
                    el.classList.remove(activeClass)
                    if (playbackActiveClass) el.ownerDocument
                        .documentElement.classList.remove(playbackActiveClass)
                }
            })
        }
    }
    close() {
        this.renderer?.destroy()
        this.renderer?.remove()
        this.#sectionProgress = null
        this.#tocProgress = null
        this.#pageProgress = null
        this.#searchResults = new Map()
        this.lastLocation = null
        this.history.clear()
        this.tts = null
        this.mediaOverlay = null
    }
    goToTextStart() {
        return this.goTo(this.book.landmarks
            ?.find(m => m.type.includes('bodymatter') || m.type.includes('text'))
            ?.href ?? this.book.sections.findIndex(s => s.linear !== 'no'))
    }
    async init({ lastLocation, showTextStart }) {
        const resolved = lastLocation ? this.resolveNavigation(lastLocation) : null
        if (resolved) {
            await this.renderer.goTo(resolved)
            this.history.pushState(lastLocation)
        }
        else if (showTextStart) await this.goToTextStart()
        else {
            this.history.pushState(0)
            await this.next()
        }
    }
    #emit(name, detail, cancelable) {
        return this.dispatchEvent(new CustomEvent(name, { detail, cancelable }))
    }
    #onRelocate({ reason, range, index, fraction, size }) {
        const progress = this.#sectionProgress?.getProgress(index, fraction, size) ?? {}
        const tocItem = this.#tocProgress?.getProgress(index, range)
        const pageItem = this.#pageProgress?.getProgress(index, range)
        let cfi
        try { cfi = this.getCFI(index, range) } catch { cfi = this.book.sections[index]?.cfi ?? '' }
        this.lastLocation = { ...progress, tocItem, pageItem, cfi, range }
        if (reason === 'snap' || reason === 'page' || reason === 'scroll')
            this.history.replaceState(cfi)
        this.#emit('relocate', this.lastLocation)
    }
    #onLoad({ doc, index }) {
        // set language and dir if not already set
        doc.documentElement.lang ||= this.language.canonical ?? ''
        if (!this.language.isCJK)
            doc.documentElement.dir ||= this.language.direction ?? ''

        this.#handleLinks(doc, index)
        this.#cursorAutohider.cloneFor(doc.documentElement)

        this.#emit('load', { doc, index })
    }
    #handleLinks(doc, index) {
        const { book } = this
        const section = book.sections[index]
        doc.addEventListener('click', e => {
            const a = e.target.closest('a[href]')
            if (!a) return
            e.preventDefault()
            const href_ = a.getAttribute('href')
            const href = section?.resolveHref?.(href_) ?? href_
            if (book?.isExternal?.(href))
                Promise.resolve(this.#emit('external-link', { a, href_ }, true))
                    .then(x => x ? globalThis.open(href_, '_blank') : null)
                    .catch(e => console.error(e))
            else Promise.resolve(this.#emit('link', { a, href }, true))
                .then(x => x ? this.goTo(href) : null)
                .catch(e => console.error(e))
        })
    }
    async addAnnotation(annotation, remove) {
        const { value } = annotation
        if (value.startsWith(SEARCH_PREFIX)) {
            const cfi = value.replace(SEARCH_PREFIX, '')
            const { index, anchor } = await this.resolveNavigation(cfi)
            const obj = this.#getOverlayer(index)
            if (obj) {
                const { overlayer, doc } = obj
                if (remove) {
                    overlayer.remove(value)
                    return
                }
                const range = doc ? anchor(doc) : anchor
                overlayer.add(value, range, this.#searchDraw, this.#searchDrawOptions)
            }
            return
        }
        const { index, anchor } = await this.resolveNavigation(value)
        const obj = this.#getOverlayer(index)
        if (obj) {
            const { overlayer, doc } = obj
            overlayer.remove(value)
            if (!remove) {
                const range = doc ? anchor(doc) : anchor
                const draw = (func, opts) => overlayer.add(value, range, func, opts)
                this.#emit('draw-annotation', { draw, annotation, doc, range })
            }
        }
        const label = this.#tocProgress.getProgress(index)?.label ?? ''
        return { index, label }
    }
    deleteAnnotation(annotation) {
        return this.addAnnotation(annotation, true)
    }
    #getOverlayer(index) {
        return this.renderer.getContents()
            .find(x => x.index === index && x.overlayer)
    }
    #createOverlayer({ doc, index }) {
        const overlayer = new Overlayer()
        doc.addEventListener('click', e => {
            const [value, range] = overlayer.hitTest(e)
            if (value && !value.startsWith(SEARCH_PREFIX)) {
                this.#emit('show-annotation', { value, index, range })
            }
        }, false)

        const list = this.#searchResults.get(index)
        if (list) for (const item of list) this.addAnnotation(item)

        this.#emit('create-overlay', { index })
        return overlayer
    }
    async showAnnotation(annotation) {
        const { value } = annotation
        const resolved = await this.goTo(value)
        if (resolved) {
            const { index, anchor } = resolved
            const { doc } =  this.#getOverlayer(index)
            const range = anchor(doc)
            this.#emit('show-annotation', { value, index, range })
        }
    }
    getCFI(index, range) {
        const baseCFI = this.book.sections[index].cfi ?? CFI.fake.fromIndex(index)
        if (!range) return baseCFI
        return CFI.joinIndir(baseCFI, CFI.fromRange(range))
    }
    resolveCFI(cfi) {
        if (this.book.resolveCFI)
            return this.book.resolveCFI(cfi)
        else {
            const parts = CFI.parse(cfi)
            const index = CFI.fake.toIndex((parts.parent ?? parts).shift())
            const anchor = doc => CFI.toRange(doc, parts)
            return { index, anchor }
        }
    }
    resolveNavigation(target) {
        try {
            if (typeof target === 'number') return { index: target }
            if (typeof target.fraction === 'number') {
                const [index, anchor] = this.#sectionProgress.getSection(target.fraction)
                return { index, anchor }
            }
            if (CFI.isCFI.test(target)) return this.resolveCFI(target)
            return this.book.resolveHref(target)
        } catch (e) {
            console.error(e)
            console.error(`Could not resolve target ${target}`)
        }
    }
    async goTo(target) {
        const resolved = this.resolveNavigation(target)
        try {
            await this.renderer.goTo(resolved)
            this.history.pushState(target)
            return resolved
        } catch(e) {
            console.error(e)
            console.error(`Could not go to ${target}`)
        }
    }
    async goToFraction(frac) {
        const [index, anchor] = this.#sectionProgress.getSection(frac)
        await this.renderer.goTo({ index, anchor })
        this.history.pushState({ fraction: frac })
    }
    async select(target) {
        try {
            const obj = await this.resolveNavigation(target)
            await this.renderer.goTo({ ...obj, select: true })
            this.history.pushState(target)
        } catch(e) {
            console.error(e)
            console.error(`Could not go to ${target}`)
        }
    }
    deselect() {
        for (const { doc } of this.renderer.getContents())
            doc.defaultView.getSelection().removeAllRanges()
    }
    getSectionFractions() {
        return (this.#sectionProgress?.sectionFractions ?? [])
            .map(x => x + Number.EPSILON)
    }
    getProgressOf(index, range) {
        const tocItem = this.#tocProgress?.getProgress(index, range)
        const pageItem = this.#pageProgress?.getProgress(index, range)
        return { tocItem, pageItem }
    }
    async getTOCItemOf(target) {
        try {
            const { index, anchor } = await this.resolveNavigation(target)
            const doc = await this.book.sections[index].createDocument()
            const frag = anchor(doc)
            const isRange = frag instanceof Range
            const range = isRange ? frag : doc.createRange()
            if (!isRange) range.selectNodeContents(frag)
            return this.#tocProgress.getProgress(index, range)
        } catch(e) {
            console.error(e)
            console.error(`Could not get ${target}`)
        }
    }
    async prev(distance) {
        await this.renderer.prev(distance)
    }
    async next(distance) {
        await this.renderer.next(distance)
    }
    goLeft() {
        return this.book.dir === 'rtl' ? this.next() : this.prev()
    }
    goRight() {
        return this.book.dir === 'rtl' ? this.prev() : this.next()
    }
    async * #searchSection(matcher, query, index) {
        const doc = await this.book.sections[index].createDocument()
        for (const { range, excerpt } of matcher(doc, query))
            yield { cfi: this.getCFI(index, range), excerpt }
    }
    async * #searchBook(matcher, query) {
        const { sections } = this.book
        for (const [index, { createDocument }] of sections.entries()) {
            if (!createDocument) continue
            const doc = await createDocument()
            const subitems = Array.from(matcher(doc, query), ({ range, excerpt }) =>
                ({ cfi: this.getCFI(index, range), excerpt }))
            const progress = (index + 1) / sections.length
            yield { progress }
            if (subitems.length) yield { index, subitems }
        }
    }
    async * search(opts) {
        this.clearSearch()
        this.#searchDraw = opts.draw ?? Overlayer.outline
        this.#searchDrawOptions = opts.drawOptions
        const { searchMatcher } = await import('./search.js')
        const { query, index } = opts
        const matcher = searchMatcher(textWalker,
            { defaultLocale: this.language, ...opts })
        const iter = index != null
            ? this.#searchSection(matcher, query, index)
            : this.#searchBook(matcher, query)

        const list = []
        this.#searchResults.set(index, list)

        for await (const result of iter) {
            if (result.subitems){
                const list = result.subitems
                    .map(({ cfi }) => ({ value: SEARCH_PREFIX + cfi }))
                this.#searchResults.set(result.index, list)
                for (const item of list) this.addAnnotation(item)
                yield {
                    label: this.#tocProgress.getProgress(result.index)?.label ?? '',
                    subitems: result.subitems,
                }
            }
            else {
                if (result.cfi) {
                    const item = { value: SEARCH_PREFIX + result.cfi }
                    list.push(item)
                    this.addAnnotation(item)
                }
                yield result
            }
        }
        yield 'done'
    }
    clearSearch() {
        for (const list of this.#searchResults.values())
            for (const item of list) this.deleteAnnotation(item)
        this.#searchResults.clear()
    }
    async initTTS(granularity = 'word', highlight) {
        const doc = this.renderer.getContents()[0].doc
        if (this.tts && this.tts.doc === doc) return
        const { TTS } = await import('./tts.js')
        this.tts = new TTS(doc, textWalker, highlight || (range =>
            this.renderer.scrollToAnchor(range, true)), granularity)
    }
    startMediaOverlay() {
        const { index } = this.renderer.getContents()[0]
        return this.mediaOverlay.start(index)
    }
}

customElements.define('foliate-view', View)
