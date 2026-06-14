export function generateCfiKey(cfi: string): string {
  let hash = 0
  for (let i = 0; i < cfi.length; i++) {
    hash = ((hash << 5) - hash) + cfi.charCodeAt(i)
    hash = hash & hash
  }
  return 'cfi_' + Math.abs(hash).toString(36)
}

export function extractExcerpt(text: string, maxLength = 80): string {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned
}

export function compareCfi(a: string, b: string): number {
  const parseCfi = (cfi: string) => {
    const nums = cfi.match(/\d+/g) || []
    return nums.map(Number)
  }
  const pa = parseCfi(a)
  const pb = parseCfi(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na !== nb) return na - nb
  }
  return 0
}
