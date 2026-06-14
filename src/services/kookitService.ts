// @ts-nocheck
// Legacy kookit service - kept for reference, not actively used
// The project now uses foliate-js as the rendering engine

import type { BookFormat, ReaderMode, TocItem } from '@/types'

export interface RenderConfig {
  format: BookFormat
  readerMode: ReaderMode
  fontSize?: number
  fontFamily?: string
  lineHeight?: number
  letterSpacing?: number
  theme?: string
}

export async function createRendition(filePath: string, config: RenderConfig) {
  return null
}

export const goPrev = (rendition: any) => {
  if (rendition?.prev) return rendition.prev()
}

export const goNext = (rendition: any) => {
  if (rendition?.next) return rendition.next()
}

export const goToCfi = (rendition: any, cfi: string) => {
  if (rendition?.goTo) return rendition.goTo(cfi)
  if (rendition?.display) return rendition.display(cfi)
}

export const goToHref = (rendition: any, href: string) => {
  if (rendition?.goTo) return rendition.goTo(href)
  if (rendition?.display) return rendition.display(href)
}

export const getCurrentCfi = (rendition: any): string => {
  try {
    return rendition?.currentLocation?.()?.start?.cfi || ''
  } catch {
    return ''
  }
}

export const getToc = (rendition: any): TocItem[] => {
  try {
    const nav = rendition?.book?.navigation?.toc
    if (!nav) return []
    return nav.map(mapTocItem)
  } catch {
    return []
  }
}

function mapTocItem(item: any): TocItem {
  return {
    label: item.label?.trim() || '',
    href: item.href || '',
    subitems: item.subitems?.map(mapTocItem) || [],
  }
}

export const searchInBook = async (rendition: any, keyword: string) => {
  if (!rendition?.search) return []
  try {
    const results = await rendition.search(keyword)
    return results || []
  } catch {
    return []
  }
}
