import type { BookFormat } from '@/types'

export function detectFormat(filePath: string): BookFormat {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const formatMap: Record<string, BookFormat> = {
    epub: 'EPUB',
    txt: 'TXT',
    mobi: 'MOBI',
    azw3: 'AZW3',
    cbz: 'CBZ',
    cbr: 'CBR',
  }
  return formatMap[ext] || ext.toUpperCase()
}

export function hashPath(filePath: string): string {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'book_' + Math.abs(hash).toString(36)
}

export function extractBookTitle(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || '未知书名'
  return fileName.replace(/\.[^.]+$/, '')
}

export async function extractCover(filePath: string, format: string): Promise<string | null> {
  if (format !== 'EPUB') return null

  try {
    const arrayBuffer = await window.services.readFileAsBuffer(filePath)

    const jszip = parseZipBasic(arrayBuffer)
    if (!jszip) return null

    const coverEntry = findEpubCover(jszip)
    if (coverEntry && coverEntry.data) {
      const base64 = arrayBufferToBase64(coverEntry.data)
      return `data:image/jpeg;base64,${base64}`
    }
  } catch {}

  return null
}

interface ZipEntry {
  name: string
  data?: Uint8Array
}

function parseZipBasic(buffer: ArrayBuffer): ZipEntry[] | null {
  try {
    const view = new DataView(buffer)
    const entries: ZipEntry[] = []
    let offset = 0

    while (offset < view.byteLength - 4) {
      const sig = view.getUint32(offset, true)
      if (sig === 0x04034b50) {
        const nameLen = view.getUint16(offset + 26, true)
        const extraLen = view.getUint16(offset + 28, true)
        const compSize = view.getUint32(offset + 18, true)
        const name = new TextDecoder().decode(
          new Uint8Array(buffer, offset + 30, nameLen)
        )
        const dataStart = offset + 30 + nameLen + extraLen
        if (dataStart + compSize <= buffer.byteLength) {
          entries.push({
            name,
            data: new Uint8Array(buffer, dataStart, compSize),
          })
        }
        offset = dataStart + compSize
      } else if (sig === 0x02014b50 || sig === 0x06054b50) {
        break
      } else {
        offset++
      }
    }

    return entries.length > 0 ? entries : null
  } catch {
    return null
  }
}

function findEpubCover(entries: ZipEntry[]): ZipEntry | null {
  const coverNames = ['cover.jpg', 'cover.jpeg', 'cover.png']
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (coverNames.some((cn) => lower.endsWith(cn))) {
      return entry
    }
  }

  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (
      (lower.includes('cover') || lower.includes('titlepage')) &&
      (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png'))
    ) {
      return entry
    }
  }

  const imageExts = ['.jpg', '.jpeg', '.png']
  for (const entry of entries) {
    if (imageExts.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      return entry
    }
  }

  return null
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
    return 'utf-8'
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE)
    return 'utf-16le'
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF)
    return 'utf-16be'
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    return 'utf-8'
  } catch {}
  return 'gbk'
}

export async function extractTxtMetadata(filePath: string, fileName: string): Promise<{ title: string; author: string }> {
  try {
    const buffer = await window.services.readFileAsBuffer(filePath)
    const encoding = detectEncoding(buffer)
    const text = new TextDecoder(encoding).decode(buffer)
    const headLines = text.split('\n').slice(0, 50)
    const head = headLines.join('\n')
    let title = ''
    let author = ''

    const authorPatterns = [
      /(?:作者|著者|原著者)[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
      /(?:作者|著者|原著者)[：:\s]+(.+)/,
      /(?:原著|著|撰|编写|编撰)[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
      /(?:原著|著|撰|编写|编撰)[：:\s]+(.+)/,
      /[【\[](?:作者|著者)[】\]][：:\s]*(.+?)(?:\s*$|\s*[【\[])/,
      /[【\[](?:作者|著者)[】\]][：:\s]*(.+)/,
      /(.+?)(?:\s+著\s*$|\s+撰\s*$|\s+编写\s*$)/,
    ]
    const titlePatterns = [
      /《([^》]+)》/,
      /[【\[]书名[】\]][：:\s]*([^【\[\n]+)/,
      /书名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t]|\s*作者)/,
      /作品名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t]|\s*作者)/,
      /原名[：:\s]+(.+?)(?:\s*$|\s*[\|│,，;；\t])/,
      /(?:标题|题目)[：:\s]*(\S+)/,
    ]
    for (const re of titlePatterns) {
      const m = head.match(re)
      if (m) { title = m[1].trim(); break }
    }
    for (const re of authorPatterns) {
      const m = head.match(re)
      if (m) { author = m[1].trim(); break }
    }
    if (title && !author) {
      const split = title.match(/^(.+?)\s+(?:作者|著|撰|原著|编写)[：:\s]/)
      if (split) title = split[1].trim()
    }
    author = author.replace(/[\s　]+(著|撰|编写)?$/, '').replace(/[，,。.；;！!？?]+$/, '')
    title = title.replace(/\s*(?:作者|著|撰|原著|编写)[：:\s]+.*$/, '').trim()
    if (!title) title = fileName.replace(/\.txt$/i, '')
    return { title, author }
  } catch {
    return { title: fileName.replace(/\.txt$/i, ''), author: '' }
  }
}
