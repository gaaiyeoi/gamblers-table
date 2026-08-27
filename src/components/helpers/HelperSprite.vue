<script setup lang="ts">
/**
 * 活动助手精灵（参考"像素赌桌"游戏视觉）：
 * - 在赌桌区域随机游走（左右来回移动）
 * - 每 1-2s 停下来做"举硬币→抛→落地"动作
 * - 抛硬币落地后飘出 +$X 浮字
 * - 助手 hat 颜色对应稀有度
 */

import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const hatColors: Record<HatRarity, string> = {
  common: '#cc2020',
  rare: '#3ddc84',
  epic: '#b06cff',
  legendary: '#ffd700',
}
const hatColor = hatColors[props.rarity]

// 每种助手的像素配色（头色 / 身体色）
const helperBodyColors: Record<string, { head: string; body: string }> = {
  novice:      { head: '#f5c518', body: '#e8a800' },  // 小黄鸭
  apprentice:  { head: '#f87171', body: '#ef4444' },  // 红狐狸
  journeyman:  { head: '#d97706', body: '#92400e' },  // 棕熊
  expert:      { head: '#a78bfa', body: '#7c3aed' },  // 紫魔法师
  master:      { head: '#7dd3fc', body: '#0ea5e9' },  // 冰蓝大师
  grandmaster: { head: '#fca5a5', body: '#dc2626' },  // 红炎宗师
  legend:      { head: '#fef08a', body: '#ffd700' },  // 金色英雄
  mythic:      { head: '#f9a8d4', body: '#ec4899' },  // 粉神话
}
const bodyColor = helperBodyColors[props.helperId] ?? { head: '#f0a020', body: '#e09018' }

// ---- 动画循环 ----
let animFrame = 0
let lastTime = 0
let walkTimer = 0
let actionTimer = 0
let floatId = 0
const WALK_SPEED = 28 // px/s
let walkDuration = 0
let idleTarget = 0

function nextAction(): void {
  const r = Math.random()
  if (r < 0.5) {
    // 走一段时间
    facingRight.value = Math.random() > 0.5
    walkDuration = 600 + Math.random() * 900
    walkTimer = 0
    action.value = 'walk'
  } else if (r < 0.85) {
    // 静止等待
    idleTarget = 400 + Math.random() * 600
    walkTimer = 0
    action.value = 'idle'
  } else {
    // 举硬币 + 抛
    action.value = 'raise'
    walkTimer = 0
  }
  actionTimer = 600 + Math.random() * 1400
}

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
    const dir = facingRight.value ? 1 : -1
    x.value = Math.max(8, Math.min(W, x.value + dir * WALK_SPEED * dt))
    if (x.value <= 8 || x.value >= W) facingRight.value = !facingRight.value
    if (walkTimer >= walkDuration) nextAction()
  } else if (action.value === 'idle') {
    if (walkTimer >= idleTarget) nextAction()
  } else if (action.value === 'raise') {
    if (walkTimer > 600) {
      // 抛出
      action.value = 'throw'
      walkTimer = 0
    }
  } else if (action.value === 'throw') {
    if (walkTimer > 400) {
      // 落地，飘字，告知父组件计入产出
      spawnFloat(`+$${(Math.random() * 3 + 0.5).toFixed(1)}`)
      emit('flip')
      action.value = 'idle'
      walkTimer = 0
      idleTarget = 500 + Math.random() * 800
    }
  }

  if (actionTimer <= 0) nextAction()
  // 保持在区域内
  y.value = Math.max(20, Math.min(H, y.value))
  animFrame = requestAnimationFrame(tick)
}

