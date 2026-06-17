/**
 * 书架动画逻辑 Composable
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReaderStore } from '@/stores/reader'
import { useLibraryStore } from '@/stores/library'
import { getCoverUrl, revokeCoverUrl } from '@/utils/cover'

export function useBookAnimation() {
  const router = useRouter()
  const reader = useReaderStore()
  const library = useLibraryStore()

  // 动画状态
  const animating = ref(false)
  const animDirection = ref<'open' | 'close'>('open')
  const animPhase = ref<'fly' | 'open' | 'fade' | 'unfade' | 'close-book' | 'fly-back'>('fly')

  // 动画数据
  const animCoverUrl = ref('')
  const animCoverKey = ref('')
  const animRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
  const animBookTitle = ref('')

  // 计算样式
  const flyStyle = computed(() => {
    const r = animRect.value
    return {
      '--start-x': (r ? r.left + r.width / 2 : 400) + 'px',
      '--start-y': (r ? r.top + r.height / 2 : 350) + 'px',
      '--start-w': (r ? r.width : 130) + 'px',
      '--start-h': (r ? r.height : 175) + 'px',
    }
  })

  // 辅助函数
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 打开书籍动画
  async function startBookOpenAnimation(
    bookId: string,
    _coverUrl: string,
    rect: { left: number; top: number; width: number; height: number },
    title: string
  ): Promise<void> {
    const book = library.books.find((b) => b.id === bookId)
    if (!book || book.invalid) return

    // 保存 coverKey 供关闭动画使用
    animCoverKey.value = book.coverKey || ''
    revokeCoverUrl(animCoverUrl.value)
    animCoverUrl.value = book.coverKey ? await getCoverUrl(book.coverKey) : ''
    animRect.value = rect
    animBookTitle.value = title

    // 开始动画
    animating.value = true
    animDirection.value = 'open'
    animPhase.value = 'fly'

    // 打开书籍
    reader.openBook(book)

    // Phase 1: 飞到中央 (250ms)
    await delay(260)
    animPhase.value = 'open'

    // Phase 2: 翻书展开 (320ms)
    await delay(340)
    animPhase.value = 'fade'

    // Phase 3: 淡入阅读器 (200ms)
    await delay(220)

    // 动画完成
    animating.value = false
    revokeCoverUrl(animCoverUrl.value)
    animCoverUrl.value = ''

    // 导航到阅读器
    router.push({ name: 'reader', params: { bookId } })
  }

  // 关闭书籍动画
  async function startBookCloseAnimation(): Promise<void> {
    if (!reader.currentBook) return

    // 保存进度
    reader.saveProgress()

    // 准备封面
    revokeCoverUrl(animCoverUrl.value)
    animCoverUrl.value = animCoverKey.value ? await getCoverUrl(animCoverKey.value) : ''

    // 开始动画
    animating.value = true
    animDirection.value = 'close'

    // Phase 1: 阅读器淡出 (180ms)
    animPhase.value = 'unfade'
    await delay(200)

    // 关闭书籍
    reader.closeBook()

    // Phase 2: 合书 (300ms)
    animPhase.value = 'close-book'
    await delay(320)

    // Phase 3: 封面飞回书架 (250ms)
    animPhase.value = 'fly-back'
    await delay(270)

    // 动画完成
    animating.value = false
    revokeCoverUrl(animCoverUrl.value)
    animCoverUrl.value = ''

    // 重新加载书架
    library.loadBooks()

    // 导航到书架
    router.push({ name: 'bookshelf' })
  }

  return {
    animating,
    animDirection,
    animPhase,
    animCoverUrl,
    animCoverKey,
    animBookTitle,
    flyStyle,
    startBookOpenAnimation,
    startBookCloseAnimation,
  }
}
