<script lang="ts" setup>
import { ref, onBeforeUnmount, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
    /** 仅当内容溢出时才显示 tooltip（适用于文本截断场景） */
    onlyWhenOverflow?: boolean
  }>(),
  {
    placement: 'top',
    delay: 250,
    onlyWhenOverflow: false,
  }
)

const visible = ref(false)
const triggered = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const tipStyle = ref<Record<string, string>>({})
let showTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 检测被包裹内容是否发生溢出（ellipsis 生效）。
 *
 * 核心策略：克隆 wrap 元素，移除宽度约束（max-width/overflow/flex），
 * 让克隆体按内容自然撑开，测量其原始宽度，与可见宽度对比。
 * 这样无论 flex 如何收缩，都能测到文本的"真实完整宽度"。
 */
function isOverflowing(): boolean {
  if (!props.onlyWhenOverflow) return true
  const el = wrapperRef.value
  if (!el) return true

  const visibleWidth = el.getBoundingClientRect().width
  if (visibleWidth <= 0) return false

  const clone = el.cloneNode(true) as HTMLElement
  clone.style.position = 'absolute'
  clone.style.visibility = 'hidden'
  clone.style.maxWidth = 'none'
  clone.style.width = 'auto'
  clone.style.flex = 'none'
  clone.style.overflow = 'visible'
  clone.style.whiteSpace = 'nowrap'
  clone.style.display = 'inline-block'
  document.body.appendChild(clone)
  const naturalWidth = clone.getBoundingClientRect().width
  document.body.removeChild(clone)

  return naturalWidth > visibleWidth + 1
}

function onEnter() {
  if (!props.content) return
  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    if (!isOverflowing()) return
    triggered.value = true
    visible.value = true
    nextTick(updatePosition)
  }, props.delay)
}

function onLeave() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  visible.value = false
  triggered.value = false
}

function updatePosition() {
  const el = wrapperRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (props.placement === 'bottom') {
    tipStyle.value = {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 6}px`,
    }
  } else if (props.placement === 'left') {
    tipStyle.value = {
      left: `${rect.left - 6}px`,
      top: `${rect.top + rect.height / 2}px`,
    }
  } else if (props.placement === 'right') {
    tipStyle.value = {
      left: `${rect.right + 6}px`,
      top: `${rect.top + rect.height / 2}px`,
    }
  } else {
    tipStyle.value = {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top - 6}px`,
    }
  }
}

onBeforeUnmount(() => {
  if (showTimer) clearTimeout(showTimer)
})
</script>

<template>
  <span
    ref="wrapperRef"
    class="tooltip-wrap"
    :class="{ 'is-overflow': onlyWhenOverflow }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
    <Transition name="tooltip-fade">
      <span
        v-if="triggered && visible"
        class="tooltip-bubble"
        :class="['placement-' + placement]"
        :style="tipStyle"
      >
        {{ content }}
      </span>
    </Transition>
  </span>
</template>

<style lang="scss" scoped>
.tooltip-wrap {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
}

/* onlyWhenOverflow 模式：用 block-level flex 确保受父容器宽度约束 */
.tooltip-wrap.is-overflow {
  display: flex;
  flex: 1;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.tooltip-bubble {
  position: fixed;
  z-index: 1000;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  font-size: 12px;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &.placement-top {
    transform: translate(-50%, -100%);
  }
  &.placement-bottom {
    transform: translateX(-50%);
  }
  &.placement-left {
    transform: translate(-100%, -50%);
  }
  &.placement-right {
    transform: translateY(-50%);
  }
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
