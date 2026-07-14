// 代码块支持的语言列表（值与 refractor 语言名一致，见 src/editor/codeHighlight.ts）
export const CODE_LANGS = [
  'plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
  'csharp', 'go', 'rust', 'html', 'css', 'scss', 'json', 'yaml', 'xml',
  'sql', 'bash', 'markdown', 'php', 'ruby', 'kotlin', 'dart',
] as const

export type CodeLang = typeof CODE_LANGS[number]
