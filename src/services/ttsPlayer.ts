import { ttsService } from './ttsService'
import { useTTSStore } from '@/stores/tts'

export class TTSPlayer {
  private sentences: string[] = []       // 带标签的句子（用于合成）
  private originalSentences: string[] = [] // 原始句子（用于高亮匹配）
  private audioQueue: (AudioBuffer | null)[] = []
  private currentIndex = 0
  private isPlaying = false
  private aborted = false
  private isChapterEnd = false // 标记是否因章节结束而暂停

  onSentenceChange?: (index: number, originalText: string) => void
  onChapterEnd?: () => void
  onBookEnd?: () => void
  onError?: (error: Error) => void

  prepare(text: string) {
    const { original, tagged } = ttsService.preprocessText(text)
    this.sentences = tagged
    this.originalSentences = original
    this.audioQueue = new Array(this.sentences.length).fill(null)
    this.currentIndex = 0
    this.aborted = false
    this.isChapterEnd = false

    const store = useTTSStore()
    store.updateState({
      totalSentences: this.sentences.length,
      currentSentenceIndex: 0,
    })
  }

  async play(startIndex = 0) {
    this.currentIndex = startIndex
    this.isPlaying = true
    this.aborted = false
    this.isChapterEnd = false

    const store = useTTSStore()
    store.updateState({ isPlaying: true })

    this.prefetch(startIndex)
    await this.playLoop()
  }

  private async playLoop() {
    while (this.isPlaying && this.currentIndex < this.sentences.length) {
      if (this.aborted) break

      const index = this.currentIndex

      try {
        await this.waitForAudio(index)
      } catch {
        break
      }

      if (!this.isPlaying || this.aborted) break

      const store = useTTSStore()
      store.updateState({ currentSentenceIndex: index })
      this.onSentenceChange?.(index, this.originalSentences[index])

      const buffer = this.audioQueue[index]
      if (!buffer) {
        this.currentIndex++
        this.prefetch(this.currentIndex)
        continue
      }

      try {
        await ttsService.playBuffer(buffer)
      } catch {
        break
      }

      if (!this.isPlaying || this.aborted) break

      this.currentIndex++
      this.prefetch(this.currentIndex)
    }

    // 播完当前章节所有句子，且未被手动停止
    if (this.currentIndex >= this.sentences.length && !this.aborted && this.isPlaying) {
      this.isChapterEnd = true
      this.isPlaying = false
      ttsService.stop()
      this.onChapterEnd?.()
    }

    this.cleanup()
  }

  /**
   * 当前是否因章节结束而暂停（可继续下一章）
   */
  get waitingForNextChapter() {
    return this.isChapterEnd
  }

  private async waitForAudio(index: number): Promise<void> {
    const store = useTTSStore()
    let waited = 0

    while (!this.audioQueue[index] && this.isPlaying && !this.aborted) {
      store.updateState({ isLoading: true })
      await new Promise(r => setTimeout(r, 100))
      waited += 100
      if (waited > 30000) {
        throw new Error('等待音频超时')
      }
    }

    store.updateState({ isLoading: false })
  }

  private prefetch(fromIndex: number) {
    const store = useTTSStore()
    const prefetchSize = store.settings.prefetchSize

    for (let i = fromIndex; i < Math.min(fromIndex + prefetchSize, this.sentences.length); i++) {
      if (!this.audioQueue[i]) {
        this.synthesizeWithRetry(i).catch(err => {
          console.error(`句 ${i} 合成失败:`, err)
          this.onError?.(err)
        })
      }
    }
  }

  /**
   * 合成并缓存单句（带重试）
   */
  private async synthesizeWithRetry(index: number, retries = 2): Promise<void> {
    for (let i = 0; i <= retries; i++) {
      if (this.aborted) return
      try {
        const store = useTTSStore()
        const sentence = this.sentences[index]
        const buffer = await ttsService.synthesize(
          sentence,
          store.settings.voice,
          store.settings.stylePrompt,
        )
        this.audioQueue[index] = buffer
        return
      } catch (err) {
        if (i === retries) {
          console.error(`句 ${index} 合成失败，已重试 ${retries} 次`)
          return
        }
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
      }
    }
  }

  pause() {
    this.isPlaying = false
    this.isChapterEnd = false
    ttsService.stop()
    const store = useTTSStore()
    store.updateState({ isPlaying: false })
  }

  stop() {
    this.isPlaying = false
    this.aborted = true
    this.isChapterEnd = false
    ttsService.stop()
    this.currentIndex = 0
    this.audioQueue = []
    this.sentences = []
    this.originalSentences = []
    this.cleanup()
  }

  async seek(sentenceIndex: number) {
    const wasPlaying = this.isPlaying
    this.pause()
    this.currentIndex = sentenceIndex
    this.prefetch(sentenceIndex)

    if (wasPlaying) {
      await this.play(sentenceIndex)
    }
  }

  private cleanup() {
    const store = useTTSStore()
    store.updateState({
      isPlaying: false,
      isLoading: false,
    })
  }
}
