import { aiService } from './aiService'
import type { TTSVoice } from '@/types'

class TTSService {
  private audioCtx: AudioContext | null = null

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
    }
    return this.audioCtx
  }

  /**
   * 获取 TTS API 配置（复用 AI 设置的 api_key + base_url）
   */
  private getConfig() {
    const aiSettings = aiService.getSettings()
    const ttsModel = aiService.getTTSModel()

    if (!aiSettings.api_key || !aiSettings.base_url || !ttsModel) {
      throw new Error('TTS 未配置：请在 AI 设置中填写语音模型')
    }

    return {
      apiKey: aiSettings.api_key,
      baseUrl: aiSettings.base_url.replace(/\/+$/, ''),
      model: ttsModel,
    }
  }

  /**
   * 单句语音合成
   */
  async synthesize(
    text: string,
    voice: TTSVoice = '冰糖',
    stylePrompt: string = '',
  ): Promise<AudioBuffer> {
    const config = this.getConfig()

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (stylePrompt) {
      messages.push({ role: 'user', content: stylePrompt })
    }

    messages.push({ role: 'assistant', content: text })

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        audio: {
          format: 'wav',
          voice,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`TTS API 错误 (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const base64Audio = data.choices?.[0]?.message?.audio?.data
    if (!base64Audio) {
      throw new Error('TTS API 未返回音频数据')
    }
    return this.decodeBase64Audio(base64Audio)
  }

  /**
   * Base64 音频解码为 AudioBuffer
   */
  private async decodeBase64Audio(base64: string): Promise<AudioBuffer> {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const ctx = this.getAudioCtx()
    return await ctx.decodeAudioData(bytes.buffer.slice(0))
  }

  /**
   * 播放 AudioBuffer
   */
  playBuffer(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const ctx = this.getAudioCtx()
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => resolve()
      this.currentSource = source
      source.start()
    })
  }

  private currentSource: AudioBufferSourceNode | null = null

  /**
   * 停止当前播放
   */
  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {}
      this.currentSource = null
    }
  }

  /**
   * 文本预处理：分句 + 标签注入
   * 返回 { original: 原始分句, tagged: 带标签分句 }
   */
  preprocessText(text: string): { original: string[]; tagged: string[] } {
    const rawSentences = text
      .replace(/[\u201c\u201d\u2018\u2019"']/g, '')
      .replace(/\r\n/g, '\n')
      .split(/(?<=[\u3002\uff01\uff1f\u2026\n])\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 2)

    return {
      original: rawSentences,
      tagged: rawSentences.map(s => this.injectTags(s)),
    }
  }

  /**
   * 自动注入音频标签
   */
  private injectTags(sentence: string): string {
    if (/[\uff01!]$/.test(sentence)) {
      return `[激动]${sentence}`
    }
    if (/[\uff1f?]$/.test(sentence)) {
      return `[疑惑]${sentence}`
    }
    return sentence.replace(/\u2026\u2026/g, '[停顿]\u2026\u2026')
  }
}

export const ttsService = new TTSService()
