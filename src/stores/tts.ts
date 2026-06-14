import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TTSSettings, TTSState, TTSVoice, TTSStyleCategory, ReadingStyleItem } from '@/types'
import { aiService } from '@/services/aiService'
import { electronStore } from '@/services/electronStore'

const DEFAULT_TTS_SETTINGS: TTSSettings = {
  voice: '冰糖',
  speed: 'normal',
  stylePrompt: '用自然流畅的声音朗读小说，叙述平稳舒缓，对话时带入角色情绪。',
  prefetchSize: 3,
  highlightSync: true,
  styleCategory: 'novel',
  styleId: 'novel_serious_drama',
  customStylePrompt: '',
  applyStyleVoice: true,
}

/**
 * 朗读风格数据（整合自 tts-styles 目录）
 */
export const READING_STYLES: Record<TTSStyleCategory, { label: string; styles: ReadingStyleItem[] }> = {
  literature: {
    label: '文学',
    styles: [
      { id: 'literature_classic', name: '经典文学', description: '庄重典雅，语速适中，富有文学韵味', stylePrompt: '用庄重典雅的语调朗读，语速适中偏慢，语气沉稳有力，体现文学作品的厚重感和经典韵味。在关键语句处适当放慢节奏，段落之间留有呼吸感。', defaultVoice: '茉莉', speed: '中速偏慢' },
      { id: 'literature_contemporary', name: '当代文学', description: '自然流畅，情感细腻，贴近现代阅读节奏', stylePrompt: '用自然流畅的语调朗读，语速中等，情感细腻而不夸张，贴近现代人的阅读节奏。保持语言的呼吸感和生活气息，让文字自然流淌。', defaultVoice: '茉莉', speed: '中速' },
      { id: 'literature_essay', name: '散文随笔', description: '舒缓悠然，富有画面感，如娓娓道来', stylePrompt: '用舒缓悠然的语调朗读，像在午后阳光下与朋友娓娓道来。语速偏慢，注重画面感和意境的营造，字里行间透出闲适之美。段落间有适当留白，让听者回味。', defaultVoice: '茉莉', speed: '偏慢' },
      { id: 'literature_poetry', name: '诗歌', description: '节奏感强，注重韵律与意境，有留白', stylePrompt: '用富有韵律感和音乐性的语调朗读诗歌。语速缓慢，每个字词都饱含情感。诗句之间有明显停顿和留白，让诗意在沉默中延伸。注重声调的起伏和节奏感。', defaultVoice: '茉莉', speed: '缓慢' },
      { id: 'literature_drama', name: '戏剧/剧本', description: '富有角色感与戏剧张力，对话生动', stylePrompt: '用富有戏剧张力和表现力的语调朗读。旁白部分用沉稳客观的叙述语气，角色对话则根据人物性格变换语气和情感。注意舞台指示和动作描写的节奏感。', defaultVoice: '白桦', speed: '变速' },
      { id: 'literature_documentary', name: '纪实文学', description: '客观冷静，叙事清晰，严肃而引人入胜', stylePrompt: '用客观冷静、叙事清晰的语调朗读。保持严肃而引人入胜的叙事节奏，语调平稳有力。在关键事实和数据处适当强调，情感克制但真诚。', defaultVoice: '白桦', speed: '中速' },
      { id: 'literature_criticism', name: '文学评论', description: '学术严谨，条理清晰，语调沉稳理性', stylePrompt: '用学术严谨、条理清晰的语调朗读。语速适中偏慢，语气沉稳理性。在论点转折、核心概念和引用处适当放慢语速并加重语气。', defaultVoice: '白桦', speed: '中速偏慢' },
    ],
  },
  novel: {
    label: '小说',
    styles: [
      { id: 'novel_serious_drama', name: '正剧', description: '严肃沉稳，情感克制，逻辑清晰', stylePrompt: '用严肃沉稳的语调朗读，情感克制而内敛。语速适中，逻辑清晰，语气庄重。在情节转折处用微妙的语调变化传达情感，像一位成熟的讲述者在叙述真实而深刻的故事。', defaultVoice: '白桦', speed: '中速' },
      { id: 'novel_comedy', name: '轻松/搞笑', description: '幽默诙谐，节奏明快，氛围轻松', stylePrompt: '用轻松活泼、幽默诙谐的语调朗读。语速稍快，节奏明快，充满活力。在笑点和段子处用夸张的语气和适当的停顿来增强喜剧效果，像一位风趣的朋友在讲有趣的故事。', defaultVoice: '苏打', speed: '中速偏快' },
      { id: 'novel_dark', name: '暗黑/压抑', description: '低沉压抑，基调沉重，氛围阴郁', stylePrompt: '用低沉压抑的语调朗读，语速缓慢，声音略带沙哑和疲惫感。整体基调沉重阴郁，在恐怖或紧张情节处放慢语速、降低音量，像深夜里一个令人不寒而栗的故事正在展开。', defaultVoice: '白桦', speed: '缓慢' },
      { id: 'novel_healing', name: '治愈/温暖', description: '温柔细腻，充满关怀与善意', stylePrompt: '用温柔细腻的语调朗读，像温暖的阳光洒在心上，又像一位知心朋友在耳边轻声诉说。语速舒缓，语气柔和充满善意。在感人情节处语气更加轻柔温润，让温暖和感动自然流淌。', defaultVoice: '茉莉', speed: '中速偏慢' },
      { id: 'novel_hotblood', name: '热血/燃', description: '激情澎湃，充满爆发力和感染力', stylePrompt: '用充满激情和力量的语调朗读，语速偏快，节奏紧凑有力。在战斗、对决和高潮场景处加快语速、提高音量，充满爆发力。日常场景保持少年般积极向上的基调，像热血漫画中永不放弃的精神。', defaultVoice: '苏打', speed: '偏快' },
      { id: 'novel_aesthetic', name: '文艺/唯美', description: '优美含蓄，充满诗意，意境深远', stylePrompt: '用优美含蓄、充满诗意的语调朗读。语速缓慢，每个字都像精心雕琢的艺术品。注重声音的美感和意境的营造，让语言如流水般优雅，像一幅缓缓展开的水墨画，留给听者无尽的想象空间。', defaultVoice: '茉莉', speed: '缓慢' },
      { id: 'novel_power_fantasy', name: '爽文', description: '自信快意，节奏明快，充满畅快感', stylePrompt: '用充满自信和快意恩仇的语调朗读。语速偏快，节奏明快爽快，充满力量感。在主角发威、逆转和打脸场景处加强语气，声音有力而有威压感，让听者感受到酣畅淋漓的爽快感。', defaultVoice: '苏打', speed: '偏快' },
      { id: 'novel_angst', name: '虐文', description: '饱含深情，略带忧伤，情感浓烈', stylePrompt: '用饱含深情、略带忧伤的语调朗读。语速偏慢，情感浓烈而细腻。在虐心情节处声音微微颤抖，带着压抑的悲伤和无奈，像一首催人泪下的悲歌，让听者的心随之揪紧。', defaultVoice: '茉莉', speed: '偏慢' },
      { id: 'novel_slice_of_life', name: '种田/日常', description: '悠然闲适，充满生活气息和烟火味', stylePrompt: '用悠然自得、温暖闲适的语调朗读。语速缓慢，节奏从容不迫。像坐在院子里晒太阳和老朋友聊天一样自然舒适，充满生活气息和烟火味，让听者感受到岁月静好的惬意。', defaultVoice: '茉莉', speed: '缓慢' },
      { id: 'novel_progression', name: '升级流', description: '充满干劲，升级突破时充满成就感', stylePrompt: '用充满干劲和期待的语调朗读。日常修炼场景用平稳叙述的语气，节奏中等。突破升级和战斗场景处加快语速、提高音量，充满力量感和成就感。新地图和新挑战处语气充满好奇和期待。', defaultVoice: '苏打', speed: '中速偏快' },
      { id: 'novel_ensemble', name: '群像', description: '沉稳有层次，多角色视角切换', stylePrompt: '用沉稳有层次的语调朗读，像一位老练的说书人讲述一幅波澜壮阔的群像画卷。在不同人物视角切换时微妙地调整语气和节奏，叙事部分客观大气，人物段落则带上该角色的性格色彩。', defaultVoice: '白桦', speed: '中速' },
      { id: 'novel_anthology', name: '单元剧', description: '清晰明朗，每个故事有独立起始感', stylePrompt: '用清晰明朗的语调朗读，每个故事开头有明确的起始感，像在翻开一本新的故事书。语速适中，叙事节奏明快不拖沓。故事结尾有恰当的收束感和余韵，根据各自的风格和氛围灵活调整语调。', defaultVoice: '茉莉', speed: '中速' },
    ],
  },
  humanities: {
    label: '人文社科',
    styles: [
      { id: 'humanities_history', name: '历史', description: '厚重悠远，如历史纪录片般娓娓道来', stylePrompt: '用厚重悠远、叙事感强的语调朗读，像一部精心制作的历史纪录片的旁白。语速适中偏慢，语气沉稳有底蕴。在关键历史事件和年代变迁处适当放慢并加重语气，朝代更迭处增加停顿。', defaultVoice: '白桦', speed: '中速偏慢' },
      { id: 'humanities_philosophy', name: '哲学', description: '深邃严谨，充满思辨感，有思考留白', stylePrompt: '用深邃从容、充满思辨感的语调朗读，像一位智者在沉思中分享对世界的理解。语速偏慢，每个概念和论证之间留有思考的空间。在核心哲学概念和论点转折处放慢语速并加重语气。', defaultVoice: '白桦', speed: '缓慢' },
      { id: 'humanities_religion', name: '宗教', description: '庄严平和，超然从容，带有宁静感', stylePrompt: '用庄严平和、超然从容的语调朗读，带着一种超越世俗的宁静与慈悲。语速缓慢，声音沉稳悠远。经典经文和祈祷文处更加庄严肃穆，解释说明处温和亲切，保持精神性的宁静氛围。', defaultVoice: '白桦', speed: '缓慢' },
      { id: 'humanities_sociology', name: '社会学', description: '客观理性，分析透彻，兼顾学术与可读性', stylePrompt: '用客观理性、分析透彻的语调朗读。语速适中，保持学术的严谨性。在理论框架和数据处语气沉稳精确，在社会现象描述和案例分析处带入适度的人文关怀，条理清晰，层次分明。', defaultVoice: '茉莉', speed: '中速' },
      { id: 'humanities_anthropology', name: '人类学', description: '温暖好奇，观察细腻，富有田野调查感', stylePrompt: '用温暖好奇、观察细腻的语调朗读，像一位人类学家在分享田野调查中的精彩发现。描述异域文化时充满好奇与尊重，理论分析时回归学术严谨。文化细节和民族志描述处语气更加生动细腻。', defaultVoice: '茉莉', speed: '中速' },
      { id: 'humanities_political_science', name: '政治学', description: '理性专业，逻辑严密，沉稳有权威感', stylePrompt: '用理性专业、逻辑严密的语调朗读。语速适中，语气沉稳有权威感，像一位资深政治评论员在做深度分析。在政治理论和制度分析处保持严谨的逻辑条理，关键概念和政策术语处适当放慢强调。', defaultVoice: '白桦', speed: '中速' },
      { id: 'humanities_law', name: '法学', description: '严谨精确，条理分明，语调庄重', stylePrompt: '用严谨精确、条理分明的语调朗读。语速适中偏慢，每个用词都精确有力。法条原文和法律概念处语气庄重严肃，案例分析处保持逻辑的清晰推进，像一位资深法学教授在授课。', defaultVoice: '白桦', speed: '中速偏慢' },
      { id: 'humanities_economics', name: '经济学', description: '清晰专业，数据敏感，逻辑推导有序', stylePrompt: '用清晰专业、逻辑有序的语调朗读。语速适中，保持经济分析师般的专业与冷静。经济理论和模型推导处保持严谨的条理逻辑，数据、百分比和图表描述处放慢语速，确保数字清晰可辨。', defaultVoice: '白桦', speed: '中速' },
      { id: 'humanities_management', name: '管理学', description: '自信专业，实战导向，干练有领导力', stylePrompt: '用自信专业、干练有力的语调朗读。语速适中偏快，保持实战导向和商业气息。管理理论和框架处条理清晰，企业案例处生动具体有故事性，像一位经验丰富的管理顾问在做精彩的商业分享。', defaultVoice: '白桦', speed: '中速偏快' },
      { id: 'humanities_psychology', name: '心理学', description: '温和专业，富有同理心，分析深入细腻', stylePrompt: '用温和专业、富有同理心的语调朗读。语速适中，像一位温和的心理学教授在授课。理论概念和实验设计处保持学术严谨性，案例分析处温和细腻，涉及心理健康话题时语气更加体贴关怀。', defaultVoice: '茉莉', speed: '中速' },
    ],
  },
}