onMounted(() => {
  // 随机散布初始位置
  x.value = 20 + (props.index % 7) * 80 + Math.random() * 20
  y.value = 30 + Math.floor(props.index / 7) * 70 + Math.random() * 20
  actionTimer = Math.random() * 800
  lastTime = performance.now()
  animFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(animFrame))
</script>

<template>
  <!-- 助手精灵 -->
  <div
    class="helper-sprite"
    :class="[`action-${action}`, { flipped: !facingRight }]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    :aria-label="t(helperId)"
  >
    <!-- 帽子 -->
    <div class="sprite-hat" :style="{ background: hatColor }" />
    <!-- 头部：根据 helperId 配色 -->
    <div class="sprite-head" :style="{ background: bodyColor.head, boxShadow: `inset -2px -2px 0 color-mix(in srgb, ${bodyColor.head} 30%, #000), inset 1px 1px 0 color-mix(in srgb, ${bodyColor.head} 80%, #fff)` }" />
    <!-- 躯体 -->
    <div class="sprite-body" :style="{ background: bodyColor.body, boxShadow: `inset -2px -2px 0 color-mix(in srgb, ${bodyColor.body} 30%, #000), inset 1px 1px 0 color-mix(in srgb, ${bodyColor.body} 80%, #fff)` }" />
    <!-- 举起的硬币 -->
    <div v-if="action === 'raise' || action === 'throw'" class="sprite-coin" />
  </div>

  <!-- 浮动 +$ 文字 -->
  <div
    v-for="f in floats"
    :key="f.id"
    class="float-text pixel-number"
    :style="{ left: `${x + f.offsetX + 10}px`, top: `${y - 16}px` }"
  >
    {{ f.value }}
  </div>
</template>

<style scoped>
/* ── 精灵容器 ── */
.helper-sprite {
  position: absolute;
  width: 14px;
  height: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  transition: none;
  image-rendering: pixelated;
}

.helper-sprite.flipped {
  transform: scaleX(-1);
}

/* 走路时轻微上下弹跳 */
.helper-sprite.action-walk .sprite-head,
.helper-sprite.action-walk .sprite-body {
  animation: walk-bob 0.28s steps(2) infinite;
}

/* 举硬币 */
.helper-sprite.action-raise .sprite-coin {
  animation: raise-coin 0.5s steps(6, end) forwards;
}

/* 抛出 */
.helper-sprite.action-throw .sprite-coin {
  animation: throw-coin 0.35s steps(5, end) forwards;
}

/* ── 帽子：宽扁像素顶帽（颜色随稀有度） ── */
.sprite-hat {
  width: 14px;
  height: 5px;
  image-rendering: pixelated;
  box-shadow:
    inset -2px -2px 0 rgba(0, 0, 0, 0.55),
    inset 2px 1px 0 rgba(255, 255, 255, 0.2);
}

/* ── 头部：像素方块，无圆角 ── */
.sprite-head {
  width: 10px;
  height: 10px;
  border: 2px solid rgba(0, 0, 0, 0.85);
  image-rendering: pixelated;
}

/* ── 身体：像素方块，无圆角 ── */
.sprite-body {
  width: 10px;
  height: 10px;
  border: 2px solid rgba(0, 0, 0, 0.65);
  border-top: none;
  image-rendering: pixelated;
}

/* ── 举起的硬币（棕橙色像素硬币） ── */
.sprite-coin {
  position: absolute;
  top: -8px;
  right: -4px;
  width: 9px;
  height: 9px;
  background: #c06010;
  border: 1px solid #7a3c08;
  box-shadow:
    inset -2px -2px 0 #8a4008,
    inset 2px 2px 0 #e8801c;
  image-rendering: pixelated;
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
}

@keyframes walk-bob {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-1px); }
  100% { transform: translateY(0); }
}

@keyframes raise-coin {
  0%   { top: 0; opacity: 1; }
  100% { top: -16px; opacity: 1; }
}

@keyframes throw-coin {
  0%   { top: -16px; right: -4px; opacity: 1; }
  60%  { top: -26px; right: 10px; opacity: 1; }
  100% { top: -8px;  right: 18px; opacity: 0; }
}

@keyframes float-up {
  0%   { transform: translateY(0); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}
</style>
