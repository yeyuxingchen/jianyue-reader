/**
 * 让 milkdown commonmark preset 真正渲染 raw HTML 标签。
 *
 * 根因：
 * 1. 解析时 remark-parse 把 inline HTML 拆成独立的 html 节点（开标签、闭标签各自独立），
 *    htmlNodeView 独立渲染导致开闭标签分别变成空元素。
 * 2. 序列化时只调用 remark.stringify() 不运行 transformer，用户在所见即所得模式输入的
 *    `<span>123</span>` 作为 text 节点，`<` 被 remarkStringify 转义为 `\<`。
 *
 * 方案：
 * 1. remarkHtmlExtractor：$remark transformer，仅在解析时运行，合并连续的
 *    html+text 节点序列为完整的 HTML 元素。
 * 2. htmlInputRule：$inputRule，在用户输入 `>` 时把 HTML 文本转为 html 节点，
 *    闭标签输入时向前查找开标签合并中间所有内容。避免序列化时 `<` 被转义。
 * 3. htmlNodeView：$view 覆盖 htmlSchema 的 nodeView，用 innerHTML 真实渲染。
 *
 * 安全清理：剥离 <script>、<style>、on* 事件属性、javascript: 协议。
 * 适用于本地笔记场景；若用于富文本输入场景，需要更严格的 sanitizer。
 */
import { $view, $remark, $inputRule } from '@milkdown/kit/utils'
import { htmlSchema } from '@milkdown/kit/preset/commonmark'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import type { NodeViewConstructor, ViewMutationRecord } from '@milkdown/kit/prose/view'

const ALLOWED_TAGS_TO_REMOVE = ['SCRIPT', 'STYLE', 'TEMPLATE', 'OBJECT', 'EMBED', 'IFRAME']

function sanitizeHtml(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as Element
      if (ALLOWED_TAGS_TO_REMOVE.includes(el.tagName)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let current = walker.nextNode() as Element | null
  while (current) {
    for (const attr of Array.from(current.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) {
        current.removeAttribute(attr.name)
        continue
      }
      if ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('data:text/html'))) {
        current.removeAttribute(attr.name)
      }
    }
    current = walker.nextNode() as Element | null
  }

  container.querySelectorAll(ALLOWED_TAGS_TO_REMOVE.map(t => t.toLowerCase()).join(',')).forEach(el => el.remove())

  return container.innerHTML
}

