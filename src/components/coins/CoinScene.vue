<script setup lang="ts">
/**
 * 桌布硬币场景（可视化交互层）：
 * - 桌布上散布一枚枚可点击的像素硬币
 * - 点击硬币 → 硬币沿抛物线从 A 点抛掷到落币点（B 点）→ 飞行结束后结算一次翻转（doFlip）
 * - 小助手在桌布上行走 → 找到硬币 → 把硬币抛起来 → 飞行结束同样结算一次翻转
 * - 在线自动生产由本层接管（store.visualAuto）：每枚可见抛币 = 一次真实结算，
 *   高频期动画槽位不足的部分走 flipCoinsNow 批量兜底，保证数值与 tickHelpers 一致。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { totalFlipsPerSec } from '../../core'
import { formatCash } from '../../core/format'
import { helperSpriteDataUrl } from '../helpers/helperSprites'
import { useGameStore } from '../../stores/gameStore'

const props = defineProps<{
  /** 世界宽/高（px，世界坐标）。 */
  worldW: number
  worldH: number
  /** 当前可见视口在世界坐标中的位置（px，即桌布平移量）。 */
  viewX: number
  viewY: number
  /** 当前可见视口的宽/高（px，即用户面前的桌布大小）。 */
  viewW: number
  viewH: number
}>()

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

/** 桌面上可点击的硬币。 */
interface Coin {
  id: number
  x: number
  y: number
  active: boolean
  /** 是否正被某助手锁定为抛币目标。 */
  targeted: boolean
}

/** 飞行中的硬币（抛物线）。 */
interface FlyingCoin {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  /** 当前渲染位置（世界坐标）。 */
  x: number
  y: number
  t: number
  dur: number
  arcH: number
  settled: boolean
  /** 对应被抛起/点击的硬币 id（用于清除 targeted）。 */
  coinId: number | null
}

/** 行走找币的助手。 */
interface Helper {
  id: number
  x: number
  y: number
  facing: 1 | -1
  state: 'wander' | 'seek' | 'throw'
  /** seek/throw 的目标位置（硬币坐标）。 */
  tx: number
  ty: number
  /** 目标硬币 id。 */
  targetCoin: number | null
  walkT: number
  throwT: number
  colorIdx: number
  helperId: string
}

/** 落地飘字。 */
interface Popup {
  id: number
  x: number
  y: number
  text: string
  skull: boolean
}

/** 桌布同时渲染的硬币数量上限（性能与视觉均衡，可按设备性能调整）。 */
const MAX_COINS = 50
/** 桌布同时渲染的助手数量上限（与硬币一致的换批逻辑，≤50 全部渲染）。 */
const MAX_HELPERS = 50
const MAX_FLYING = 12
const WALK_SPEED = 60 // px/s
const THROW_HOLD_MS = 320
/** 桌布平移多少像素视为一次“换一批”刷新（用于海量硬币/助手感知）。 */
const PAN_REFRESH_PX = 100

/** 助手配色（头/身体/肤色/靴子）。 */
const HELPER_COLORS = [
  { head: '#f5c518', body: '#e8a800', skin: '#f6c98a', boot: '#7a4a12' },
  { head: '#f87171', body: '#ef4444', skin: '#f2b97f', boot: '#5a2410' },
  { head: '#a78bfa', body: '#7c3aed', skin: '#f0c18a', boot: '#2a1550' },
  { head: '#7dd3fc', body: '#0ea5e9', skin: '#f5d0a8', boot: '#0f4a5e' },
  { head: '#fca5a5', body: '#dc2626', skin: '#f6c98a', boot: '#45120f' },
  { head: '#fef08a', body: '#ffd700', skin: '#f6d3a0', boot: '#7a5200' },
]

const coins = ref<Coin[]>([])
const flying = ref<FlyingCoin[]>([])
const helpers = ref<Helper[]>([])
const popups = ref<Popup[]>([])

let nextCoin = 0
let nextFly = 0
let nextHelper = 0
let nextPop = 0
let raf = 0
let last = 0
/** 自动生产小数累积器。 */
let autoAccum = 0
/** 上次硬币“换一批”时对应的桌布平移网格 key。 */
let lastCoinPanKey = -1
/** 上次助手“换一批”时对应的桌布平移网格 key。 */
let lastHelperPanKey = -1

const rnd = (a: number, b: number): number => a + Math.random() * (b - a)

/** 桌布平移量的量化网格 key：用于检测“用户是否移动了桌布”。 */
function panKey(): number {
  return Math.round(props.viewX / PAN_REFRESH_PX) * 1e6 + Math.round(props.viewY / PAN_REFRESH_PX)
}

