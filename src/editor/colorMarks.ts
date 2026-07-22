/**
 * 文字颜色和背景色 mark。
 *
 * 设计思路：
 * - 用 ProseMirror mark 存储颜色属性，WYSIWYG 模式下用 toDOM 渲染 span style
 * - 序列化时用 withMark 创建自定义 mdast 节点（spanColor / spanBg），
 *   通过 remarkStringifyOptionsCtx 注册 handler，输出 raw HTML 标签
 * - 解析时由 colorRemarkTransformer 把合并后的 html 节点转为 spanColor / spanBg 节点
 *
 * 工作链路：
 * 序列化：ProseMirror mark → withMark 创建 spanColor mdast 节点 → handler 输出 <span style="color:red">文本</span>
 * 解析：  markdown → remark-parse 生成 html 节点 → remarkHtmlExtractor 合并 → colorRemarkTransformer 转为 spanColor → parseMarkdown 恢复 mark
 */
import { $markAttr, $markSchema, $command, $remark } from '@milkdown/kit/utils'
import { toggleMark } from '@milkdown/kit/prose/commands'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'

// ===== 文字颜色 =====
export const textColorAttr = $markAttr('textColor')

export const textColorSchema = $markSchema('textColor', (ctx) => ({
  attrs: {
    color: { validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'span[style]',
      getAttrs: (node: HTMLElement) => {
        const color = node.style.color
        // 排除只有 background-color 没有 color 的 span（避免与 bgColor 冲突）
        if (!color) return false
        return { color }
      },
    },
  ],
  toDOM: (mark) => ['span', { style: `color: ${mark.attrs.color}`, ...ctx.get(textColorAttr.key)(mark) }],
  parseMarkdown: {
    match: (node) => node.type === 'spanColor',
    runner: (state, node, markType) => {
      state.openMark(markType, { color: (node as any).color })
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'textColor',
    runner: (state, mark) => {
      state.withMark(mark, 'spanColor', undefined, { color: mark.attrs.color })
    },
  },
}))

export const toggleTextColorCommand = $command('ToggleTextColor', (ctx) => (color?: string) => {
  return toggleMark(textColorSchema.type(ctx), { color: color || '' })
})

// ===== 背景色 =====
export const bgColorAttr = $markAttr('bgColor')

export const bgColorSchema = $markSchema('bgColor', (ctx) => ({
  attrs: {
    color: { validate: 'string' },
  },
  parseDOM: [
    {
      tag: 'span[style]',
      getAttrs: (node: HTMLElement) => {
        const bg = node.style.backgroundColor
        if (!bg) return false
        return { color: bg }
      },
    },
  ],
  toDOM: (mark) => ['span', { style: `background-color: ${mark.attrs.color}`, ...ctx.get(bgColorAttr.key)(mark) }],
  parseMarkdown: {
    match: (node) => node.type === 'spanBg',
    runner: (state, node, markType) => {
      state.openMark(markType, { color: (node as any).color })
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'bgColor',
    runner: (state, mark) => {
      state.withMark(mark, 'spanBg', undefined, { color: mark.attrs.color })
    },
  },
}))

export const toggleBgColorCommand = $command('ToggleBgColor', (ctx) => (color?: string) => {
  return toggleMark(bgColorSchema.type(ctx), { color: color || '' })
})

// ===== 序列化 handler =====
// 通过 remarkStringifyOptionsCtx 注册，把 spanColor / spanBg mdast 节点序列化为 raw HTML
export function setupColorStringifyHandlers(ctx: any) {
  ctx.update(remarkStringifyOptionsCtx, (prev: any) => ({
    ...prev,
    handlers: {
      ...prev.handlers,
      spanColor: (node: any, _parent: any, state: any, info: any) => {
        const exit = state.enter('spanColor')
        const content = state.containerPhrasing(node, {
          before: '<',
          after: '>',
          ...info,
        })
        exit()
        return `<span style="color:${node.color}">${content}</span>`
      },
      spanBg: (node: any, _parent: any, state: any, info: any) => {
        const exit = state.enter('spanBg')
        const content = state.containerPhrasing(node, {
          before: '<',
          after: '>',
          ...info,
        })
        exit()
        return `<span style="background-color:${node.color}">${content}</span>`
      },
    },
  }))
}

// ===== 解析 transformer =====
// 把 remarkHtmlExtractor 合并后的 html 节点（<span style="color:xxx">文本</span>）
// 转为 spanColor / spanBg mdast 节点，供 parseMarkdown 恢复 mark
interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
  color?: string
  [key: string]: unknown
}

function parseStyleAttr(html: string): { color?: string; backgroundColor?: string; innerHtml: string } {
  const container = document.createElement('div')
  container.innerHTML = html
  const el = container.firstElementChild as HTMLElement | null
  if (!el || el.tagName !== 'SPAN') return { innerHtml: html }

  const color = el.style.color || undefined
  const backgroundColor = el.style.backgroundColor || undefined
  const innerHtml = el.innerHTML
  return { color, backgroundColor, innerHtml }
}

function convertColorHtmlNodes(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = []
  for (const child of children) {
    if (child.type === 'html' && typeof child.value === 'string') {
      const value = child.value.trim()
      // 只处理 <span style="..."> 形式的 html 节点
      if (value.startsWith('<span') && value.endsWith('</span>')) {
        const { color, backgroundColor, innerHtml } = parseStyleAttr(value)
        if (color) {
          // 解析内部内容为 mdast
          const innerNodes = parseInnerHtmlToMdast(innerHtml)
          result.push({ type: 'spanColor', color, children: innerNodes })
          continue
        }
        if (backgroundColor) {
          const innerNodes = parseInnerHtmlToMdast(innerHtml)
          result.push({ type: 'spanBg', color: backgroundColor, children: innerNodes })
          continue
        }
      }
    }
    result.push(child)
  }
  return result
}

function parseInnerHtmlToMdast(html: string): MdastNode[] {
  const container = document.createElement('div')
  container.innerHTML = html
  const result: MdastNode[] = []
  container.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (text) result.push({ type: 'text', value: text })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      result.push({ type: 'html', value: el.outerHTML })
    }
  })
  return result
}

function transformColorNodes(node: MdastNode): void {
  if (!node) return
  if (Array.isArray(node.children)) {
    for (const child of node.children) transformColorNodes(child)
    node.children = convertColorHtmlNodes(node.children)
  }
}

export const colorRemarkTransformer = $remark('colorRemarkTransformer', () => () => (tree: any) => {
  transformColorNodes(tree as MdastNode)
})
