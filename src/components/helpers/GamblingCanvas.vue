<script setup lang="ts">
/**
 * 8-bit 赌桌动态画布：
 * - 在桌面 canvas 上渲染多个"小助手"（像素小黄鸭等）
 * - 每个助手按各自频率做轻微起跳/举手并向上抛出像素硬币
 * - 硬币沿抛物线飞行 + 旋转 + scale，落地后显示正面($)/反面(☠)
 *   并触发像素波纹/光效 + 飘字
 * - 仅做视觉呈现，实际产出由 core 的 tickHelpers 驱动（不重复计入）
 */

import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface HelperVisual {
  key: string
  helperId: string
  rarity: string
  index: number
}

const props = defineProps<{
  helpers: HelperVisual[]
  areaWidth: number
  areaHeight: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 助手的像素配色（头 / 身）。 */
const BODY_COLORS: Record<string, { head: string; body: string; beak: string; foot: string }> = {
  novice:      { head: '#f5c518', body: '#e8a800', beak: '#e07000', foot: '#e07000' }, // 小黄鸭
  apprentice:  { head: '#f87171', body: '#ef4444', beak: '#a01212', foot: '#7f1d1d' }, // 红狐狸
  journeyman:  { head: '#d97706', body: '#92400e', beak: '#57250a', foot: '#3d1a06' }, // 棕熊
  expert:      { head: '#a78bfa', body: '#7c3aed', beak: '#3b0f87', foot: '#2c0b66' }, // 紫魔法师
  master:      { head: '#7dd3fc', body: '#0ea5e9', beak: '#075985', foot: '#0c4a6e' }, // 冰蓝大师
  grandmaster: { head: '#fca5a5', body: '#dc2626', beak: '#7f1d1d', foot: '#450a0a' }, // 红炎宗师
  legend:      { head: '#fef08a', body: '#ffd700', beak: '#b8860b', foot: '#92610a' }, // 金色英雄
  mythic:      { head: '#f9a8d4', body: '#ec4899', beak: '#9d174d', foot: '#831843' }, // 粉神话
}

const HAT_COLORS: Record<string, string> = {
  common: '#cc2020',
  rare: '#3ddc84',
  epic: '#b06cff',
  legendary: '#ffd700',
}

const PX = 2 // 每像素单位 = 2 CSS px

interface Assistant {
  id: string
  helperId: string
  hatColor: string
  palette: { head: string; body: string; beak: string; foot: string }
  faceRight: boolean
  x: number
  y: number
  drift: number
  lastToss: number
  interval: number
}

interface Coin {
  owner: number
  x0: number
  y0: number
  tx: number
  ty: number
  start: number
  dur: number
  result: 'coin' | 'skull'
  spin: number
  landed: boolean
  landStart: number
  done: boolean
}

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let last = 0
let nowMs = 0
let assistants: Assistant[] = []
let coins: Coin[] = []
let nextId = 0

function paletteOf(helperId: string): Assistant['palette'] {
  return BODY_COLORS[helperId] ?? BODY_COLORS.novice!
}

function buildAssistants(): void {
  assistants = props.helpers.map((h, i) => {
    const W = Math.max(props.areaWidth - 60, 60)
    const H = Math.max(props.areaHeight - 50, 50)
    const col = i % 5
    const row = Math.floor(i / 5)
    return {
      id: h.key,
      helperId: h.helperId,
      hatColor: HAT_COLORS[h.rarity] ?? HAT_COLORS.common!,
      palette: paletteOf(h.helperId),
      faceRight: i % 2 === 0,
      x: 30 + col * (W / 4.6) + (Math.random() - 0.5) * 24,
      y: 40 + row * 46 + (Math.random() - 0.5) * 14,
      drift: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 18),
      lastToss: 0,
      interval: 0.45 + Math.random() * 0.55,
    }
  })
  coins = []
}

/** 某助手当前是否正在抛硬币（用于起跳）。 */
function activeCoinOf(a: Assistant): Coin | null {
  return coins.find((c) => c.owner === assistants.indexOf(a)) ?? null
}