/**
 * 根据风格 ID 查找对应的风格配置
 */
export function findStyleById(styleId: string): ReadingStyleItem | null {
  for (const cat of Object.values(READING_STYLES)) {
    const found = cat.styles.find(s => s.id === styleId)
    if (found) return found
  }
  return null
}

export const useTTSStore = defineStore('tts', () => {
  const settings = ref<TTSSettings>({ ...DEFAULT_TTS_SETTINGS })
  const state = ref<TTSState>({
    isPlaying: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    isLoading: false,
  })

  const isEnabled = computed(() => {
    return aiService.isTTSConfigured()
  })

  const progress = computed(() => {
    if (state.value.totalSentences === 0) return 0
    return Math.round(
      (state.value.currentSentenceIndex / state.value.totalSentences) * 100
    )
  })

  /**
   * 获取当前生效的朗读提示词
   * 优先使用自定义提示词，其次使用选中风格的提示词，最后使用默认
   */
  function getEffectiveStylePrompt(): string {
    if (settings.value.styleId === 'custom' && settings.value.customStylePrompt) {
      return settings.value.customStylePrompt
    }
    if (settings.value.styleId) {
      const style = findStyleById(settings.value.styleId)
      if (style) return style.stylePrompt
    }
    return settings.value.stylePrompt || ''
  }

  function loadSettings() {
    const saved = electronStore.getItem('reader:tts-settings') as TTSSettings | null
    if (saved) {
      settings.value = { ...DEFAULT_TTS_SETTINGS, ...saved }
    }
    // 同步生效提示词
    syncEffectivePrompt()
  }

  function saveSettings() {
    // JSON 序列化剥离 Vue 响应式代理，避免 Electron structured clone 报错
    electronStore.setItem('reader:tts-settings', JSON.parse(JSON.stringify(settings.value)))
  }

  function syncEffectivePrompt() {
    settings.value.stylePrompt = getEffectiveStylePrompt()
  }

  function setVoice(voice: TTSVoice) {
    settings.value.voice = voice
    saveSettings()
  }

  function setStylePrompt(prompt: string) {
    settings.value.stylePrompt = prompt
    saveSettings()
  }

  function setPrefetchSize(size: number) {
    settings.value.prefetchSize = Math.max(1, Math.min(5, size))
    saveSettings()
  }

  function setHighlightSync(val: boolean) {
    settings.value.highlightSync = val
    saveSettings()
  }

  /**
   * 选择朗读风格
   * 如果开启 applyStyleVoice，会自动应用风格的推荐音色
   */
  function selectStyle(category: TTSStyleCategory, styleId: string) {
    settings.value.styleCategory = category
    settings.value.styleId = styleId
    if (styleId === 'custom') {
      // 自定义模式：使用 customStylePrompt
      if (settings.value.customStylePrompt) {
        settings.value.stylePrompt = settings.value.customStylePrompt
      }
    } else {
      const style = findStyleById(styleId)
      if (style) {
        settings.value.stylePrompt = style.stylePrompt
        if (settings.value.applyStyleVoice) {
          settings.value.voice = style.defaultVoice
        }
      }
    }
    saveSettings()
  }

  /**
   * 更新自定义提示词
   */
  function setCustomStylePrompt(prompt: string) {
    settings.value.customStylePrompt = prompt
    if (settings.value.styleId === 'custom') {
      settings.value.stylePrompt = prompt
    }
    saveSettings()
  }

  /**
   * 切换「应用推荐音色」开关
   */
  function setApplyStyleVoice(val: boolean) {
    settings.value.applyStyleVoice = val
    saveSettings()
  }

  /**
   * 切换风格分类（保持上次在该分类选中的风格）
   */
  function switchCategory(category: TTSStyleCategory) {
    settings.value.styleCategory = category
    saveSettings()
  }

  function updateState(updates: Partial<TTSState>) {
    state.value = { ...state.value, ...updates }
  }

  function resetState() {
    state.value = {
      isPlaying: false,
      currentSentenceIndex: 0,
      totalSentences: 0,
      isLoading: false,
    }
  }

  return {
    settings,
    state,
    isEnabled,
    progress,
    loadSettings,
    saveSettings,
    setVoice,
    setStylePrompt,
    setPrefetchSize,
    setHighlightSync,
    selectStyle,
    setCustomStylePrompt,
    setApplyStyleVoice,
    switchCategory,
    updateState,
    resetState,
  }
})
