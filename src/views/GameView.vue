<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { PxButton, PxCard, PxProgress } from '@mmt817/pixel-ui'
import { HELPER_TYPES, totalFlipsPerSec } from '../core'
import { formatCash } from '../core/format'
import { PRESTIGE_TIERS } from '../core/data/prestigeTiers'
import CoinScene from '../components/coins/CoinScene.vue'
import CoinsTab from './tabs/CoinsTab.vue'
import HelpersView from './HelpersView.vue'
import AscensionView from './AscensionView.vue'
import ChallengesView from './ChallengesView.vue'
import { useGameStore } from '../stores/gameStore'

type BottomTab = 'tips' | 'coins' | 'helpers' | 'upgrades' | 'casino'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const activeTab = ref<BottomTab>('helpers')

// ── 桌布：可拖动平移的大世界 ──
const feltRef = ref<HTMLElement | null>(null)
const feltW = ref(500)
const feltH = ref(300)
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!feltRef.value) return
  feltW.value = feltRef.value.clientWidth
  feltH.value = feltRef.value.clientHeight
  // 初始把世界居中，让四周都可拖（之前固定在左上角，向左上拖被 clamp，误以为"拖不动"）
  panX.value = Math.max(0, (worldW.value - feltW.value) / 2)
  panY.value = Math.max(0, (worldH.value - feltH.value) / 2)
  ro = new ResizeObserver(([e]) => {
    feltW.value = e!.contentRect.width
    feltH.value = e!.contentRect.height
  })
  ro.observe(feltRef.value)
})
onBeforeUnmount(() => ro?.disconnect())

/** 世界比视口略大，拖动时能平移出"更多空间"，营造热闹的群像。 */
const worldW = computed(() => Math.max(feltW.value * 1.7, 760))
const worldH = computed(() => Math.max(feltH.value * 1.7, 560))

const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const dragState = { active: false, sx: 0, sy: 0, px: 0, py: 0, moved: 0 }

/** 平移量 clamp 到 [0, world-view]，避免把视口拖出世界边界。 */
const clampedPanX = computed(() =>
  Math.min(Math.max(0, worldW.value - feltW.value), Math.max(0, panX.value)),
)
const clampedPanY = computed(() =>
  Math.min(Math.max(0, worldH.value - feltH.value), Math.max(0, panY.value)),
)

const worldStyle = computed(() => ({
  width: `${worldW.value}px`,
  height: `${worldH.value}px`,
  transform: `translate(${-clampedPanX.value}px, ${-clampedPanY.value}px)`,
}))

function onPointerDown(e: PointerEvent): void {
  // 点击硬币时不启动桌布平移（由 CoinScene 的 click 单独处理翻转）
  if ((e.target as HTMLElement).closest('.cs-coin')) return
  dragState.active = true
  dragState.sx = e.clientX
  dragState.sy = e.clientY
  dragState.px = panX.value
  dragState.py = panY.value
  dragState.moved = 0
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragState.active) return
  const dx = e.clientX - dragState.sx
  const dy = e.clientY - dragState.sy
  dragState.moved += Math.abs(dx) + Math.abs(dy)
  // 反向：向右拖 → 世界向右移动（看到更多左侧），符合视口滚动直觉
  panX.value = dragState.px - dx
  panY.value = dragState.py - dy
}

function onPointerUp(e: PointerEvent): void {
  const wasTap = dragState.active && dragState.moved < 8
  dragState.active = false
  dragging.value = false
  if (wasTap) {
    // 未拖动 → 视为点击翻转一枚硬币
    store.doFlip()
    spawnTapCoin(e)
  }
}

/** 点击处 +$ 反馈。 */
const tapCoins = ref<Array<{ id: number; x: number; y: number }>>([])
let tapId = 0
function spawnTapCoin(e: PointerEvent): void {
  const rect = feltRef.value?.getBoundingClientRect()
  if (!rect) return
  const id = tapId++
  tapCoins.value.push({ id, x: e.clientX - rect.left, y: e.clientY - rect.top })
  setTimeout(() => {
    tapCoins.value = tapCoins.value.filter((c) => c.id !== id)
  }, 700)
}

