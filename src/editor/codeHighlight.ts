/**
 * 为 milkdown 的代码块注册语法高亮语言（基于 refractor，@milkdown/plugin-prism 内部使用）。
 *
 * 注意：@milkdown/plugin-prism 在文档变更时会直接使用模块级的 refractor 单例重新计算
 * 高亮，因此这里必须在「同一个」refractor 实例上注册语言（两侧 import 'refractor' 解析到
 * 同一模块单例）。注册后无论初始渲染还是后续编辑都能正确着色。
 */
import { refractor } from 'refractor'
import python from 'refractor/python'
import typescript from 'refractor/typescript'
import java from 'refractor/java'
import c from 'refractor/c'
import cpp from 'refractor/cpp'
import csharp from 'refractor/csharp'
import go from 'refractor/go'
import rust from 'refractor/rust'
import php from 'refractor/php'
import ruby from 'refractor/ruby'
import kotlin from 'refractor/kotlin'
import dart from 'refractor/dart'
import scala from 'refractor/scala'
import swift from 'refractor/swift'
import json from 'refractor/json'
import yaml from 'refractor/yaml'
import bash from 'refractor/bash'
import sql from 'refractor/sql'
import markdown from 'refractor/markdown'
import scss from 'refractor/scss'

const languages = [
  python, typescript, java, c, cpp, csharp, go, rust, php, ruby,
  kotlin, dart, scala, swift, json, yaml, bash, sql, markdown, scss,
]

languages.forEach((lang) => {
  try {
    refractor.register(lang)
  } catch {
    // 语言模块缺失或已注册，忽略即可
  }
})

export {}
