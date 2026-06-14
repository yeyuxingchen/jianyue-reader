export function compressCoverToJpeg(
  imageDataUrl: string,
  maxWidth = 200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    img.onerror = () => resolve('')
    img.src = imageDataUrl
  })
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

function getMimeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return MIME_MAP[ext] || 'image/jpeg'
}

export async function getCoverUrl(coverPath: string): Promise<string> {
  if (!coverPath) return ''
  try {
    if (!await window.services.coverFileExists(coverPath)) return ''
    const buffer = await window.services.readFileAsBuffer(coverPath)
    const mime = getMimeFromPath(coverPath)
    const blob = new Blob([buffer], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    return ''
  }
}

export function revokeCoverUrl(url: string) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
