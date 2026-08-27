<script setup lang="ts">
/**
 * 活动助手精灵（吸血鬼幸存者画风·精细像素小人）：
 * - 用内联 SVG 以像素网格渲染 8 位小人：头/脸/眼/鼻/帽/身体/腰带/徽章/腿/脚
 * - 带椭圆地面投影、方向翻转、走路摆腿/身体起伏、举币/抛币动作帧
 * - 助手 hat 颜色对应稀有度，稀有度越高帽子装饰越华丽
 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { HatRarity } from '../../core'

const props = defineProps<{
  helperId: string
  count: number
  hat: string
  rarity: HatRarity
  areaWidth: number
  areaHeight: number
  /** 助手在区域内的 index（决定初始位置） */
  index: number
}>()

const emit = defineEmits<{ flip: [] }>()

const { t } = useI18n()

// ---- 状态 ----
const x = ref(40 + (props.index % 6) * 90)
const y = ref(60 + Math.floor(props.index / 6) * 70)
const facingRight = ref(props.index % 2 === 0)
const action = ref<'walk' | 'idle' | 'raise' | 'throw'>('idle')
const floats = ref<Array<{ id: number; value: string; offsetX: number }>>([])

// ---- 稀有度帽子配色与装饰 ----
const hatStyles: Record<
  HatRarity,
  { brim: string; crown: string; trim: string; crest: string; gem: boolean }
> = {
  common:    { brim: '#8a1f1f', crown: '#cc2020', trim: '#5a1010', crest: '#e0a030', gem: false },
  rare:      { brim: '#1d7a46', crown: '#3ddc84', trim: '#0f4a28', crest: '#ffd700', gem: false },
  epic:      { brim: '#5b2a8f', crown: '#b06cff', trim: '#341457', crest: '#ffe97f', gem: true },
  legendary: { brim: '#8a6d00', crown: '#ffd700', trim: '#6b5200', crest: '#ff5533', gem: true },
}
const hatStyle = hatStyles[props.rarity]

// ---- 每种助手的像素配色（头 / 身体 / 肤色 / 眼睛 / 脚） ----
const helperColors: Record<
  string,
  { head: string; body: string; skin: string; boot: string; eye: string }
> = {
  novice:      { head: '#f5c518', body: '#e8a800', skin: '#f6c98a', boot: '#7a4a12', eye: '#20120a' },
  apprentice:  { head: '#f87171', body: '#ef4444', skin: '#f2b97f', boot: '#5a2410', eye: '#1a0f08' },
  journeyman:  { head: '#d97706', body: '#92400e', skin: '#e8b27c', boot: '#3d2008', eye: '#1a0f08' },
  expert:      { head: '#a78bfa', body: '#7c3aed', skin: '#f0c18a', boot: '#2a1550', eye: '#fff' },
  master:      { head: '#7dd3fc', body: '#0ea5e9', skin: '#f5d0a8', boot: '#0f4a5e', eye: '#eaffff' },
  grandmaster: { head: '#fca5a5', body: '#dc2626', skin: '#f6c98a', boot: '#45120f', eye: '#fff' },
  legend:      { head: '#fef08a', body: '#ffd700', skin: '#f6d3a0', boot: '#7a5200', eye: '#1a0f08' },
  mythic:      { head: '#f9a8d4', body: '#ec4899', skin: '#f7c9e0', boot: '#4a1140', eye: '#fff' },
}
const c =
  helperColors[props.helperId] ??
  { head: '#f0a020', body: '#e09018', skin: '#f6c98a', boot: '#6a4210', eye: '#20120a' }

