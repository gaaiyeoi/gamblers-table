<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { useSound, type ButtonSound } from '../../composables/useSound'
import GtButton from './GtButton.vue'

type ButtonType = 'success' | 'primary' | 'warning' | 'danger' | 'base' | 'ghost'

const props = withDefaults(
  defineProps<{
    /** 按钮主题色，透传给 GtButton。 */
    type?: ButtonType
    /** 是否禁用（外部状态，如钱不够）。 */
    disabled?: boolean
    /**
     * 生产周期（毫秒）：进度条每走满一次执行一次生产。
     * 连点不会被拦截，只会累积待生产数，按周期逐个结算（类似自动购买）。
     */
    intervalMs?: number
    /** 每次点击的音效语义名。 */
    sound?: ButtonSound
  }>(),
  { intervalMs: 500, sound: 'place' },
)

const emit = defineEmits<{ click: [] }>()

const { play } = useSound()

/** 连点累积的待生产数。 */
const pending = ref(0)
/** 当前周期进度（0 → 1），走满触发一次生产并进入下一轮。 */
const progress = ref(0)
/** 节拍器是否运行中（有待生产时保持循环）。 */
const running = ref(false)

let rafId: number | undefined
let start = 0

function onClick(): void {
  if (props.disabled) return
  play(props.sound)
  pending.value += 1
  if (!running.value) {
    running.value = true
    progress.value = 0
    start = performance.now()
    rafId = requestAnimationFrame(step)
  }
}

function step(now: number): void {
  const elapsed = now - start
  progress.value = Math.min(1, elapsed / props.intervalMs)
  if (progress.value < 1) {
    rafId = requestAnimationFrame(step)
    return
  }
  // 周期走满：结算一个待生产
  if (pending.value > 0) {
    pending.value -= 1
    emit('click')
  }
  if (pending.value > 0) {
    progress.value = 0
    start = now
    rafId = requestAnimationFrame(step)
  } else {
    running.value = false
    progress.value = 0
  }
}

onBeforeUnmount(() => {
  if (rafId !== undefined) cancelAnimationFrame(rafId)
})
</script>

<template>
  <GtButton
    class="cb-inner"
    :type="type"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
    <div v-if="running" class="cb-fill" :style="{ width: `${progress * 100}%` }" />
    <span v-if="pending > 1" class="cb-pending pixel-number">×{{ pending }}</span>
  </GtButton>
</template>

<style scoped>
/* GtButton 已自带 position:relative; overflow:hidden，cb-fill 可直接绝对定位 */

/* 生产周期进度：从空到满，满格结算一次生产 */
.cb-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(61, 220, 132, 0.32);
  pointer-events: none;
  z-index: 1;
}

/* 待生产数徽标：连点累积提示 */
.cb-pending {
  position: absolute;
  top: calc(2px * var(--ui-scale));
  right: calc(4px * var(--ui-scale));
  z-index: 2;
  font-size: var(--fs-base);
  line-height: 1;
  color: #3ddc84;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
</style>
