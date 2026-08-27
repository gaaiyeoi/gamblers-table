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

import { COIN_TYPES, EventHub, GAME_EVENT, SpawnQueue, totalFlipsPerSec, upgradeLevel } from '../../core'
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

const emit = defineEmits<{
  /** 精灵上桌进度变化：busy 表示有精灵正在释放，ratio 为 0~1，remaining 为剩余数。 */
  (e: 'spawn-progress', payload: { busy: boolean; ratio: number; remaining: number }): void
}>()

const store = useGameStore()
const { state } = storeToRefs(store)

/** 当局升级的响应式开关（视觉层读取等级，真正生效）。 */
const hasQuickFlip = computed(() => upgradeLevel(state.value, 'quickFlip') > 0)
const hasTouchOfMidas = computed(() => upgradeLevel(state.value, 'touchOfMidas') > 0)
const hasSilverGlide = computed(() => upgradeLevel(state.value, 'silverGlide') > 0)
const hasHandOfMidas = computed(() => upgradeLevel(state.value, 'handOfMidas') > 0)
const hasPreferHigherCoins = computed(() => upgradeLevel(state.value, 'preferHigherCoins') > 0)
/** 脚步轻快：助手走路速度，每级 +22px/s。 */
const walkSpeed = computed(() => WALK_SPEED + 22 * upgradeLevel(state.value, 'lightFootsteps'))

/** 桌面上可点击的硬币。 */
interface Coin {
  id: number
  /** 逻辑坐标（世界坐标，用于碰撞/视口判断/助手寻路）。 */
  x: number
  y: number
  /** 渲染坐标（每帧向 x/y 指数平滑，用于重排时的平滑过渡）。 */
  dx: number
  dy: number
  /** 硬币阶数（对应 COIN_TYPES 下标 + 1，决定外观）。 */
  tier: number
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
  /** 硬币阶数（决定飞币外观）。 */
  tier: number
  /** 对应被抛起/点击的硬币 id（用于清除 targeted）。 */
  coinId: number | null
  /** 落地结果是否为骷髅面（落地结算后确定，用于正反面显示）。 */
  skull: boolean
}

/** 行走找币的助手。 */
interface Helper {
  id: number
  /** 逻辑坐标（世界坐标，用于寻路/抛币目标）。 */
  x: number
  y: number
  /** 渲染坐标（每帧向 x/y 指数平滑，用于重排时的平滑过渡）。 */
  dx: number
  dy: number
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
/** 桌布平移多少像素视为一次"换一批"刷新（用于海量硬币/助手感知）。 */
const PAN_REFRESH_PX = 100
/** 渲染坐标向逻辑坐标贴合的速度（1/s），越大越快。用于把重排的位置突变变成平滑滑动。 */
const DISPLAY_LERP = 12

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
/** 生成队列随游戏主循环 tick 推进的订阅句柄（卸载时取消）。 */
let offGameTick: (() => void) | null = null
let last = 0
/** 自动生产小数累积器。 */
let autoAccum = 0
/** 上次硬币"换一批"时对应的桌布平移网格 key。 */
let lastCoinPanKey = -1
/** 上次助手"换一批"时对应的桌布平移网格 key。 */
let lastHelperPanKey = -1
/** 上次硬币持有总数（用于在购买后精确重建硬币类型分布）。 */
let lastTierTotal = -1
/** 精灵释放间隔与主循环固定步长（GameLoop.stepMs=50）对齐：每个逻辑 tick 释放一枚。 */
const SPAWN_INTERVAL_MS = 50
/** 硬币精灵的生成队列：购买后逐枚释放上桌。 */
const coinQueue = new SpawnQueue({ intervalMs: SPAWN_INTERVAL_MS })
/** 助手精灵的生成队列：雇佣后逐位走上桌。 */
const helperQueue = new SpawnQueue({ intervalMs: SPAWN_INTERVAL_MS })
/** 已规划的硬币渲染目标（用于计算入队差值）。 */
let coinTarget = 0
/** 已规划的助手渲染目标。 */
let helperTarget = 0
/** 硬币精灵是否已完成首帧铺满。 */
let coinsReady = false
/** 助手精灵是否已完成首帧铺满。 */
let helpersReady = false

const rnd = (a: number, b: number): number => a + Math.random() * (b - a)

/** 桌布平移量的量化网格 key：用于检测"用户是否移动了桌布"。 */
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

/** 硬币阶数对应的图标 id（未知阶兜底 copper）。 */
function coinIcon(tier: number): string {
  return COIN_TYPES[tier - 1]?.icon ?? 'copper'
}

/** 按玩家各硬币类型的持有量加权随机选取一枚硬币的阶数（tier 从 1 开始）。 */
function pickCoinTier(): number {
  const dims = state.value.dimensions
  const weights = dims.map((d) => d.bought)
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return 1
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!
    if (r <= 0) return i + 1
  }
  return weights.length
}