// ---- 像素色阶辅助 ----
function shade(hex: string): string {
  return mix(hex, '#000000', 0.35)
}
function lighten(hex: string): string {
  return mix(hex, '#ffffff', 0.3)
}
function mix(hex: string, other: string, ratio: number): string {
  const to = (s: string) => {
    const h = s.replace('#', '')
    const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = to(hex)
  const b = to(other)
  const r = a.map((v, i) => Math.round(v + (b[i]! - v) * ratio))
  return `rgb(${r[0]},${r[1]},${r[2]})`
}

// ---- 动画循环 ----
let animFrame = 0
let lastTime = 0
let walkTimer = 0
let actionTimer = 0
let floatId = 0
let walkStep = 0 // 走路帧相位
const WALK_SPEED = 36 // px/s
let walkDuration = 0
let idleTarget = 0

function nextAction(): void {
  const r = Math.random()
  if (r < 0.5) {
    facingRight.value = Math.random() > 0.5
    walkDuration = 600 + Math.random() * 900
    walkTimer = 0
    action.value = 'walk'
  } else if (r < 0.85) {
    idleTarget = 400 + Math.random() * 600
    walkTimer = 0
    action.value = 'idle'
  } else {
    action.value = 'raise'
    walkTimer = 0
  }
  actionTimer = 600 + Math.random() * 1400
}

/** raise → throw 是否已完成（序列进行中不可被 actionTimer 打断） */
const isThrowing = computed(() => action.value === 'raise' || action.value === 'throw')

function spawnFloat(val: string): void {
  const id = floatId++
  const offsetX = (Math.random() - 0.5) * 12
  floats.value.push({ id, value: val, offsetX })
  setTimeout(() => {
    floats.value = floats.value.filter((f) => f.id !== id)
  }, 900)
}

function tick(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  walkTimer += dt * 1000
  actionTimer -= dt * 1000

  const W = Math.max(props.areaWidth - 32, 60)
  const H = Math.max(props.areaHeight - 60, 60)

  if (action.value === 'walk') {
    walkStep += dt * 8
    const dir = facingRight.value ? 1 : -1
    x.value = Math.max(8, Math.min(W, x.value + dir * WALK_SPEED * dt))
    if (x.value <= 8 || x.value >= W) facingRight.value = !facingRight.value
    if (walkTimer >= walkDuration) nextAction()
  } else if (action.value === 'idle') {
    walkStep = 0
    if (walkTimer >= idleTarget) nextAction()
  } else if (action.value === 'raise') {
    walkStep = 0
    // 举币：停顿片刻后进入抛币
    if (walkTimer > 550) {
      action.value = 'throw'
      walkTimer = 0
    }
  } else if (action.value === 'throw') {
    walkStep = 0
    if (walkTimer > 380) {
      spawnFloat(`+$${(Math.random() * 3 + 0.5).toFixed(1)}`)
      emit('flip')
      action.value = 'idle'
      walkTimer = 0
      idleTarget = 500 + Math.random() * 800
    }
  }

  // raise/throw 为不可打断序列；其余动作由 actionTimer 触发切换
  if (!isThrowing.value && actionTimer <= 0) nextAction()
  y.value = Math.max(20, Math.min(H, y.value))
  animFrame = requestAnimationFrame(tick)
}

// ---- SVG 像素网格辅助 ----
const P = 1 // 每格 = 1 个 viewBox 单位，放大渲染

// 走路时腿部交替相位（两帧）：仅在 walk 时摆动，静止/动作时两腿归位贴地
const legA = computed(() =>
  action.value === 'walk' ? (Math.floor(walkStep) % 2 === 0 ? 0 : 1) : 0,
)
const legB = computed(() =>
  action.value === 'walk' ? (Math.floor(walkStep) % 2 === 0 ? 1 : 0) : 0,
)
const bobOffset = computed(() => (action.value === 'walk' ? (Math.floor(walkStep) % 2 === 0 ? 0 : 0.6) : 0))
// 是否在抛/举（手臂举起）
const armUp = computed(() => action.value === 'raise' || action.value === 'throw')

onMounted(() => {
  x.value = 20 + (props.index % 7) * 80 + Math.random() * 20
  y.value = 30 + Math.floor(props.index / 7) * 70 + Math.random() * 20
  actionTimer = Math.random() * 800
  lastTime = performance.now()
  animFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(animFrame))
</script>

<template>
  <!-- 根容器：让外部 class（z-index）可继承 -->
  <div class="helper-root">
    <!-- 浮动 +$ 文字 -->
    <div
      v-for="f in floats"
      :key="f.id"
      class="float-text pixel-number"
      :style="{ left: `${x + f.offsetX + 14}px`, top: `${y - 30}px` }"
    >
      {{ f.value }}
    </div>

    <!-- 精灵容器：SVG 像素小人 -->
    <div
      class="helper-sprite"
      :class="{
        flipped: !facingRight,
        'is-walking': action === 'walk',
        'is-raising': action === 'raise',
        'is-throwing': action === 'throw',
      }"
      :style="{ left: `${x}px`, top: `${y}px` }"
      :aria-label="t(`helpers.${helperId}`)"
    >
    <svg
      class="sprite-svg"
      viewBox="0 0 18 26"
      width="18"
      height="26"
      shape-rendering="crispEdges"
      :aria-hidden="true"
    >
      <!-- 身体（含脚、腿、腰带、徽章） -->
      <g class="body-group">
        <!-- 左腿（迈步：向前 + 微抬） -->
        <g :transform="`translate(${legA * 1.4}, ${legA * -0.7})`">
          <rect x="5" y="18" width="3" height="3" :fill="c.boot" />
          <rect x="5" y="21" width="4" height="2" :fill="c.boot" />
          <rect x="5" y="22" width="3" height="1" :fill="shade(c.boot)" />
        </g>
        <!-- 右腿（迈步：向后 + 微抬） -->
        <g :transform="`translate(${-legB * 1.4}, ${legB * -0.7})`">
          <rect x="10" y="18" width="3" height="3" :fill="c.boot" />
          <rect x="10" y="21" width="4" height="2" :fill="c.boot" />
          <rect x="10" y="22" width="3" height="1" :fill="shade(c.boot)" />
        </g>

        <!-- 躯干（衣物） -->
        <rect x="5" y="12" width="8" height="7" :fill="c.body" />
        <!-- 衣物左阴影 / 右高光 -->
        <rect x="5" y="12" width="1" height="7" :fill="shade(c.body)" />
        <rect x="12" y="12" width="1" height="7" :fill="lighten(c.body)" />
        <!-- 腰带 -->
        <rect x="5" y="17" width="8" height="2" :fill="shade(c.body)" />
        <rect x="8" y="17" width="2" height="2" :fill="hatStyle.crest" />
        <!-- 胸前徽章 -->
        <rect x="8" y="14" width="2" height="2" :fill="hatStyle.trim" />
        <rect x="8" y="14" width="1" height="1" :fill="hatStyle.crest" />

        <!-- 手臂（举手时抬起） -->
        <g :transform="`translate(0, ${armUp ? -1.2 : 0})`">
          <!-- 左臂 -->
          <rect x="3" y="13" width="2" height="4" :fill="c.body" />
          <rect x="3" y="16" width="2" height="2" :fill="shade(c.body)" />
          <!-- 右臂 -->
          <rect x="13" y="13" width="2" height="4" :fill="c.body" />
          <rect x="13" y="16" width="2" height="2" :fill="shade(c.body)" />
        </g>
      </g>

      <!-- 头部（含脸、眼、鼻） -->
      <g :transform="`translate(0, ${bobOffset})`">
        <rect x="4" y="6" width="10" height="7" :fill="c.skin" />
        <rect x="4" y="6" width="1" height="7" :fill="shade(c.skin)" />
        <rect x="13" y="6" width="1" height="7" :fill="lighten(c.skin)" />
        <!-- 头发/帽底 -->
        <rect x="4" y="6" width="10" height="2" :fill="c.head" />
        <!-- 眼睛 -->
        <rect x="6" y="9" width="2" height="2" :fill="c.eye" />
        <rect x="10" y="9" width="2" height="2" :fill="c.eye" />
        <!-- 眼睛高光（稀有度） -->
        <rect x="6" y="9" width="1" height="1" :fill="hatStyle.crest" v-if="c.eye === '#fff'" />
        <rect x="10" y="9" width="1" height="1" :fill="hatStyle.crest" v-if="c.eye === '#fff'" />
        <!-- 鼻子 -->
        <rect x="8" y="10" width="1" height="2" :fill="shade(c.skin)" />
        <!-- 嘴 -->
        <rect x="7" y="11" width="4" height="1" :fill="shade(c.skin)" />
      </g>

      <!-- 帽子（随稀有度华丽程度） -->
      <g :transform="`translate(0, ${bobOffset})`">
        <!-- 帽檐 -->
        <rect x="2" y="5" width="14" height="2" :fill="hatStyle.brim" />
        <rect x="2" y="5" width="14" height="1" :fill="hatStyle.crown" />
        <!-- 帽冠 -->
        <rect x="4" y="1" width="10" height="5" :fill="hatStyle.crown" />
        <rect x="4" y="1" width="1" height="5" :fill="lighten(hatStyle.crown)" />
        <rect x="13" y="1" width="1" height="5" :fill="shade(hatStyle.crown)" />
        <!-- 帽带 -->
        <rect x="4" y="4" width="10" height="1" :fill="hatStyle.trim" />
        <!-- 稀有度装饰 -->
        <template v-if="hatStyle.gem">
          <!-- 宝石 -->
          <rect x="7" y="0" width="4" height="2" :fill="hatStyle.crest" />
          <rect x="7" y="0" width="2" height="1" :fill="lighten(hatStyle.crest)" />
        </template>
        <template v-else>
          <!-- 帽檐花边 -->
          <rect x="4" y="5" width="1" height="1" :fill="hatStyle.crest" />
          <rect x="8" y="5" width="1" height="1" :fill="hatStyle.crest" />
          <rect x="12" y="5" width="1" height="1" :fill="hatStyle.crest" />
        </template>
      </g>

      <!-- 举起的硬币（抛/举时） -->
      <g v-if="armUp" class="sprite-coin" transform="translate(15, 3)">
        <rect x="0" y="0" width="3" height="3" fill="#c06010" />
        <rect x="1" y="1" width="1" height="1" fill="#f0a030" />
        <rect x="2" y="0" width="1" height="1" fill="#f5d080" />
        <rect x="0" y="2" width="3" height="1" fill="#8a4008" />
      </g>
    </svg>
    </div>
  </div>
</template>

<style scoped>
/* ── 根容器：继承外部定位与 z-index ── */
.helper-root {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* ── 精灵容器 ── */
.helper-sprite {
  position: absolute;
  width: 18px;
  height: 26px;
  transition: none;
  image-rendering: pixelated;
  pointer-events: none;
}

.helper-sprite.flipped {
  transform: scaleX(-1);
}

/* 走路时身体轻微起伏 */
.sprite-svg {
  display: block;
}

.helper-sprite.is-walking .body-group {
  animation: sprite-bob 0.28s steps(2) infinite;
  /* 以脚为轴轻微起伏，避免整只飘起 */
  transform-origin: 50% 100%;
}

/* 举币：身体后仰蓄力，硬币高高举起 */
.helper-sprite.is-raising .sprite-svg {
  animation: raise-wind 0.55s steps(3) infinite;
}

/* 抛币：身体前倾，硬币抛出 */
.helper-sprite.is-throwing .sprite-svg {
  animation: throw-lunge 0.38s steps(3) infinite;
}

/* 举起时硬币停在手中（微光） */
.helper-sprite.is-raising .sprite-coin {
  animation: coin-gleam 0.5s steps(2) infinite;
}

/* 抛出时硬币上抛飞出 */
.helper-sprite.is-throwing .sprite-coin {
  animation: coin-toss 0.38s steps(5) forwards;
}

/* ── 浮动金额文字 ── */
.float-text {
  position: absolute;
  color: #ffd700;
  font-size: 16px;
  text-shadow: 2px 2px 0 #000;
  pointer-events: none;
  animation: float-up 0.9s steps(8, end) forwards;
  white-space: nowrap;
  z-index: 30;
}

@keyframes sprite-bob {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-0.5px); }
  100% { transform: translateY(0); }
}

/* 举币蓄力：轻微后仰 + 起伏 */
@keyframes raise-wind {
  0%   { transform: translateY(0) rotate(0); }
  50%  { transform: translateY(-2px) rotate(3deg); }
  100% { transform: translateY(0) rotate(0); }
}

/* 抛币前倾 */
@keyframes throw-lunge {
  0%   { transform: translateY(0) rotate(0); }
  50%  { transform: translateY(0) rotate(-4deg); }
  100% { transform: translateY(0) rotate(0); }
}

/* 举起时硬币微光闪烁 */
@keyframes coin-gleam {
  0%   { opacity: 1; }
  50%  { opacity: 0.65; }
  100% { opacity: 1; }
}

/* 抛出：从手中沿弧线飞出并淡出 */
@keyframes coin-toss {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  40%  { transform: translate(-6px, -10px) scale(1.15); opacity: 1; }
  100% { transform: translate(-14px, -2px) scale(0.8); opacity: 0; }
}

@keyframes float-up {
  0%   { transform: translateY(0); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}
</style>