// ── 台面读数 ──

/** 助手总数。 */
const helpersTotal = computed(() => {
  void uiVersion.value
  return HELPER_TYPES.reduce((sum, h) => sum + (state.value.helpers[h.id]?.count ?? 0), 0)
})

/** 硬币总数（所有维度已购买数量之和）。 */
const coinsTotal = computed(() => {
  void uiVersion.value
  return state.value.dimensions.reduce((sum, d) => sum + d.bought, 0)
})

/** 每秒抛硬币总量。 */
const totalFlips = computed(() => {
  void uiVersion.value
  return totalFlipsPerSec(state.value)
})

// ── 草地参照物（野草 / 小花 / 石头）：固定在世界坐标，随 world 平移，
//    让拖动时有明显参照感，用户能感知自己在拖动草地。 ──
interface Decor {
  id: number
  kind: 'grass' | 'flower' | 'rock'
  x: number
  y: number
  flip: 1 | -1
  scale: number
  /** 小花颜色（草/石为空）。 */
  hue: string
}
const decor = ref<Decor[]>([])
const FLOWER_HUES = ['#ffd700', '#ff6b6b', '#ffffff', '#ff9f43']
const rnd = (a: number, b: number): number => a + Math.random() * (b - a)

function makeDecor(): void {
  // 覆盖世界常用范围（含大屏放大后的世界），不足处由 felt-world 草地纹理补足
  const W = 2000
  const H = 1200
  const list: Decor[] = []
  for (let i = 0; i < 140; i += 1) {
    list.push({
      id: i,
      kind: 'grass',
      x: rnd(16, W - 16),
      y: rnd(16, H - 16),
      flip: Math.random() > 0.5 ? 1 : -1,
      scale: rnd(0.8, 1.35),
      hue: '',
    })
  }
  for (let i = 0; i < 18; i += 1) {
    list.push({
      id: 1000 + i,
      kind: 'flower',
      x: rnd(22, W - 22),
      y: rnd(22, H - 22),
      flip: Math.random() > 0.5 ? 1 : -1,
      scale: rnd(0.85, 1.2),
      hue: FLOWER_HUES[i % FLOWER_HUES.length]!,
    })
  }
  for (let i = 0; i < 9; i += 1) {
    list.push({
      id: 2000 + i,
      kind: 'rock',
      x: rnd(26, W - 26),
      y: rnd(26, H - 26),
      flip: 1,
      scale: rnd(0.9, 1.3),
      hue: '',
    })
  }
  decor.value = list
}
makeDecor()

const tier1 = PRESTIGE_TIERS[0]!
const round = computed(() => state.value.prestige.tier)
const cashText = computed(() => {
  void uiVersion.value
  return formatCash(state.value.cash)
})
const thresholdText = computed(() => formatCash(tier1.threshold))
const progressPct = computed(() => {
  void uiVersion.value
  return Math.min(100, state.value.cash.div(tier1.threshold).mul(100).toNumber())
})

const tabs: Array<{ id: BottomTab; label: string }> = [
  { id: 'tips',     label: '核心玩法' },
  { id: 'coins',    label: '硬币'     },
  { id: 'helpers',  label: '助手'     },
  { id: 'upgrades', label: '升级'     },
  { id: 'casino',   label: '赌场'     },
]
</script>