/** 坐标是否位于当前可见桌布（视口）内。 */
function isInView(x: number, y: number): boolean {
  return (
    x >= props.viewX && x <= props.viewX + props.viewW && y >= props.viewY && y <= props.viewY + props.viewH
  )
}

/** 当前可见桌布（视口）内的随机坐标（避开边缘），用于生成/重排硬币位置。 */
function randomCoinPos(): { x: number; y: number } {
  const pad = 34
  return {
    x: rnd(props.viewX + pad, Math.max(props.viewX + pad + 1, props.viewX + props.viewW - pad)),
    y: rnd(props.viewY + pad, Math.max(props.viewY + pad + 1, props.viewY + props.viewH - pad)),
  }
}

/** 当前可见桌布（视口）内的随机坐标（避开边缘），用于生成/重排助手位置。 */
function randomHelperPos(): { x: number; y: number } {
  const pad = 60
  return {
    x: rnd(props.viewX + pad, Math.max(props.viewX + pad + 1, props.viewX + props.viewW - pad)),
    y: rnd(props.viewY + pad, Math.max(props.viewY + pad + 1, props.viewY + props.viewH - pad)),
  }
}

/**
 * 生成落币点：视口内随机点，且与起点保持最小距离，
 * 保证抛物线 A→B 有明显跨度，避免硬币聚集中心导致抛物线过短。
 */
function landingPoint(fromX: number, fromY: number): { x: number; y: number } {
  const pad = 40
  const minDist = 150
  for (let i = 0; i < 10; i++) {
    const x = rnd(props.viewX + pad, Math.max(props.viewX + pad + 1, props.viewX + props.viewW - pad))
    const y = rnd(props.viewY + pad, Math.max(props.viewY + pad + 1, props.viewY + props.viewH - pad))
    if (Math.hypot(x - fromX, y - fromY) >= minDist) {
      return { x, y }
    }
  }
  // 兜底：取起点关于视口中心的对称点，保证有跨度
  return {
    x: props.viewX + (props.viewX + props.viewW - fromX),
    y: props.viewY + (props.viewY + props.viewH - fromY),
  }
}

function makeCoin(): Coin {
  const pos = randomCoinPos()
  return {
    id: nextCoin++,
    x: pos.x,
    y: pos.y,
    active: true,
    targeted: false,
  }
}

/** 当前持有的硬币总数（所有维度已购买数量之和）。 */
const coinsTotal = computed(() => {
  void uiVersion.value
  return state.value.dimensions.reduce((sum, d) => sum + d.bought, 0)
})

/**
 * 桌布上实时渲染的硬币目标数量：
 * 持有 ≤ 0 时不显示，持有数封顶 MAX_COINS 防性能损耗（≤ MAX_COINS 全部渲染）。
 */
function targetCoinCount(): number {
  const held = coinsTotal.value
  if (held <= 0) return 0
  return Math.min(MAX_COINS, held)
}

/** 同步桌布硬币数量：随持有硬币总数实时增删，保持 ≤ 目标数量。 */
function syncCoins(): void {
  const held = coinsTotal.value
  const target = targetCoinCount()
  // 持有数超过上限时：每次用户移动桌布，把当前这一批硬币随机重排，
  // 模拟“换一批展示”，让用户感知桌面上实际有海量（1000/2000…）硬币。
  if (held > MAX_COINS) {
    const key = panKey()
    if (key !== lastCoinPanKey) {
      lastCoinPanKey = key
      for (const c of coins.value) {
        const pos = randomCoinPos()
        c.x = pos.x
        c.y = pos.y
      }
    }
  } else {
    lastCoinPanKey = -1
  }
  while (coins.value.length < target) {
    coins.value.push(makeCoin())
  }
  if (coins.value.length > target) {
    coins.value.splice(target)
  }
}

/** 当前持有的助手总数（所有维度已购买数量之和）。 */
const helpersTotal = computed(() => {
  void uiVersion.value
  return Object.values(state.value.helpers).reduce((s, h) => s + h.count, 0)
})