/**
 * 按各维度持有量精确重建桌布硬币类型分布：
 * 每种硬币的数量严格等于其维度已购买数（例如 12 铜 + 1 银），
 * 避免"买了银币却因随机抽不中而全是铜币"。
 */
function redistributeCoinTiers(): void {
  const pool: number[] = []
  state.value.dimensions.forEach((d, i) => {
    for (let k = 0; k < d.bought; k++) {
      pool.push(i + 1)
    }
  })
  if (pool.length === 0) return
  // 打乱，避免同类硬币扎堆
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  coins.value.forEach((c, idx) => {
    c.tier = pool[idx % pool.length]!
  })
}

function makeCoin(): Coin {
  const pos = randomCoinPos()
  return {
    id: nextCoin++,
    x: pos.x,
    y: pos.y,
    dx: pos.x,
    dy: pos.y,
    tier: pickCoinTier(),
    active: true,
    targeted: false,
  }
}

/** 在视口内随机位置生成一个助手精灵，其类型由 desiredIds 序列下标决定。 */
function makeHelper(desiredIds: string[], index: number): Helper {
  const pos = randomHelperPos()
  return {
    id: nextHelper++,
    x: pos.x,
    y: pos.y,
    dx: pos.x,
    dy: pos.y,
    facing: Math.random() > 0.5 ? 1 : -1,
    state: 'wander',
    tx: 0,
    ty: 0,
    targetCoin: null,
    walkT: rnd(0, 800),
    throwT: 0,
    colorIdx: index % HELPER_COLORS.length,
    helperId: desiredIds[index]!,
  }
}

/** 当前持有的硬币总数（所有维度已购买数量之和）。 */
const coinsTotal = computed(() => state.value.dimensions.reduce((sum, d) => sum + d.bought, 0))

/**
 * 桌布上实时渲染的硬币目标数量：
 * 开局即使未购买任何硬币，也默认保留 1 枚可点击的初始硬币（保证新手有得点）；
 * 持有数封顶 MAX_COINS 防性能损耗（≤ MAX_COINS 全部渲染）。
 */
function targetCoinCount(): number {
  const held = coinsTotal.value
  if (held <= 0) return 1
  return Math.min(MAX_COINS, held)
}

/**
 * 把处于找币/抛币状态的助手重置回游走。
 * 传入 movedIds 时仅重置"目标硬币已被重定位"的助手；不传则重置全部非游走助手。
 */
function resetSeekingHelpers(movedIds?: Set<number>): void {
  for (const h of helpers.value) {
    if (h.state === 'wander') continue
    if (movedIds && (h.targetCoin === null || !movedIds.has(h.targetCoin))) continue
    h.state = 'wander'
    h.targetCoin = null
    h.throwT = 0
    h.walkT = rnd(0, 800)
  }
}