function spawnCoin(a: Assistant): void {
  const startX = a.x
  const startY = a.y - 30
  const dist = (20 + Math.random() * 46) * (a.faceRight ? 1 : -1)
  const tx = Math.min(Math.max(startX + dist, 26), props.areaWidth - 26)
  const owner = assistants.indexOf(a)
  coins.push({
    owner,
    x0: startX,
    y0: startY,
    tx,
    ty: a.y - 6,
    start: nowMs,
    dur: 0.55 + Math.random() * 0.25,
    result: Math.random() < 0.5 ? 'coin' : 'skull',
    spin: Math.random() * Math.PI * 2,
    landed: false,
    landStart: 0,
    done: false,
  })
}

function px(x: number, y: number, w: number, h: number, color: string): void {
  if (!ctx) return
  ctx.fillStyle = color
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX)
}

/** 绘制像素小助手（头部/躯体/帽/眼/喙/脚）。y 为脚底地面。 */
function drawAssistant(a: Assistant, hop: number): void {
  if (!ctx) return
  const c = ctx
  const { head, body, beak, foot } = a.palette
  const gy = a.y - hop
  c.save()
  c.translate(a.x, gy)
  if (!a.faceRight) c.scale(-1, 1)

  // 底部影子
  px(-5, -1, 10, 1, 'rgba(0,0,0,0.25)')

  // 脚（两个小方块）
  px(-4, -2, 3, 2, foot)
  px(1, -2, 3, 2, foot)

  // 躯体
  px(-5, -8, 10, 6, body)
  px(-5, -8, 10, 1, 'rgba(0,0,0,0.45)') // 躯体上沿描边
  px(-4, -7, 3, 3, 'rgba(255,255,255,0.22)') // 腹部高光

  // 头部
  px(-4, -13, 8, 6, head)
  px(-4, -13, 8, 1, 'rgba(0,0,0,0.45)')
  // 眼
  px(-3, -11, 1, 2, '#1a1a1a')
  px(1, -11, 1, 2, '#1a1a1a')
  // 喙
  px(2, -11, 2, 1, beak)

  // 帽子（颜色随稀有度）
  px(-5, -15, 10, 2, a.hatColor)
  px(-4, -14, 8, 1, 'rgba(0,0,0,0.4)')
  px(-5, -15, 10, 1, 'rgba(255,255,255,0.25)') // 帽子高光

  c.restore()
}

/** 绘制像素硬币（沿旋转 spin 做 scaleX 翻转）。 */
function drawCoin(x: number, y: number, spin: number, result: 'coin' | 'skull', scale = 1): void {
  if (!ctx) return
  const c = ctx
  const sx = Math.max(Math.abs(Math.cos(spin)), 0.08) // 翻转宽度
  const s = 7 * PX * scale
  const w = Math.max(s * sx, 2)
  const h = s
  c.save()
  c.translate(x, y)
  // 落地影
  c.fillStyle = 'rgba(0,0,0,0.35)'
  c.fillRect(-s / 2, h * 0.15, s, 2)
  // 币身
  c.fillStyle = result === 'coin' ? '#ffd700' : '#7c3aed'
  c.fillRect(-w / 2, -h / 2, w, h)
  // 像素高光/阴影
  c.fillStyle = result === 'coin' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'
  c.fillRect(-w / 2, -h / 2, w, 2)
  c.fillStyle = 'rgba(0,0,0,0.3)'
  c.fillRect(-w / 2, h / 2 - 2, w, 2)
  // 图案
  c.fillStyle = result === 'coin' ? '#7a4a00' : '#e9d5ff'
  c.font = `${h * 0.55}px "Press Start 2P", monospace`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(result === 'coin' ? '$' : '☠', 0, 0)
  c.restore()
}

/** 落地波纹（扩张的像素方框 + 光效）。 */
function drawRipple(x: number, y: number, t: number): void {
  if (!ctx) return
  const c = ctx
  const r = 3 + t * 22
  c.save()
  c.globalAlpha = Math.max(0, 1 - t)
  c.strokeStyle = 'rgba(255,255,220,0.9)'
  c.lineWidth = 2
  c.strokeRect(x - r, y - r * 0.4, r * 2, r * 0.8)
  c.fillStyle = 'rgba(255,255,180,0.5)'
  c.fillRect(x - r * 0.4, y - 2, r * 0.8, 2)
  c.restore()
}