interface MdastNode {
  type: string
  value?: string
  children?: MdastNode[]
  [key: string]: unknown
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseHtmlToMdast(html: string): MdastNode[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const result: MdastNode[] = []
  doc.body.childNodes.forEach(child => {
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

function parseHtmlToProseNodes(html: string, schema: any): any[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const htmlType = schema.nodes.html
  const nodes: any[] = []
  doc.body.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (text) nodes.push(schema.text(text))
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      nodes.push(htmlType.create({ value: el.outerHTML }))
    }
  })
  return nodes
}

/**
 * 合并 children 中连续的 text + html 节点序列。
 * remark-parse 把 inline HTML 拆成独立 html 节点（开标签、闭标签各自独立），
 * 这里把连续的 text/html 序列重新拼接成完整 HTML 字符串，让 DOMParser 解析为
 * 完整的元素节点（开闭标签配对，文本在元素内）。
 */
function mergeInlineHtml(children: MdastNode[]): MdastNode[] {
  const result: MdastNode[] = []
  let buffer: { type: 'text' | 'html'; value: string }[] = []

  function flushBuffer() {
    if (buffer.length === 0) return
    if (!buffer.some(b => b.type === 'html')) {
      for (const b of buffer) result.push({ type: b.type, value: b.value })
    } else {
      const html = buffer.map(b =>
        b.type === 'text' ? escapeHtml(b.value) : b.value
      ).join('')
      for (const node of parseHtmlToMdast(html)) result.push(node)
    }
    buffer = []
  }

  for (const child of children) {
    if (child.type === 'text' || child.type === 'html') {
      buffer.push({ type: child.type as 'text' | 'html', value: child.value || '' })
    } else {
      flushBuffer()
      result.push(child)
    }
  }
  flushBuffer()

  return result
}

function transformTree(node: MdastNode): void {
  if (!node) return
  if (Array.isArray(node.children)) {
    for (const child of node.children) transformTree(child)
    node.children = mergeInlineHtml(node.children)
  }
}

export const remarkHtmlExtractor = $remark('remarkHtmlExtractor', () => () => (tree: any) => {
  transformTree(tree as MdastNode)
})

export const htmlNodeView = $view(htmlSchema.node, () => {
  const view: NodeViewConstructor = (node) => {
    const span = document.createElement('span')
    span.setAttribute('data-type', 'html')
    span.style.display = 'contents'
    const raw = (node.attrs.value as string) || ''
    span.innerHTML = sanitizeHtml(raw)
    return {
      dom: span,
      ignoreMutation(record: ViewMutationRecord) {
        const t = (record as { type?: string }).type
        return t === 'characterData' || t === 'childList'
      },
    }
  }
  return view
})

// 用户输入 `</` 时触发
const HTML_CLOSING_TRIGGER = /<\/$/

/**
 * 输入规则：用户输入 `</` 时，向前查找最近的开标签，自动补全闭标签，整体渲染为 html 节点。
 * 输入开标签 `<span style="color:red">` 时不立即转换，保持文本可见。
 * 等识别到 `</` 时，补全为 `</span>`，把 `<span style="color:red">123</span>` 整体转为 html 节点。
 */
export const htmlInputRule = $inputRule(() => {
  return new InputRule(HTML_CLOSING_TRIGGER, (state, _match, start, end) => {
    const htmlType = state.schema.nodes.html

    // 向前查找最近的开标签，收集中间内容
    let searchPos = start
    const middleParts: { isText: boolean; value: string }[] = []

    while (searchPos > 0) {
      const $pos = state.doc.resolve(searchPos)
      const nodeBefore = $pos.nodeBefore
      if (!nodeBefore) break

      if (nodeBefore.isText) {
        const text = nodeBefore.text || ''
        // 在 text 中查找最后一个开标签 <tag ...>
        const openTagMatches = [...text.matchAll(/<([a-zA-Z][\w-]*)\b[^<>]*>/g)]
        if (openTagMatches.length > 0) {
          const lastMatch = openTagMatches[openTagMatches.length - 1]
          const openTag = lastMatch[0]
          const tagName = lastMatch[1]
          const tagStart = lastMatch.index!
          const afterText = text.slice(tagStart + openTag.length)

          // 拼接完整 HTML：开标签 + 中间内容 + 自动补全的闭标签
          const middleContent = escapeHtml(afterText) +
            middleParts.map(p => p.isText ? escapeHtml(p.value) : p.value).join('')
          const combinedHtml = openTag + middleContent + `</${tagName}>`

          const openTagPos = searchPos - nodeBefore.nodeSize + tagStart
          const tr = state.tr.delete(openTagPos, end)
          const nodes = parseHtmlToProseNodes(combinedHtml, state.schema)
          if (nodes.length > 0) {
            tr.insert(openTagPos, nodes)
          }
          return tr
        }
        // text 中没有开标签，继续向前查找
        middleParts.unshift({ isText: true, value: text })
        searchPos -= nodeBefore.nodeSize
      } else if (nodeBefore.type === htmlType) {
        const value = nodeBefore.attrs.value as string
        // 检查是否是开标签（排除闭标签和自闭合标签）
        const openMatch = value.match(/^<([a-zA-Z][\w-]*)\b[^>]*>$/)
        if (openMatch && !value.startsWith('</') && !value.endsWith('/>')) {
          const tagName = openMatch[1]
          const middleContent = middleParts.map(p => p.isText ? escapeHtml(p.value) : p.value).join('')
          const combinedHtml = value + middleContent + `</${tagName}>`
          const openTagPos = searchPos - nodeBefore.nodeSize

          const tr = state.tr.delete(openTagPos, end)
          const nodes = parseHtmlToProseNodes(combinedHtml, state.schema)
          if (nodes.length > 0) {
            tr.insert(openTagPos, nodes)
          }
          return tr
        }
        // 不是开标签，继续向前查找
        middleParts.unshift({ isText: false, value })
        searchPos -= nodeBefore.nodeSize
      } else {
        break
      }
    }

    // 没找到开标签，不处理（保留用户输入的 `</`）
    return null
  })
})
