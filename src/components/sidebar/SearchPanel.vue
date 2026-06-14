<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { searchInBook } from '@/services/foliateService'
import { Search, X } from 'lucide-vue-next'
import type { SearchResult } from '@/types'

const reader = useReaderStore()
const keyword = ref('')
const results = ref<SearchResult[]>([])
const isSearching = ref(false)

async function handleSearch() {
  if (!keyword.value.trim() || !reader.rendition) return
  isSearching.value = true
  try {
    const raw = await searchInBook(reader.rendition, keyword.value.trim())
    results.value = raw.map((r: any) => ({
      cfi: r.cfi || '',
      excerpt: r.excerpt || r.text || '',
      chapterTitle: r.label || '',
    }))
  } catch {
    results.value = []
  } finally {
    isSearching.value = false
  }
}

function clearSearch() {
  keyword.value = ''
  results.value = []
  if (reader.rendition?.clearSearch) {
    reader.rendition.clearSearch()
  }
}

function handleResultClick(cfi: string) {
  if (reader.rendition && cfi) {
    reader.rendition.goTo(cfi)
  }
}

function handleOpenSearch(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail.keyword) {
    keyword.value = detail.keyword
    handleSearch()
  }
}

onMounted(() => {
  window.addEventListener('open-search', handleOpenSearch)
})

onBeforeUnmount(() => {
  window.removeEventListener('open-search', handleOpenSearch)
})
</script>

<template>
  <div class="search-panel">
    <div class="search-bar">
      <div class="search-input-wrapper">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索内容..."
          class="search-input"
          @keydown.enter="handleSearch"
        />
        <button v-if="keyword" class="clear-btn" @click="clearSearch">
          <X :size="12" />
        </button>
      </div>
      <button class="search-btn" @click="handleSearch" :disabled="isSearching">
        <Search :size="14" />
      </button>
    </div>
    <div v-if="isSearching" class="search-loading">搜索中...</div>
    <div v-else-if="results.length > 0" class="search-results">
      <div
        v-for="(r, i) in results"
        :key="i"
        class="search-result"
        @click="handleResultClick(r.cfi)"
      >
        <div v-if="r.chapterTitle" class="result-chapter">{{ r.chapterTitle }}</div>
        <div class="result-excerpt">{{ r.excerpt }}</div>
      </div>
    </div>
    <div v-else-if="keyword && !isSearching" class="search-empty">
      无搜索结果
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-panel {
  padding: 12px;
}

.search-bar {
  display: flex;
  gap: 6px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  padding-right: 28px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent-color);
  }
}

.clear-btn {
  position: absolute;
  right: 4px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 50%;

  &:hover {
    color: var(--text-secondary);
    background: var(--bg-tertiary);
  }
}

.search-btn {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--accent-color);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;

  &:disabled {
    opacity: 0.5;
  }
}

.search-loading, .search-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.search-results {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
}

.search-result {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.result-chapter {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.result-excerpt {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
