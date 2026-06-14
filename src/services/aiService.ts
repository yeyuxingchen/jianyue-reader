import type { AISettings, AIChatMessage } from '@/types'
import { db } from '@/services/dbService'
import { electronStore } from '@/services/electronStore'

const DEFAULT_AI_SETTINGS: AISettings = {
  api_key: '',
  base_url: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  tts_model: '',
}

export const LENGTH_LIMIT_OPTIONS = [
  { label: '50字内', value: 50 },
  { label: '100字内', value: 100 },
  { label: '200字内', value: 200 },
  { label: '500字内', value: 500 },
  { label: '不限制', value: 0 },
] as const

export type LengthLimitValue = (typeof LENGTH_LIMIT_OPTIONS)[number]['value']

export const aiService = {
  getSettings(): AISettings {
    const saved = db.getAISettings<AISettings>()
    return saved ? { ...DEFAULT_AI_SETTINGS, ...saved } : { ...DEFAULT_AI_SETTINGS }
  },

  saveSettings(settings: AISettings) {
    db.saveAISettings(settings)
  },

  // 解析模型列表
  getModelList(): string[] {
    const settings = this.getSettings()
    if (!settings.model) return []
    return settings.model.split(',').map(m => m.trim()).filter(Boolean)
  },

  // 获取持久化的选中模型
  getSelectedModel(): string {
    const saved = electronStore.getItem('reader:ai-selected-model') as string | null
    if (saved) return saved
    const models = this.getModelList()
    return models[0] || ''
  },

  // 持久化选中模型
  saveSelectedModel(model: string) {
    electronStore.setItem('reader:ai-selected-model', model)
  },

  // 获取持久化的字数限制
  getLengthLimit(): LengthLimitValue {
    const saved = electronStore.getItem('reader:ai-length-limit') as LengthLimitValue | null
    return saved ?? 100
  },

  // 持久化字数限制
  saveLengthLimit(limit: LengthLimitValue) {
    electronStore.setItem('reader:ai-length-limit', limit)
  },

  isConfigured(): boolean {
    const s = this.getSettings()
    return !!(s.api_key && s.base_url && s.model)
  },

  getTTSModel(): string | null {
    const settings = this.getSettings()
    return settings.tts_model || null
  },

  isTTSConfigured(): boolean {
    const s = this.getSettings()
    return !!(s.api_key && s.base_url && s.tts_model)
  },

  async chat(
    messages: AIChatMessage[],
    onChunk: (text: string) => void,
    onEnd: () => void,
    onError: (err: string) => void,
    options?: { model?: string; lengthLimit?: number },
  ) {
    const settings = this.getSettings()
    if (!settings.api_key || !settings.base_url || !settings.model) {
      onError('请先配置 AI 设置（API Key、接口地址、模型名称）')
      return
    }

    const model = options?.model || this.getSelectedModel() || settings.model.split(',')[0].trim()

    // 构建消息列表
    const chatMessages = messages.map(m => ({ role: m.role, content: m.content }))

    // 字数限制：同时在 system 和用户消息中强调，提高模型遵从率
    if (options?.lengthLimit && options.lengthLimit > 0) {
      const limitHint = `【重要约束：你的回复必须控制在${options.lengthLimit}字以内，超过此长度的回复将被截断，请务必精简作答。】`
      chatMessages.unshift({
        role: 'system',
        content: limitHint,
      })
      // 在最后一条用户消息末尾追加提示
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].role === 'user') {
          chatMessages[i].content += `\n${limitHint}`
          break
        }
      }
    }

    const url = settings.base_url.replace(/\/+$/, '') + '/chat/completions'
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.api_key}`,
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        onError(`请求失败 (${response.status}): ${errText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('无法读取响应流')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            onEnd()
            return
          }
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              onChunk(content)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
      onEnd()
    } catch (err: any) {
      onError(err.message || '网络请求失败')
    }
  },

  async getChatFilePath(bookId: string): Promise<string> {
    const cacheDir = await window.services.ensureAiCacheDir()
    return cacheDir.replace(/[\\/]$/, '') + '/' + bookId + '.json'
  },

  async loadChatHistory(bookId: string): Promise<AIChatMessage[]> {
    const filePath = await this.getChatFilePath(bookId)
    const raw = await window.services.readAiCacheFile(filePath)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  },

  async saveChatHistory(bookId: string, messages: AIChatMessage[]): Promise<void> {
    const filePath = await this.getChatFilePath(bookId)
    await window.services.writeAiCacheFile(filePath, JSON.stringify(messages))
    db.saveAIChatMeta(bookId, {
      bookId,
      sessionId: bookId,
      filePath,
      updatedAt: Date.now(),
    })
  },
}