<template>
  <div class="game-view">
    <!-- ── 绿色赌台（PxCard 外框） ── -->
    <div class="table-wrap">
      <PxCard round class="table-outer px-card--dark">
        <template #header><p class="title table-title">♠ 赌桌</p></template>
        <div
          ref="feltRef"
          class="felt-table"
          :class="{ 'is-dragging': dragging }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <!-- 自然草地氛围：暗角 + 内框（叠在草地世界之上） -->
          <div class="felt-vignette" />
          <div class="felt-rail" />

          <div class="felt-hint pixel-number">
            拖动草地平移 · 点击硬币抛掷 · $ 得钱 · ☠ 得骷髅币
          </div>

          <!-- 可平移的草地世界：参照物 + 硬币 + 助手 -->
          <div class="felt-world" :style="worldStyle">
            <!-- 草地参照物层：野草 / 小花 / 石头 -->
            <div class="scene-decor">
              <div
                v-for="d in decor"
                :key="d.id"
                class="decor"
                :class="`decor--${d.kind}`"
                :style="{
                  left: `${d.x}px`,
                  top: `${d.y}px`,
                  transform: `scale(${d.scale}) scaleX(${d.flip})`,
                  '--fhue': d.hue,
                }"
              >
                <template v-if="d.kind === 'grass'">
                  <i class="g1"></i><i class="g2"></i><i class="g3"></i>
                </template>
                <template v-else-if="d.kind === 'flower'">
                  <i class="fp"></i><i class="fc"></i>
                </template>
              </div>
            </div>
            <CoinScene
              :world-w="worldW"
              :world-h="worldH"
              :view-x="clampedPanX"
              :view-y="clampedPanY"
              :view-w="feltW"
              :view-h="feltH"
            />
          </div>

          <!-- 点击空白处 +$ 反馈 -->
          <div
            v-for="c in tapCoins"
            :key="c.id"
            class="tap-coin pixel-number"
            :style="{ left: `${c.x}px`, top: `${c.y}px` }"
          >
            +$
          </div>
        </div>

        <!-- 台面状态行 -->
        <div class="table-statusbar pixel-number">
          <div class="tsb-left">
            <span>第 {{ round }} 关 · {{ cashText }} / {{ thresholdText }} ({{ progressPct.toFixed(0) }}%)</span>
            <PxProgress
              class="tsb-progress"
              :percentage="progressPct"
              status="warning"
              :show-text="false"
            />
          </div>
          <div class="tsb-right">
            <span>硬币 {{ coinsTotal }}</span>
            <span>助手 {{ helpersTotal }}</span>
            <span>{{ totalFlips.toFixed(1) }} flips/s</span>
          </div>
        </div>
      </PxCard>
    </div>

    <!-- ── Tab 导航（PxButton） ── -->
    <div class="bottom-tabs">
      <PxButton
        v-for="tab in tabs"
        :key="tab.id"
        class="btab"
        :type="activeTab === tab.id ? 'warning' : 'base'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </PxButton>
    </div>

    <!-- ── Tab 内容 ── -->
    <div class="tab-body">
      <PxCard v-if="activeTab === 'tips'" class="tab-tips px-card--dark pixel-number">
        <p class="tab-tips__title text-gold">[ 核心玩法 ]</p>
        <p>· 拖动桌面查看更多助手，点击桌面翻转硬币</p>
        <p>· $ 面 → 赢得现金 · ☠ 面 → 获得骷髅代币</p>
        <p>· 购买更多硬币与助手提升每秒翻转量</p>
        <p>· 积攒现金后可「重生」获得永久增益</p>
      </PxCard>
      <CoinsTab v-else-if="activeTab === 'coins'" />
      <HelpersView v-else-if="activeTab === 'helpers'" />
      <AscensionView v-else-if="activeTab === 'upgrades'" />
      <ChallengesView v-else />
    </div>
  </div>
</template>

<style scoped>
.game-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-bg);
}

/* ── 台面外层 ── */
.table-wrap {
  flex-shrink: 0;
  padding: 8px 8px 0;
}

.table-outer {
  /* PxCard 默认 flex 行布局，这里改回块级，容纳赌台 */
  display: block;
  padding: 8px !important;
}

.table-title {
  color: #c03000 !important;
  font-size: 16px;
  font-weight: 700;
}

