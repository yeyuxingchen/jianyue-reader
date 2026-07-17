/**
 * 系统字体加载 Composable
 * 负责收集可用系统字体列表（带查询本地字体 API 的副作用）
 */
import { ref } from 'vue'

// 常见系统字体（跨平台兜底列表）
const COMMON_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
  'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Trebuchet MS',
  'Comic Sans MS', 'Impact', 'Lucida Console', 'Monaco', 'Consolas',
  'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'STSong',
  'STHeiti', 'STKaiti', 'STFangsong', 'PingFang SC', 'Hiragino Sans GB',
  'Noto Sans CJK SC', 'Source Han Sans CN', 'WenQuanYi Micro Hei',
  'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
]

export function useSystemFonts() {
  const fonts = ref<string[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const set = new Set<string>(COMMON_FONTS)

      if ('queryLocalFonts' in window) {
        try {
          const localFonts = await (window as any).queryLocalFonts()
          for (const font of localFonts) {
            set.add(font.family)
          }
        } catch (err) {
          console.log('queryLocalFonts not available or denied:', err)
        }
      }

      fonts.value = Array.from(set).sort()
    } catch (err) {
      console.error('Failed to load system fonts:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    fonts,
    loading,
    load,
  }
}