/** 同步桌布硬币数量：随持有硬币总数实时增删，保持 ≤ 目标数量。 */
function syncCoins(dt: number): void {
  // 视口尺寸尚未就绪（父组件 onMounted 还未执行），跳过以避免所有精灵堆叠在 (0,0) 角落。
  if (props.viewW <= 0 || props.viewH <= 0) return
  const held = coinsTotal.value
  const target = targetCoinCount()
  const key = panKey()

  // 用户移动桌布时，只把"移出视口"的硬币重新分布到视口内，视口内的硬币保持不动；
  // 配合渲染层 lerp，滚出去的硬币会平滑滑回视野，而不是整批瞬移。
  if (key !== lastCoinPanKey) {
    lastCoinPanKey = key
    const movedIds = new Set<number>()
    for (const c of coins.value) {
      if (!isInView(c.x, c.y)) {
        const pos = randomCoinPos()
        c.x = pos.x
        c.y = pos.y
        c.targeted = false
        movedIds.add(c.id)
      }
    }
    if (movedIds.size > 0) {
      resetSeekingHelpers(movedIds)
    }
  }

  // 生成队列：首帧直接铺满；之后购买按队列逐枚释放（每 intervalMs 一枚），
  // 减少时立即移除，保证转生/封禁等场景硬币瞬间清空。
  if (!coinsReady) {
    coinsReady = true
    coinTarget = target
    while (coins.value.length < target) {
      coins.value.push(makeCoin())
    }
  } else {
    if (target > coinTarget) {
      coinQueue.enqueue(target - coinTarget)
    } else if (target < coinTarget) {
      coinQueue.clear()
      if (coins.value.length > target) {
        coins.value.splice(target)
      }
    }
    coinTarget = target
    const released = coinQueue.tick(dt * 1000)
    for (let i = 0; i < released; i++) {
      coins.value.push(makeCoin())
    }
  }
  // 购买硬币后，按各维度持有量精确重建硬币类型分布
  if (held !== lastTierTotal) {
    lastTierTotal = held
    redistributeCoinTiers()
  }
}

/** 期望上桌的助手类型序列：按玩家实际拥有展开（封顶 MAX_HELPERS）。 */
function desiredHelperIds(): string[] {
  const desiredIds: string[] = []
  for (const [id, hs] of Object.entries(state.value.helpers)) {
    const need = Math.min(hs.count, MAX_HELPERS - desiredIds.length)
    for (let i = 0; i < need; i++) {
      desiredIds.push(id)
    }
    if (desiredIds.length >= MAX_HELPERS) break
  }
  return desiredIds
}

/** 同步桌布助手：随持有助手总数实时增删，保持 ≤ 目标数量。 */
function spawnHelpers(dt: number): void {
  // 视口尺寸尚未就绪，跳过以避免所有助手堆叠在 (0,0) 角落。
  if (props.viewW <= 0 || props.viewH <= 0) return
  const current = helpers.value
  const key = panKey()

  // 用户移动桌布时，只把"游走中且移出视口"的助手拉回视口，其余助手保持不动；
  // seek/throw 助手保持目标（其目标硬币若被重定位，由 syncCoins 的 resetSeekingHelpers 处理）。
  if (key !== lastHelperPanKey) {
    lastHelperPanKey = key
    for (const h of current) {
      if (h.state === 'wander' && !isInView(h.x, h.y)) {
        const pos = randomHelperPos()
        h.x = pos.x
        h.y = pos.y
        h.walkT = rnd(0, 800)
      }
    }
  }
  const desiredIds = desiredHelperIds()
  const count = desiredIds.length

  // 生成队列：首帧直接铺满；之后雇佣按队列逐位走上桌，减少时立即移除。
  if (!helpersReady) {
    helpersReady = true
    helperTarget = count
    while (current.length < count) {
      current.push(makeHelper(desiredIds, current.length))
    }
  } else {
    if (count > helperTarget) {
      helperQueue.enqueue(count - helperTarget)
    } else if (count < helperTarget) {
      helperQueue.clear()
      if (current.length > count) {
        current.length = count
      }
    }
    helperTarget = count
    const released = helperQueue.tick(dt * 1000)
    for (let i = 0; i < released; i++) {
      current.push(makeHelper(desiredIds, current.length))
    }
  }
}