/* ── 自然草地台面（土地/围栏外框 + 草地背景） ── */
.felt-table {
  width: 100%;
  height: 36vh;
  min-height: 200px;
  max-height: 400px;
  position: relative;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
  image-rendering: pixelated;
  /* 视口底色：草绿（世界边缘露出的兜底色） */
  background-color: #4a8a35;
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.06)),
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.03) 1px, transparent 1.4px);
  background-size: 100% 100%, 22px 22px;
  /* 土地/原木围栏边框 */
  border: 12px solid #3a2008;
  border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%233a2008'/%3E%3Crect x='0' y='0' width='24' height='24' fill='none' stroke='%235c3613' stroke-width='4'/%3E%3C/svg%3E") 12;
  box-shadow:
    inset 0 0 0 4px #2a1804,
    inset 0 0 0 6px #5a3a14,
    inset 0 0 0 8px #2a1804,
    6px 6px 0 #161616;
}

/* 暗角：四周压暗，聚焦草地中央 */
.felt-vignette {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.4),
    inset 0 0 140px rgba(0, 0, 0, 0.22);
}

/* 内框：自然的深色描边 */
.felt-rail {
  position: absolute;
  inset: 10px;
  z-index: 11;
  pointer-events: none;
  border: 2px solid rgba(20, 50, 15, 0.5);
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.35);
}

.felt-table.is-dragging {
  cursor: grabbing;
}

/* 可平移的草地世界层（参照物与硬币都随 transform 一起移动） */
.felt-world {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 10;
  will-change: transform;
  /* 多层草地：纵向色温渐变 + 阳光斑 + 远景压暗 + 多尺度草叶点阵 + 小土丘 */
  background-color: #4d9a37;
  background-image:
    /* 1. 阳光斑（左上暖光） */
    radial-gradient(ellipse 60% 45% at 25% 18%, rgba(255, 245, 170, 0.22), rgba(255, 245, 170, 0) 70%),
    /* 2. 副光斑（右下偏暖） */
    radial-gradient(ellipse 50% 40% at 78% 78%, rgba(255, 220, 120, 0.12), rgba(255, 220, 120, 0) 70%),
    /* 3. 远景底部压暗 */
    radial-gradient(ellipse 120% 40% at 50% 105%, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0) 60%),
    /* 4. 小土丘（几处深色椭圆） */
    radial-gradient(ellipse 180px 60px at 22% 38%, rgba(20, 60, 20, 0.18), transparent 70%),
    radial-gradient(ellipse 220px 70px at 72% 62%, rgba(20, 60, 20, 0.16), transparent 70%),
    radial-gradient(ellipse 160px 50px at 48% 85%, rgba(20, 60, 20, 0.14), transparent 70%),
    /* 5. 浅色草尖（密） */
    radial-gradient(circle at 12% 22%, #6cc04a 1.2px, transparent 1.8px),
    radial-gradient(circle at 64% 70%, #6cc04a 1px, transparent 1.5px),
    /* 6. 深色草根 */
    radial-gradient(circle at 86% 18%, rgba(20, 50, 15, 0.18) 1px, transparent 1.6px),
    radial-gradient(circle at 38% 88%, rgba(20, 50, 15, 0.16) 1px, transparent 1.6px),
    /* 7. 中等明暗颗粒 */
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 1px, transparent 1.6px);
  background-size:
    100% 100%,
    100% 100%,
    100% 100%,
    100% 100%,
    100% 100%,
    100% 100%,
    20px 20px,
    24px 24px,
    28px 28px,
    32px 32px,
    36px 36px;
}