function update(dt: number): void {
  for (const a of assistants) {
    // 轻微游走
    a.x += a.drift * dt
    if (a.x < 30) {
      a.x = 30
      a.drift = Math.abs(a.drift)
      a.faceRight = true
    } else if (a.x > props.areaWidth - 30) {
      a.x = props.areaWidth - 30
      a.drift = -Math.abs(a.drift)
      a.faceRight = false
    }
    // 抛硬币调度
    if ((nowMs - a.lastToss) / 1000 >= a.interval) {
      a.lastToss = nowMs
      a.interval = 0.45 + Math.random() * 0.6
      spawnCoin(a)
    }
  }

  for (const coin of coins) {
    const t = (nowMs - coin.start) / 1000 / coin.dur
    if (!coin.landed) {
      if (t >= 1) {
        coin.landed = true
        coin.landStart = nowMs
      }
    } else if (nowMs - coin.landStart > 450) {
      coin.done = true
    }
  }
  coins = coins.filter((c) => !c.done)
}

function render(): void {
  if (!ctx) return
  ctx.clearRect(0, 0, props.areaWidth, props.areaHeight)

  // 助手
  for (const a of assistants) {
    const coin = activeCoinOf(a)
    let hop = 0
    if (coin && !coin.landed) {
      const t = (nowMs - coin.start) / 1000 / coin.dur
      hop = Math.sin(t * Math.PI) * 9
    }
    hop += Math.abs(Math.sin(nowMs / 480 + a.x)) * 1.2 // 呼吸/待机起伏
    drawAssistant(a, hop)
  }

  // 硬币（先飞行的后落地，保持 z 序在助手前）
  for (const coin of coins) {
    const t = (nowMs - coin.start) / 1000 / coin.dur
    if (!coin.landed) {
      const tt = Math.min(t, 1)
      const x = coin.x0 + (coin.tx - coin.x0) * tt
      const apex = 54
      const y = coin.y0 - Math.sin(tt * Math.PI) * apex
      const spin = coin.spin + t * Math.PI * 5
      const scale = 1 + Math.sin(tt * Math.PI) * 0.45
      drawCoin(x, y, spin, coin.result, scale)
    } else {
      // 落地：先画币，再画波纹
      const landT = (nowMs - coin.landStart) / 450
      drawRipple(coin.tx, coin.ty, Math.min(landT, 1))
      drawCoin(coin.tx, coin.ty, 0, coin.result)
      // 飘字
      const ft = Math.min(landT, 1)
      if (ctx && ft < 1) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - ft)
        ctx.fillStyle = coin.result === 'coin' ? '#ffd700' : '#c4b5fd'
        ctx.font = '10px "Press Start 2P", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(coin.result === 'coin' ? '+$' : '☠', coin.tx, coin.ty - 22 - ft * 16)
        ctx.restore()
      }
    }
  }
}

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  nowMs = now
  update(dt)
  render()
  raf = requestAnimationFrame(frame)
}

function setupCanvas(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.floor(props.areaWidth * dpr))
  canvas.height = Math.max(1, Math.floor(props.areaHeight * dpr))
  canvas.style.width = `${props.areaWidth}px`
  canvas.style.height = `${props.areaHeight}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

onMounted(() => {
  setupCanvas()
  buildAssistants()
  last = performance.now()
  nowMs = last
  raf = requestAnimationFrame(frame)
})

watch(
  () => [props.helpers.length, props.areaWidth, props.areaHeight],
  () => {
    if (!canvasRef.value) return
    setupCanvas()
    buildAssistants()
  },
)

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas
    ref="canvasRef"
    class="gambling-canvas"
    aria-label="赌桌上小助手抛硬币动画"
  />
</template>

<style scoped>
.gambling-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  image-rendering: pixelated;
}
</style>