/** 同步桌布助手：随持有助手总数实时增删，保持 ≤ 目标数量。 */
function spawnHelpers(): void {
  const owned = helpersTotal.value
  const current = helpers.value
  // 持有数超过上限时：每次用户移动桌布，把当前这一批助手随机重排，
  // 模拟“换一批展示”，让用户感知桌面上实际有海量助手。
  if (owned > MAX_HELPERS) {
    const key = panKey()
    if (key !== lastHelperPanKey) {
      lastHelperPanKey = key
      // 释放所有被锁定的硬币，助手全部回到随机游走状态并重排位置
      for (const c of coins.value) {
        c.targeted = false
      }
      for (const h of current) {
        const pos = randomHelperPos()
        h.x = pos.x
        h.y = pos.y
        h.state = 'wander'
        h.targetCoin = null
        h.throwT = 0
        h.walkT = rnd(0, 800)
      }
    }
  } else {
    lastHelperPanKey = -1
  }
  // 期望的助手类型序列：按玩家实际拥有的助手展开（封顶 MAX_HELPERS），
  // 让桌布上的精灵与玩家雇佣的助手一一对应。
  const desiredIds: string[] = []
  for (const [id, hs] of Object.entries(state.value.helpers)) {
    const need = Math.min(hs.count, MAX_HELPERS - desiredIds.length)
    for (let i = 0; i < need; i++) {
      desiredIds.push(id)
    }
    if (desiredIds.length >= MAX_HELPERS) break
  }
  const count = desiredIds.length
  // 增减：保持已有助手位置，不足则补新（用对应玩家助手 id 的精灵）
  while (current.length < count) {
    const pos = randomHelperPos()
    current.push({
      id: nextHelper++,
      x: pos.x,
      y: pos.y,
      facing: Math.random() > 0.5 ? 1 : -1,
      state: 'wander',
      tx: 0,
      ty: 0,
      targetCoin: null,
      walkT: rnd(0, 800),
      throwT: 0,
      colorIdx: current.length % HELPER_COLORS.length,
      helperId: desiredIds[current.length]!,
    })
  }
  current.length = count
}

/** 创建一枚飞币（抛物线 A→落币点 B）。落点为视口内随机点且远离起点。 */
function createThrow(fromX: number, fromY: number, coinId: number | null): boolean {
  if (flying.value.length >= MAX_FLYING) return false
  const { x: tx, y: ty } = landingPoint(fromX, fromY)
  const dist = Math.hypot(tx - fromX, ty - fromY)
  const arcH = Math.min(72, dist * 0.22 + 34)
  flying.value.push({
    id: nextFly++,
    fromX,
    fromY,
    toX: tx,
    toY: ty,
    x: fromX,
    y: fromY,
    t: 0,
    dur: 560 + rnd(0, 240),
    arcH,
    settled: false,
    coinId,
  })
  // 抛起后移除目标硬币，并在落币点附近重生（点击/助手抛币统一处理）
  if (coinId !== null) {
    const c = coins.value.find((cc) => cc.id === coinId)
    if (c) {
      c.active = false
      setTimeout(() => {
        if (!c.active) {
          // 在落币点（B 点）附近重生，硬币落在眼前，小助手可继续找到
          c.x = tx + rnd(-50, 50)
          c.y = ty + rnd(-40, 40)
          c.active = true
          c.targeted = false
        }
      }, 1000)
    }
  }
  return true
}

/** 落地飘字。 */
function spawnPopup(x: number, y: number, result: { skull: boolean; earned: import('break_infinity.js').default }): void {
  const id = nextPop++
  popups.value.push({
    id,
    x,
    y: y - 6,
    text: result.skull ? '☠' : `+${formatCash(result.earned)}`,
    skull: result.skull,
  })
  setTimeout(() => {
    popups.value = popups.value.filter((p) => p.id !== id)
  }, 900)
}

/** 立即结算（飞币槽位满时手动点击的兜底）。 */
function settleImmediate(x: number, y: number): void {
  const result = store.doFlip()
  spawnPopup(x, y, result)
}

/** 点击硬币：该枚硬币沿抛物线抛掷到落币点。 */
function onCoinClick(c: Coin): void {
  if (!c.active || c.targeted) return
  if (!createThrow(c.x, c.y, c.id)) {
    settleImmediate(c.x, c.y)
  }
}

/** 推进飞币：沿抛物线插值，落地时结算一次翻转。 */
function tickFlying(dt: number): void {
  const remaining: FlyingCoin[] = []
  for (const fc of flying.value) {
    fc.t += dt * 1000
    const p = Math.min(fc.t / fc.dur, 1)
    fc.x = fc.fromX + (fc.toX - fc.fromX) * p
    fc.y = fc.fromY + (fc.toY - fc.fromY) * p - Math.sin(Math.PI * p) * fc.arcH
    if (p >= 1 && !fc.settled) {
      fc.settled = true
      if (fc.coinId !== null) {
        const coin = coins.value.find((c) => c.id === fc.coinId)
        if (coin) coin.targeted = false
      }
      const result = store.doFlip()
      spawnPopup(fc.toX, fc.toY, result)
    }
    // 落地后再驻留 500ms，让飘字可见
    if (fc.t < fc.dur + 500) remaining.push(fc)
  }
  flying.value = remaining
}