/* ── 草地参照物层 ── */
.scene-decor {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.decor {
  position: absolute;
  image-rendering: pixelated;
}

/* 野草簇：4 根高低错落的草叶，多色 + 弯曲 */
.decor--grass {
  width: 14px;
  height: 18px;
}
.decor--grass i {
  position: absolute;
  bottom: 0;
  width: 3px;
  border-radius: 1px 1px 0 0;
}
.decor--grass .g1 {
  left: 0;
  height: 13px;
  background: linear-gradient(180deg, #7ed15a 0 4px, #3f8a35 4px);
  transform: skewX(-12deg);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.18);
}
.decor--grass .g2 {
  left: 5px;
  height: 18px;
  background: linear-gradient(180deg, #8fdc66 0 5px, #2f6d2a 5px);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.2),
    inset -1px 0 0 rgba(0, 0, 0, 0.18);
}
.decor--grass .g3 {
  left: 10px;
  height: 11px;
  background: linear-gradient(180deg, #6cc04a 0 3px, #356f25 3px);
  transform: skewX(10deg);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.16);
}
.decor--grass .g4 {
  left: 3px;
  bottom: 0;
  height: 8px;
  width: 2px;
  background: #4a9437;
  transform: skewX(-6deg);
}

/* 小花：4 瓣像素花 + 中心 */
.decor--flower {
  width: 14px;
  height: 14px;
}
.decor--flower .fp {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, var(--fhue, #ffd700) 0 2.5px, transparent 3px),
    radial-gradient(circle at 100% 50%, var(--fhue, #ffd700) 0 2.5px, transparent 3px),
    radial-gradient(circle at 50% 100%, var(--fhue, #ffd700) 0 2.5px, transparent 3px),
    radial-gradient(circle at 0% 50%, var(--fhue, #ffd700) 0 2.5px, transparent 3px);
  filter: drop-shadow(1px 2px 0 rgba(0, 0, 0, 0.3));
}
.decor--flower .fc {
  position: absolute;
  left: 5px;
  top: 5px;
  width: 4px;
  height: 4px;
  background: #fff5b8;
  border: 1px solid #8a4a12;
  box-shadow: inset 1px 1px 0 #ffe680;
}
/* 花茎 */
.decor--flower::after {
  content: '';
  position: absolute;
  left: 6px;
  bottom: -6px;
  width: 2px;
  height: 7px;
  background: #2f6d2a;
}

/* 石头：像素石块（无圆角、纯色块 + 硬边阶梯阴影） */
.decor--rock {
  width: 14px;
  height: 11px;
  background: #8a8f96;
  border: 2px solid #4c5158;
  box-shadow:
    inset -2px -2px 0 #676c73,
    inset  2px  2px 0 #aab0b6,
    2px 3px 0 rgba(0, 0, 0, 0.45);
}
/* 像素裂纹（带折角） */
.decor--rock::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 6px;
  width: 8px;
  height: 1px;
  background: #4c5158;
  box-shadow: 2px 1px 0 #4c5158;
}
/* 左上角像素高光 */
.decor--rock::after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 4px;
  height: 2px;
  background: rgba(255, 255, 255, 0.5);
}

.felt-hint {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  padding: 2px 10px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 15;
  pointer-events: none;
  letter-spacing: 1px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6), 0 0 4px rgba(0, 0, 0, 0.4);
}

/* 点击处 +$ 反馈 */
.tap-coin {
  position: absolute;
  color: #ffe066;
  font-size: 16px;
  font-weight: 700;
  text-shadow: 2px 2px 0 #000;
  pointer-events: none;
  z-index: 20;
  animation: tap-coin-up 0.7s steps(6, end) forwards;
}

@keyframes tap-coin-up {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-26px) scale(1.2); opacity: 0; }
}

/* 台面状态行 */
.table-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 4px 4px;
  font-size: 16px;
  color: var(--text-secondary);
}

.tsb-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tsb-progress { width: 100%; height: 16px !important; }
.tsb-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* ── Tab 导航（亮色） ── */
.bottom-tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: var(--app-bg);
  border-bottom: 4px solid #212121;
  flex-shrink: 0;
}

.btab {
  flex: 1;
  font-size: 16px !important;
  padding: 9px 4px !important;
  text-align: center !important;
}

/* ── Tab 内容（亮色） ── */
.tab-body {
  flex: 1;
  overflow-y: auto;
  background: var(--app-bg);
}

.tab-tips {
  display: block;
  margin: 8px !important;
  padding: 16px 18px !important;
  font-size: 16px;
  line-height: 2;
  color: #6b7a99;
}

.tab-tips__title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.tab-tips p {
  margin: 0 0 4px;
}
</style>
