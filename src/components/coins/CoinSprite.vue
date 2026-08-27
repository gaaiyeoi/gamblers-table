<script setup lang="ts">
/**
 * 赌台上的像素硬币精灵（8-bit 方块风格）：
 * - 像素方块硬币，无圆角无渐变
 * - 点击触发像素翻转动画 + 飘出 +$N 浮字
 * - 骷髅面概率 50%：显示骷髅像素脸
 */

import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  index: number
  color: string
  glare: string
  areaWidth: number
  areaHeight: number
  label: string
}>()

const emit = defineEmits<{ flip: [] }>()

const x = ref(0)
const y = ref(0)
const isFlipping = ref(false)
const showSkull = ref(false)
const floats = ref<Array<{ id: number; text: string; ox: number }>>([])
let floatId = 0
let animFrame = 0
let lastTime = 0
let phase = 0

function scatter(): void {
  const margin = 28
  const cols = 6
  const row = Math.floor(props.index / cols)
  const col = props.index % cols
  const cellW = Math.max((props.areaWidth - margin * 2) / cols, 40)
  const cellH = Math.max((props.areaHeight - margin * 2) / 3, 40)
  x.value = margin + col * cellW + cellW * 0.2 + Math.random() * cellW * 0.6
  y.value = margin + row * cellH + cellH * 0.2 + Math.random() * cellH * 0.6
  phase = (props.index * 137.5) % 360
}

const floatOffset = ref(0)

function tick(now: number): void {
  const dt = (now - lastTime) / 1000
  lastTime = now
  phase += dt * 80
  floatOffset.value = Math.sin((phase * Math.PI) / 180) * 2
  animFrame = requestAnimationFrame(tick)
}

onMounted(() => {
  scatter()
  lastTime = performance.now()
  animFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(animFrame))

function onCoinClick(e: MouseEvent): void {
  e.stopPropagation()
  if (isFlipping.value) return
  isFlipping.value = true

  const skull = Math.random() < 0.5
  showSkull.value = skull

  const id = floatId++
  const text = skull ? '☠' : `+$${(Math.random() * 2 + 0.5).toFixed(1)}`
  floats.value.push({ id, text, ox: (Math.random() - 0.5) * 14 })
  setTimeout(() => { floats.value = floats.value.filter((f) => f.id !== id) }, 800)

  setTimeout(() => {
    isFlipping.value = false
    showSkull.value = false
    scatter()
    emit('flip')
  }, 400)
}
</script>

<template>
  <!-- 飘字 -->
  <div
    v-for="f in floats"
    :key="f.id"
    class="coin-float pixel-number"
    :class="{ 'coin-float--skull': f.text === '☠' }"
    :style="{ left: `${x + f.ox + 8}px`, top: `${y - 16}px` }"
  >
    {{ f.text }}
  </div>

  <!-- 像素方块硬币 -->
  <div
    class="coin-sprite"
    :class="{ 'is-flipping': isFlipping, 'is-skull': showSkull }"
    :style="{
      left: `${x}px`,
      top: `${y + floatOffset}px`,
      '--coin-color': color,
    }"
    role="button"
    tabindex="0"
    :aria-label="`翻转 ${label}`"
    @click="onCoinClick"
    @keydown.enter="(e) => { onCoinClick(e as unknown as MouseEvent) }"
  >
    <!-- 像素高光块 -->
    <div class="coin-px-glare" />
    <!-- 面值符号 -->
    <span v-if="!showSkull" class="coin-sprite__face">$</span>
    <!-- 骷髅像素脸 -->
    <span v-else class="coin-sprite__skull">☠</span>
    <!-- 像素阴影块 -->
    <div class="coin-px-shadow" />
  </div>
</template>

<style scoped>
/* ── 像素方块硬币（无圆角，无渐变） ── */
.coin-sprite {
  position: absolute;
  width: 24px;
  height: 24px;
  background: var(--coin-color, #ffd700);
  /* 4px 像素硬边框 */
  border: 3px solid color-mix(in srgb, var(--coin-color, #ffd700) 30%, #000);
  /* 像素立体阴影：右下暗，左上亮 */
  box-shadow:
    inset -4px -4px 0 color-mix(in srgb, var(--coin-color, #ffd700) 40%, #000),
    inset  4px  4px 0 color-mix(in srgb, var(--coin-color, #ffd700) 70%, #fff),
    4px 4px 0 rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  image-rendering: pixelated;
  z-index: 5;
}

.coin-sprite:hover {
  box-shadow:
    inset -4px -4px 0 color-mix(in srgb, var(--coin-color, #ffd700) 40%, #000),
    inset  4px  4px 0 color-mix(in srgb, var(--coin-color, #ffd700) 70%, #fff),
    4px 4px 0 rgba(0, 0, 0, 0.9),
    0 0 0 2px #fff;
}

.coin-sprite:active {
  transform: translate(2px, 2px);
  box-shadow:
    inset -2px -2px 0 color-mix(in srgb, var(--coin-color, #ffd700) 40%, #000),
    inset  2px  2px 0 color-mix(in srgb, var(--coin-color, #ffd700) 70%, #fff),
    2px 2px 0 rgba(0, 0, 0, 0.7);
}

/* 像素高光：左上角 4×4 亮块 */
.coin-px-glare {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 6px;
  height: 4px;
  background: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}

/* 像素阴影：右下角 */
.coin-px-shadow {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 6px;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.coin-sprite.is-flipping {
  animation: coin-flip-px 0.4s steps(4, end);
}

/* 骷髅面：紫色像素硬币 */
.coin-sprite.is-skull {
  background: #5b21b6;
  border-color: #2e1065;
  box-shadow:
    inset -4px -4px 0 #1e0a50,
    inset  4px  4px 0 #7c3aed,
    4px 4px 0 rgba(0, 0, 0, 0.7);
}

.coin-sprite__face {
  font-size: 16px;
  font-weight: 900;
  color: color-mix(in srgb, var(--coin-color, #ffd700) 20%, #000);
  line-height: 1;
  pointer-events: none;
  position: relative;
  z-index: 2;
}

.coin-sprite__skull {
  font-size: 16px;
  color: #e9d5ff;
  line-height: 1;
  pointer-events: none;
  position: relative;
  z-index: 2;
}

/* 飘字 */
.coin-float {
  position: absolute;
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
  pointer-events: none;
  z-index: 20;
  white-space: nowrap;
  animation: coin-float-up 0.8s steps(8, end) forwards;
}

.coin-float--skull {
  color: #c4b5fd;
  font-size: 16px;
}

/* 像素翻转：步进动画，无平滑 */
@keyframes coin-flip-px {
  0%   { transform: scaleX(1); }
  25%  { transform: scaleX(0.1); background: #888; }
  50%  { transform: scaleX(1); }
  75%  { transform: scaleX(0.1); }
  100% { transform: scaleX(1); }
}

@keyframes coin-float-up {
  0%   { transform: translateY(0); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(-24px); opacity: 0; }
}
</style>
