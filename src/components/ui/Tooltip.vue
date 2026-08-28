<script setup lang="ts">
/**
 * 通用像素风 tooltip：hover 目标时在其附近显示说明气泡。
 * 参考 Gooboo 的指引做法，用于向玩家解释某个区块/元素是什么、何时解锁、如何用。
 *
 * 气泡通过 Teleport 挂到 body，并采用 fixed + getBoundingClientRect 计算位置、
 * 在视口内夹紧，因此不会被祖先容器（本项目存在多层 overflow: hidden/auto）裁剪或溢出屏幕。
 */
import { computed, ref } from 'vue'

import { useUiStore } from '../../stores/uiStore'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const ui = useUiStore()

const props = withDefaults(
  defineProps<{
    /** 提示正文（纯文本，\n 会被渲染为换行）。 */
    content: string
    /** 可选：提示标题（粗体，置顶）。 */
    title?: string
    /** 气泡相对目标的方位。 */
    placement?: Placement
    /** 为 true 时禁用提示。 */
    disabled?: boolean
  }>(),
  {
    placement: 'top',
    disabled: false,
  },
)

const anchor = ref<HTMLElement | null>(null)
const bubble = ref<HTMLElement | null>(null)
const shown = ref(false)
const left = ref(0)
const top = ref(0)

/** 目标元素是否占满父容器（用于卡片/标题等需要撑开宽度的场景）。 */
const stretch = ref(false)

const bubbleStyle = computed(() => ({
  left: `${left.value}px`,
  top: `${top.value}px`,
  opacity: shown.value ? 1 : 0,
  visibility: (shown.value ? 'visible' : 'hidden') as 'visible' | 'hidden',
}))

function onEnter(): void {
  const a = anchor.value
  const b = bubble.value
  if (!a || !b || props.disabled) return

  const ar = a.getBoundingClientRect()
  const bw = b.offsetWidth
  const bh = b.offsetHeight
  // 与目标元素的间距、与视口边缘的安全边距，都随界面缩放一起放大
  const gap = Math.round(8 * ui.uiScale)
  const margin = Math.round(8 * ui.uiScale)

  let l: number
  let t: number
  if (props.placement === 'top') {
    l = ar.left + ar.width / 2 - bw / 2
    t = ar.top - bh - gap
  } else if (props.placement === 'bottom') {
    l = ar.left + ar.width / 2 - bw / 2
    t = ar.bottom + gap
  } else if (props.placement === 'left') {
    l = ar.left - bw - gap
    t = ar.top + ar.height / 2 - bh / 2
  } else {
    l = ar.right + gap
    t = ar.top + ar.height / 2 - bh / 2
  }

  // 视口内夹紧，避免溢出屏幕
  left.value = Math.max(margin, Math.min(l, window.innerWidth - bw - margin))
  top.value = Math.max(margin, Math.min(t, window.innerHeight - bh - margin))
  shown.value = true
}

function onLeave(): void {
  shown.value = false
}
</script>

<template>
  <span
    ref="anchor"
    class="gt-tooltip"
    :class="{ 'gt-tooltip--stretch': stretch }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </span>
  <Teleport to="body">
    <span
      v-if="!disabled"
      ref="bubble"
      class="gt-tooltip__bubble"
      :style="bubbleStyle"
      role="tooltip"
    >
      <span v-if="title" class="gt-tooltip__title">{{ title }}</span>
      <span class="gt-tooltip__body">{{ content }}</span>
    </span>
  </Teleport>
</template>

<style scoped>
.gt-tooltip {
  display: inline-flex;
  position: relative;
}

.gt-tooltip--stretch {
  display: flex;
  width: 100%;
}

/* fixed 定位，随滚动跟随目标；进入视口后由 JS 定位 */
.gt-tooltip__bubble {
  position: fixed;
  z-index: 200;
  max-width: calc(300px * var(--ui-scale));
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-3);
  border: 2px solid var(--gold-500);
  box-shadow:
    inset 0 0 0 2px var(--line-0),
    4px 4px 0 rgba(0, 0, 0, 0.45);
  color: var(--text-primary);
  font-size: var(--fs-xs);
  line-height: 1.7;
  text-align: left;
  white-space: pre-line;
  pointer-events: none;
  transition:
    opacity 0.12s ease,
    visibility 0.12s ease;
}

.gt-tooltip__title {
  display: block;
  margin-bottom: 2px;
  color: var(--gold-400);
  font-weight: 700;
  letter-spacing: 0.5px;
}
</style>