/** 创建一枚飞币（抛物线 A→落币点 B）。落点为视口内随机点且远离起点。 */
function createThrow(fromX: number, fromY: number, coinId: number | null): boolean {
  if (flying.value.length >= MAX_FLYING) return false
  const { x: tx, y: ty } = landingPoint(fromX, fromY)
  const dist = Math.hypot(tx - fromX, ty - fromY)
  const arcH = Math.min(72, dist * 0.22 + 34)
  const sourceCoin = coinId !== null ? coins.value.find((cc) => cc.id === coinId) : null
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
    tier: sourceCoin?.tier ?? 1,
    coinId,
    skull: false,
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
          // 硬币是"重新出现"，直接同步渲染坐标，避免重生时多余滑动
          c.dx = c.x
          c.dy = c.y
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
    text: result.skull ? '+1' : `+${formatCash(result.earned)}`,
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

/** 抛起一枚硬币（飞行槽满则立即结算兜底）。 */
function flipCoinAt(c: Coin): void {
  if (!c.active || c.targeted) return
  if (!createThrow(c.x, c.y, c.id)) {
    settleImmediate(c.x, c.y)
  }
}

/** 点击硬币：该枚硬币沿抛物线抛掷到落币点。 */
function onCoinClick(c: Coin): void {
  flipCoinAt(c)
  // 点金大手：一次点击顺带翻动附近（60px 内）至多 2 枚硬币
  if (!hasTouchOfMidas.value) return
  const neighbors = coins.value
    .filter((n) => n.id !== c.id && n.active && !n.targeted && Math.hypot(n.x - c.x, n.y - c.y) < 60)
    .slice(0, 2)
  for (const n of neighbors) {
    flipCoinAt(n)
  }
}

/** 悬停自动翻转：银币滑行（银币）/ 点金之手（金币）。 */
function onCoinHover(c: Coin): void {
  if (c.tier === 2 && hasSilverGlide.value) {
    flipCoinAt(c)
  } else if (c.tier === 3 && hasHandOfMidas.value) {
    flipCoinAt(c)
  }
}

/**
 * 翻转桌面上随机一枚可点击硬币（供外部按钮调用）：
 * 优先在可见视口内随机选，视口内没有时退而求其次在全部硬币中选。
 */
function flipRandomCoin(): void {
  const inView = coins.value.filter((c) => c.active && !c.targeted && isInView(c.x, c.y))
  const pool = inView.length > 0 ? inView : coins.value.filter((c) => c.active && !c.targeted)
  if (pool.length === 0) return
  const coin = pool[Math.floor(Math.random() * pool.length)]!
  onCoinClick(coin)
}

defineExpose({ flipRandomCoin })

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
      fc.skull = result.skull
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
  const weights = candidates.map((c) => {
    const w = 1 / Math.max(40, Math.hypot(c.x - idle.x, c.y - idle.y))
    // 优先高级币：按阶数平方放大权重，高 tier 明显更优先
    return hasPreferHigherCoins.value ? w * c.tier * c.tier : w
  })
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
    const speed = walkSpeed.value
    if (h.state === 'wander') {
      h.walkT -= dt * 1000
      h.x += h.facing * speed * dt
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
        h.x += (dx / dist) * speed * dt
        h.y += (dy / dist) * speed * dt
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

/** 渲染坐标向逻辑坐标指数平滑，把"拉回/重排"的位置突变变成平滑滑动。 */
function tickDisplay(dt: number): void {
  const t = 1 - Math.exp(-DISPLAY_LERP * dt)
  for (const c of coins.value) {
    c.dx += (c.x - c.dx) * t
    c.dy += (c.y - c.dy) * t
  }
  for (const h of helpers.value) {
    h.dx += (h.x - h.dx) * t
    h.dy += (h.y - h.dy) * t
  }
}

/** 上桌进度状态（供倒计时进度条），变化时才 emit 以减少父组件重渲染。 */
let spawnBusy = false
let spawnRatio = 1
let spawnRemaining = 0

/** 合并硬币与助手队列的释放进度，并在变化时通知父组件。 */
function emitSpawnProgress(): void {
  const remaining = coinQueue.remaining + helperQueue.remaining
  const total = coinQueue.total + helperQueue.total
  const busy = remaining > 0
  const ratio = total > 0 ? (total - remaining) / total : 1
  if (busy === spawnBusy && ratio === spawnRatio && remaining === spawnRemaining) {
    return
  }
  spawnBusy = busy
  spawnRatio = ratio
  spawnRemaining = remaining
  emit('spawn-progress', { busy, ratio, remaining })
}

/** 生成队列随主循环 tick 推进：与自动购买器（tickAutobuyers）同源，统一走 GameLoop 固定步长。 */
function onGameTick(payload: unknown): void {
  const deltaMs = typeof payload === 'number' ? payload : 0
  if (deltaMs <= 0) return
  const dt = deltaMs / 1000
  syncCoins(dt)
  spawnHelpers(dt)
  emitSpawnProgress()
}

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now

  tickProduction(dt)
  tickHelpersVisual(dt)
  tickFlying(dt)
  tickDisplay(dt)

  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  // 不在此时生成精灵：父组件 onMounted 尚未执行，props.viewW/viewH 仍为 0，
  // 会导致所有精灵堆叠在左上角死角。首帧铺满由 syncCoins/spawnHelpers 在
  // 视口就绪后的首个主循环 tick 完成（coinsReady/helpersReady 标志）。
  store.setVisualAuto(true)
  last = performance.now()
  raf = requestAnimationFrame(frame)
  offGameTick = EventHub.logic.on(GAME_EVENT.GAME_TICK_AFTER, onGameTick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  offGameTick?.()
  offGameTick = null
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
      :class="['cs-coin cs-coin--idle pixel-number', `cs-coin--${coinIcon(c.tier)}`]"
      :style="{ left: `${c.dx}px`, top: `${c.dy}px` }"
      type="button"
      :aria-label="'翻转硬币'"
      @click="onCoinClick(c)"
      @mouseenter="onCoinHover(c)"
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
      :class="[
        `cs-coin--${coinIcon(fc.tier)}`,
        { 'cs-flying--settled': fc.settled, 'cs-flying--skull': fc.skull, 'cs-flying--quick': hasQuickFlip },
      ]"
      :style="{ left: `${fc.x}px`, top: `${fc.y}px` }"
    >
      <span class="cs-flying__front">
        <span class="cs-coin__glare" />
        <span class="cs-coin__face">$</span>
      </span>
      <span class="cs-flying__back">☠</span>
    </div>

    <!-- 助手群 -->
    <div
      v-for="h in helpers"
      :key="h.id"
      class="cs-helper"
      :class="{ 'cs-helper--seek': h.state === 'seek', 'cs-helper--throw': h.state === 'throw' }"
      :style="{
        left: `${h.dx}px`,
        top: `${h.dy}px`,
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
      <template v-if="p.skull">{{ p.text }} <span class="cs-popup__skull-icon">☠</span></template>
      <template v-else>{{ p.text }}</template>
    </div>
  </div>
</template>

<style scoped>
.coin-scene {
  position: absolute;
  left: 0;
  top: 0;
}

/* ── 可点击硬币（圆形金币） ── */
.cs-coin {
  position: absolute;
  width: 18px;
  height: 18px;
  /* 颜色变量：由各硬币类型 modifier 覆盖 */
  --coin-face: #b8912b;
  --coin-edge: #7a5c00;
  --coin-dark: #8a6000;
  --coin-light: #f0c840;
  /* 方形像素币：金属渐变面 + 深色外缘 + 亮色内圈刻线 */
  background:
    linear-gradient(135deg, var(--coin-light) 0%, var(--coin-face) 55%, var(--coin-dark) 100%);
  border: 2px solid var(--coin-edge);
  box-shadow:
    inset 0 0 0 2px var(--coin-light),
    inset -4px -4px 0 var(--coin-dark),
    2px 3px 0 rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  image-rendering: pixelated;
  z-index: 5;
  padding: 0;
  animation: cs-pop 0.18s ease-out both;
}

.cs-coin--idle:hover {
  box-shadow:
    inset 0 0 0 2px var(--coin-light),
    inset -4px -4px 0 var(--coin-dark),
    2px 3px 0 rgba(0, 0, 0, 0.9),
    0 0 0 2px #fff;
}

/* 各硬币类型配色（copper/silver/gold/platinum/diamond/ruby/emerald/obsidian） */
.cs-coin--copper { --coin-face: #c8742b; --coin-edge: #7a3c00; --coin-dark: #8a5210; --coin-light: #f0b65a; }
.cs-coin--silver { --coin-face: #c8ccd4; --coin-edge: #6b7280; --coin-dark: #8b93a0; --coin-light: #f4f7fb; }
.cs-coin--gold { --coin-face: #ffd700; --coin-edge: #8a6d00; --coin-dark: #c09c0a; --coin-light: #fff3a0; }
.cs-coin--platinum { --coin-face: #e6e8eb; --coin-edge: #82828c; --coin-dark: #b6bac2; --coin-light: #ffffff; }
.cs-coin--diamond { --coin-face: #a9e6f5; --coin-edge: #2e7d99; --coin-dark: #6fc0dd; --coin-light: #e6fbff; }
.cs-coin--ruby { --coin-face: #e0436f; --coin-edge: #7a1030; --coin-dark: #a0173f; --coin-light: #ff9cb8; }
.cs-coin--emerald { --coin-face: #4cc38a; --coin-edge: #0e5c3a; --coin-dark: #1f7a4f; --coin-light: #a0f0c8; }
.cs-coin--obsidian { --coin-face: #6b6b85; --coin-edge: #1c1c2e; --coin-dark: #33334a; --coin-light: #b6b6d0; }

.cs-coin__glare {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 5px;
  height: 4px;
  background: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}

.cs-coin__face {
  font-size: 11px;
  font-weight: 900;
  color: #3d2800;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.4);
  line-height: 1;
  pointer-events: none;
  position: relative;
  z-index: 2;
}

.cs-coin__shadow {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 5px;
  height: 4px;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

/* ── 飞行中的硬币（圆形金币，正反面翻转） ── */
.cs-flying {
  position: absolute;
  width: 16px;
  height: 16px;
  /* 复用硬币的颜色变量（由 cs-coin--* 类型 modifier 覆盖） */
  --coin-face: #b8912b;
  --coin-edge: #7a5c00;
  --coin-dark: #8a6000;
  --coin-light: #f0c840;
  background:
    linear-gradient(135deg, var(--coin-light) 0%, var(--coin-face) 55%, var(--coin-dark) 100%);
  border: 2px solid var(--coin-edge);
  box-shadow:
    inset 0 0 0 1px var(--coin-light),
    inset -3px -3px 0 var(--coin-dark),
    2px 2px 0 rgba(0, 0, 0, 0.8);
  image-rendering: pixelated;
  z-index: 20;
  transform-style: preserve-3d;
}

/* 飞行中持续翻转，露出正反两面 */
.cs-flying:not(.cs-flying--settled) {
  animation: cs-flip 0.6s linear infinite;
}

/* 快速翻转：硬币翻转动画更快 */
.cs-flying--quick:not(.cs-flying--settled) {
  animation-duration: 0.28s;
}

/* 落地后静止，停在结果对应的一面 */
.cs-flying--settled {
  animation: none;
  transform: perspective(48px) rotateY(0deg);
}
.cs-flying--settled.cs-flying--skull {
  transform: perspective(48px) rotateY(180deg);
}

/* 正面（$）与反面（骷髅 ☠）两个面，背对背 */
.cs-flying__front,
.cs-flying__back {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.cs-flying__front {
  transform: translateZ(0.5px);
}
.cs-flying__back {
  transform: rotateY(180deg) translateZ(0.5px);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #c4b5fd;
}

@keyframes cs-flip {
  from { transform: perspective(48px) rotateY(0deg); }
  to { transform: perspective(48px) rotateY(360deg); }
}

/* 精灵上桌弹出：配合渐进生成，逐枚出现时轻微缩放 + 淡入。
   使用独立的 scale 属性，避免与助手 facing 的 scaleX transform 冲突。 */
@keyframes cs-pop {
  from { opacity: 0; scale: 0.5; }
  to { opacity: 1; scale: 1; }
}

/* ── 助手 ── */
.cs-helper {
  position: absolute;
  width: 20px;
  height: 20px;
  z-index: 8;
  pointer-events: none;
  animation: cs-pop 0.18s ease-out both;
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
  background: #b8912b;
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

/* 骷髅币飘字里的小骷髅图标（避免过大遮挡硬币） */
.cs-popup__skull-icon {
  font-size: 10px;
  vertical-align: -1px;
}

@keyframes cs-float {
  0% { transform: translateY(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}
</style>
