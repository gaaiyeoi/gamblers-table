<script setup lang="ts">
/**
 * GtProgress —— 游戏原生像素进度条。
 *
 * percentage: 0~100
 * status: 'warning'（金）| 'success'（绿）| 'danger'（红），默认 warning
 *
 * 当进度条充满（>=100）时自动触发"流光 + 脉动"完成动效，
 * 即使进度一下子走完，也能让玩家明确感知到它在动、已经完成。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    percentage?: number
    status?: 'warning' | 'success' | 'danger'
  }>(),
  {
    percentage: 0,
    status: 'warning',
  },
)

const pct = computed(() => Math.min(100, Math.max(0, props.percentage)))
const isFull = computed(() => pct.value >= 100)
</script>

<template>
  <div
    class="gt-progress"
    :class="[`gt-progress--${status}`, { 'gt-progress--full': isFull }]"
  >
    <div
      class="gt-progress__fill"
      :class="{ 'gt-progress__fill--full': isFull }"
      :style="{ width: `${pct}%` }"
    />
  </div>
</template>

<style scoped>
.gt-progress {
  --prog-bg: var(--bg-2);
  --prog-fill: var(--gold-400);
  --prog-border: var(--line-2);
  --prog-h: calc(10px * var(--ui-scale));

  position: relative;
  width: 100%;
  height: var(--prog-h);
  background: var(--prog-bg);

  /* 像素边框 + 内嵌阴影 */
  box-shadow:
    inset 0 0 0 2px var(--prog-border),
    inset 1px 1px 0 rgba(0, 0, 0, 0.4);

  overflow: hidden;
  image-rendering: pixelated;
}

/* status 变体 */
.gt-progress--warning { --prog-fill: var(--gold-400); --prog-border: var(--gold-600); }
.gt-progress--success { --prog-fill: var(--pos);      --prog-border: var(--pos-dark); }
.gt-progress--danger  { --prog-fill: var(--neg);      --prog-border: var(--neg-dark); }

.gt-progress__fill {
  position: absolute;
  inset: 0;
  width: 0;
  background: var(--prog-fill);

  /* 像素扫光纹理 */
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent calc(4px * var(--ui-scale)),
      rgba(255, 255, 255, 0.08) calc(4px * var(--ui-scale)),
      rgba(255, 255, 255, 0.08) calc(8px * var(--ui-scale))
    );

  transition: width 0.2s linear;
}

/* ── 满格完成动效 ────────────────────────────────
 * 进度条充满（>=100）时，即使瞬间走完也要有明显的动态反馈：
 * 1) 填充块持续"呼吸式"亮度脉动
 * 2) 进度条上层有一道白色流光从左往右一格格扫过（像素步进）
 */
.gt-progress--full .gt-progress__fill {
  animation: gt-progress-pulse 1s ease-in-out infinite;
}

.gt-progress--full::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;

  background-image:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent calc(10px * var(--ui-scale)),
      rgba(255, 255, 255, 0.35) calc(10px * var(--ui-scale)),
      rgba(255, 255, 255, 0.35) calc(14px * var(--ui-scale))
    );
  background-size: calc(32px * var(--ui-scale)) 100%;

  animation: gt-progress-shine calc(0.9s * var(--ui-scale)) steps(8) infinite;
}

@keyframes gt-progress-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.45);
  }
}

@keyframes gt-progress-shine {
  from {
    background-position: 0 0;
  }
  to {
    background-position: calc(32px * var(--ui-scale)) 0;
  }
}
</style>