/**
 * 让一只空闲助手走向一枚可见桌布内的硬币并准备抛币。
 * 就近优先的加权随机：距离越近权重越高（避免老找很远的硬币），
 * 但仍带随机性（避免每次只盯同一颗）。
 */
function assignHelperThrow(): boolean {
  const idle = helpers.value.find((h) => h.state === 'wander')
  if (!idle) return false
  const candidates = coins.value.filter((c) => c.active && !c.targeted && isInView(c.x, c.y))
  if (candidates.length === 0) return false
  // 权重 = 距离倒数（下限 40px，避免过近硬币权重无穷大）
  const weights = candidates.map(
    (c) => 1 / Math.max(40, Math.hypot(c.x - idle.x, c.y - idle.y)),
  )
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * total
  let coin = candidates[candidates.length - 1]!
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]!
    if (r <= 0) {
      coin = candidates[i]!
      break
    }
  }
  coin.targeted = true
  idle.state = 'seek'
  idle.targetCoin = coin.id
  idle.tx = coin.x
  idle.ty = coin.y
  return true
}

/** 推进助手：行走找币 → 抛币。 */
function tickHelpersVisual(dt: number): void {
  const W = props.worldW
  const H = props.worldH
  for (const h of helpers.value) {
    if (h.state === 'wander') {
      h.walkT -= dt * 1000
      h.x += h.facing * WALK_SPEED * dt
      if (h.x < 10 || h.x > W - 10) {
        h.facing = h.facing === 1 ? -1 : 1
      }
      if (h.walkT <= 0) {
        h.facing = Math.random() > 0.5 ? 1 : -1
        h.walkT = rnd(900, 2200)
      }
    } else if (h.state === 'seek') {
      const dx = h.tx - h.x
      const dy = h.ty - h.y
      const dist = Math.hypot(dx, dy)
      if (dist < 14) {
        h.state = 'throw'
        h.throwT = THROW_HOLD_MS
      } else {
        h.facing = dx >= 0 ? 1 : -1
        h.x += (dx / dist) * WALK_SPEED * dt
        h.y += (dy / dist) * WALK_SPEED * dt
      }
    } else if (h.state === 'throw') {
      h.throwT -= dt * 1000
      if (h.throwT <= 0) {
        createThrow(h.tx, h.ty, h.targetCoin)
        h.targetCoin = null
        h.state = 'wander'
        h.walkT = rnd(600, 1400)
      }
    }
  }
  void H
}

/** 在线自动生产：把每秒翻转速率拆分为"可见抛币"+"批量兜底"。 */
function tickProduction(dt: number): void {
  autoAccum += totalFlipsPerSec(state.value).toNumber() * dt
  let due = Math.floor(autoAccum)
  autoAccum -= due
  if (due <= 0) return

  // 低频：走可视化抛币（每帧最多 1 枚，受槽位限制）；高频：其余走批量兜底
  let animated = 0
  if (flying.value.length < MAX_FLYING && assignHelperThrow()) {
    animated = 1
  }
  due -= animated
  if (due > 0) {
    store.flipCoinsNow(due)
  }
}

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now

  syncCoins()
  spawnHelpers()
  tickProduction(dt)
  tickHelpersVisual(dt)
  tickFlying(dt)

  uiVersion.value += 1
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  // 初始化硬币：数量按当前持有硬币总数实时生成
  syncCoins()
  spawnHelpers()
  store.setVisualAuto(true)
  last = performance.now()
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  store.setVisualAuto(false)
  // 卸载时把未落地的飞币补结算，避免丢失
  const unsettled = flying.value.filter((f) => !f.settled).length
  if (unsettled > 0) {
    store.flipCoinsNow(unsettled)
  }
})
</script>

<template>
  <div class="coin-scene" :style="{ width: `${worldW}px`, height: `${worldH}px` }">
    <!-- 可点击硬币 -->
    <button
      v-for="c in coins"
      v-show="c.active"
      :key="c.id"
      class="cs-coin cs-coin--idle pixel-number"
      :style="{ left: `${c.x}px`, top: `${c.y}px` }"
      type="button"
      :aria-label="'翻转硬币'"
      @click="onCoinClick(c)"
    >
      <span class="cs-coin__glare" />
      <span class="cs-coin__face">$</span>
      <span class="cs-coin__shadow" />
    </button>

    <!-- 飞行中的硬币（抛物线） -->
    <div
      v-for="fc in flying"
      :key="fc.id"
      class="cs-flying pixel-number"
      :style="{ left: `${fc.x}px`, top: `${fc.y}px` }"
    >
      <span class="cs-coin__glare" />
      <span class="cs-coin__face">$</span>
    </div>

    <!-- 助手群 -->
    <div
      v-for="h in helpers"
      :key="h.id"
      class="cs-helper"
      :class="{ 'cs-helper--seek': h.state === 'seek', 'cs-helper--throw': h.state === 'throw' }"
      :style="{
        left: `${h.x}px`,
        top: `${h.y}px`,
        transform: `scaleX(${h.facing})`,
      }"
    >
      <span class="cs-h-shadow" />
      <span v-if="h.state === 'throw'" class="cs-h-coin" />
      <img
        class="cs-h-sprite"
        :src="helperSpriteDataUrl(h.helperId)"
        :alt="h.helperId"
        draggable="false"
      >
    </div>

    <!-- 落地飘字 -->
    <div
      v-for="p in popups"
      :key="p.id"
      class="cs-popup pixel-number"
      :class="{ 'cs-popup--skull': p.skull }"
      :style="{ left: `${p.x}px`, top: `${p.y}px` }"
    >
      {{ p.text }}
    </div>
  </div>
</template>

<style scoped>
.coin-scene {
  position: absolute;
  left: 0;
  top: 0;
}

/* ── 可点击硬币（8-bit 像素方块金币） ── */
.cs-coin {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #d4a017;
  border: 2px solid #7a5c00;
  box-shadow:
    inset -3px -3px 0 #8a6000,
    inset  3px  3px 0 #f0c840,
    3px 3px 0 rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  image-rendering: pixelated;
  z-index: 5;
  padding: 0;
}

.cs-coin--idle:hover {
  box-shadow:
    inset -3px -3px 0 #8a6000,
    inset  3px  3px 0 #f0c840,
    3px 3px 0 rgba(0, 0, 0, 0.9),
    0 0 0 2px #fff;
}

.cs-coin__glare {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 5px;
  height: 3px;
  background: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.cs-coin__face {
  font-size: 10px;
  font-weight: 900;
  color: #3d2800;
  line-height: 1;
  pointer-events: none;
  position: relative;
  z-index: 2;
}

.cs-coin__shadow {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 5px;
  height: 3px;
  background: rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

/* ── 飞行中的硬币（8-bit 像素方块金币） ── */
.cs-flying {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #d4a017;
  border: 2px solid #7a5c00;
  box-shadow:
    inset -2px -2px 0 #8a6000,
    inset  2px  2px 0 #f0c840,
    2px 2px 0 rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: pixelated;
  z-index: 20;
  animation: cs-spin 0.4s steps(4) infinite;
}

@keyframes cs-spin {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(0.15); background: #8b6914; }
}

/* ── 助手 ── */
.cs-helper {
  position: absolute;
  width: 20px;
  height: 20px;
  z-index: 8;
  pointer-events: none;
}

.cs-h-shadow {
  position: absolute;
  left: 2px;
  bottom: 0;
  width: 16px;
  height: 3px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0) 70%);
}

/* 真实 16×16 像素画：小鸭 / 狐狸 / 熊等（来自助手页面） */
.cs-h-sprite {
  position: absolute;
  left: 1px;
  top: 0;
  width: 18px;
  height: 18px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation: cs-walk 0.32s steps(2) infinite;
}
.cs-helper--throw .cs-h-sprite {
  /* 抛掷时停住摆姿势；seek 行走时保持走步动画 */
  animation: none;
}

.cs-h-coin {
  position: absolute;
  left: 14px;
  top: 0;
  width: 5px;
  height: 5px;
  background: #d4a017;
  border-top: 1px solid #f0c840;
  border-left: 1px solid #f0c840;
  border-right: 1px solid #8a6000;
  border-bottom: 1px solid #8a6000;
  animation: cs-toss 0.3s steps(4) infinite;
}

@keyframes cs-walk {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes cs-toss {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-2px, -6px); }
}

/* ── 落地飘字 ── */
.cs-popup {
  position: absolute;
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
  pointer-events: none;
  z-index: 30;
  white-space: nowrap;
  animation: cs-float 0.9s steps(8, end) forwards;
}

.cs-popup--skull {
  color: #c4b5fd;
}

@keyframes cs-float {
  0% { transform: translateY(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}
</style>
