<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxButton, PxCard, PxProgress } from '@mmt817/pixel-ui'
import {
  levelAt,
  type LevelGoal,
  type LevelReward,
} from '../core'
import { formatCash, formatNumber } from '../core/format'
import CoinScene from '../components/coins/CoinScene.vue'
import CoinsTab from './tabs/CoinsTab.vue'
import HelpersView from './HelpersView.vue'
import UpgradesView from './UpgradesView.vue'
import ChallengesView from './ChallengesView.vue'
import LevelsView from './LevelsView.vue'
import { useGameStore } from '../stores/gameStore'
import { useSound } from '../composables/useSound'

type BottomTab = 'tips' | 'coins' | 'helpers' | 'upgrades' | 'challenges' | 'levels'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const { t } = useI18n()
const { playClick } = useSound()
const activeTab = ref<BottomTab>('helpers')

// ── 过关确认弹窗（一局一关：达标后须玩家确认才进下一关） ──
const showLevelConfirm = computed(() => state.value.levels.pendingLevelId !== null)
/** 当前待确认的关卡（pendingLevelId 对应序号 = completed + 1）。 */
const pendingLevel = computed(() => {
  void uiVersion.value
  return levelAt(state.value.levels.completed + 1)
})

function pendingGoalText(goal: LevelGoal): string {
  const label = t(`levels.goals.${goal.type}`)
  const value = goal.type === 'cash' || goal.type === 'totalEarned'
    ? formatCash(goal.target)
    : formatNumber(goal.target)
  return `${label} ${value}`
}

function pendingRewardText(reward: LevelReward): string {
  if (reward.type === 'clickMult') return `${t('levels.rewards.clickMult')} ×${reward.value}`
  if (reward.type === 'incomeMult') return `${t('levels.rewards.incomeMult')} ×${reward.value}`
  return `${t('levels.rewards.flag')} ${t(`levels.flags.${reward.flag}`)}`
}

function onTab(id: BottomTab): void {
  playClick()
  activeTab.value = id
}

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
const dragState = { active: false, sx: 0, sy: 0, px: 0, py: 0 }

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
  // 点击硬币时不启动桌布平移（硬币由 CoinScene 单独处理翻转）
  if ((e.target as HTMLElement).closest('.cs-coin')) return
  dragState.active = true
  dragState.sx = e.clientX
  dragState.sy = e.clientY
  dragState.px = panX.value
  dragState.py = panY.value
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragState.active) return
  const dx = e.clientX - dragState.sx
  const dy = e.clientY - dragState.sy
  // 反向：向右拖 → 世界向右移动（看到更多左侧），符合视口滚动直觉
  panX.value = dragState.px - dx
  panY.value = dragState.py - dy
}

function onPointerUp(): void {
  dragState.active = false
  dragging.value = false
}

function onPointerCancel(): void {
  dragState.active = false
  dragging.value = false
}

// ── 翻转按钮：随机翻转桌面上的一枚硬币 ──
const coinSceneRef = ref<InstanceType<typeof CoinScene> | null>(null)

/** 点击"翻转硬币"按钮：随机翻转桌面上的一枚硬币（复用 CoinScene 的抛币结算）。 */
function flipRandomCoin(): void {
  coinSceneRef.value?.flipRandomCoin()
}

// ── 上桌进度：购买/雇佣后精灵逐枚上桌的倒计时进度条 ──
const spawnStatus = ref<{ busy: boolean; ratio: number; remaining: number }>({
  busy: false,
  ratio: 1,
  remaining: 0,
})

function onSpawnProgress(payload: { busy: boolean; ratio: number; remaining: number }): void {
  spawnStatus.value = payload
}

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
const FLOWER_HUES = ['#ffd700', '#e8c15a', '#ffffff', '#e0b84c']
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

const tabs: Array<{ id: BottomTab; label: string }> = [
  { id: 'tips',       label: '核心玩法' },
  { id: 'coins',      label: '硬币'     },
  { id: 'helpers',    label: '助手'     },
  { id: 'upgrades',   label: '当局升级' },
  { id: 'challenges', label: '挑战'     },
  { id: 'levels',     label: '任务关卡' },
]
</script>

<template>
  <div class="game-view">
    <!-- ── 绿色赌台（PxCard 外框） ── -->
    <div class="table-wrap">
      <PxCard round class="table-outer px-card--dark">
        <template #header>
          <p class="title table-title">♠ 赌桌</p>
          <PxButton
            :use-throttle="false"
            type="warning"
            class="flip-btn"
            aria-label="翻转硬币"
            @click="flipRandomCoin"
          >
            翻转硬币
          </PxButton>
        </template>
        <div
          ref="feltRef"
          class="felt-table"
          :class="{ 'is-dragging': dragging }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <!-- 自然草地氛围：暗角 + 内框（叠在草地世界之上） -->
          <div class="felt-vignette" />
          <div class="felt-rail" />

          <!-- 上桌进度条：购买/雇佣后精灵逐枚上桌的倒计时 -->
          <Transition name="spawn-fade">
            <div v-if="spawnStatus.busy" class="spawn-status pixel-number">
              <span class="spawn-status__label">上桌中 · 剩 {{ spawnStatus.remaining }}</span>
              <PxProgress
                class="spawn-status__bar"
                :percentage="spawnStatus.ratio * 100"
                status="success"
                :show-text="false"
              />
            </div>
          </Transition>

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
              ref="coinSceneRef"
              :world-w="worldW"
              :world-h="worldH"
              :view-x="clampedPanX"
              :view-y="clampedPanY"
              :view-w="feltW"
              :view-h="feltH"
              @spawn-progress="onSpawnProgress"
            />
          </div>
        </div>
      </PxCard>
    </div>

    <!-- ── Tab 导航（PxButton） ── -->
    <div class="bottom-tabs">
      <PxButton
        v-for="tab in tabs"
        :key="tab.id"
        :use-throttle="false"
        class="btab"
        :type="activeTab === tab.id ? 'warning' : 'base'"
        @click="onTab(tab.id)"
      >
        {{ tab.label }}
      </PxButton>
    </div>

    <!-- ── Tab 内容 ── -->
    <div class="tab-body">
      <PxCard v-if="activeTab === 'tips'" class="tab-tips px-card--dark pixel-number">
        <p class="tab-tips__title text-gold">[ 核心玩法 ]</p>

        <p class="tab-tips__sub text-gold">· 基本循环</p>
        <p>拖动桌面查看全景，点击桌布上的硬币抛掷翻转。每次翻转：<b>$ 面（50%）</b>赢现金；<b>☠ 面（50%）</b>得 1 枚骷髅币。用现金购买硬币与助手，让收益自动滚起来。</p>
        <p>点击收益 = 基础值 × (1 + 累计购买硬币数 × 0.1) × 点击倍率——硬币越多，每次点击赚得越多。</p>

        <p class="tab-tips__sub text-gold">· 硬币维度（级联生产链）</p>
        <p>8 层硬币 D1-D8 构成级联生产链：D8→…→D2→D1→现金，高层产出注入低一层，由 D1 最终产出现金。</p>
        <p>产出倍率 = baseRate × 2^(购买数/25)：每买 25 个该层，产出翻倍，指数增长。</p>
        <p>解锁：D1 铜币开局自带；D2 银币赚 50 万；D3 金币赚 1,000 万；D4 铂金抛 1 千次；D5 钻石赚 10 亿；D6 红宝石得 100 骷髅币；D7 祖母绿抛 5 万次；D8 黑曜石赚 1 万亿。</p>

        <p class="tab-tips__sub text-gold">· 助手（自动抛币）</p>
        <p>雇佣助手自动抛币，速率从 0.5 次/秒到 5,000 次/秒；解锁条件随档次递增（如赚 5 万、抛 5 千次、得 30 骷髅币…）。新手助手开局即可雇佣。</p>
        <p>助手可戴上扭蛋机抽到的帽子外观（纯收藏）。</p>

        <p class="tab-tips__sub text-gold">· 任务关卡（一局一关）</p>
        <p>主线 12 关，从极小目标逐关抬升。达成目标后<b>不会自动推进</b>，需点击"过关"才应用奖励进入下一关（也可"暂缓"稍后再过）。</p>
        <p>奖励为永久加成：点击/收益倍率 ×（跨转生保留）、机制解锁（批量购买、自动购买器等）。关卡 1/2/6/9/12 给收益倍率，3/5/10 解锁机制，其余给点击倍率，最高 ×5。</p>

        <p class="tab-tips__sub text-gold">· 转生（重生）</p>
        <p>现金 ≥ 100 万可转生，按 <b>⌊(log₁₀现金 - 6)²⌋</b> 结算「名声点」，现金越高收益越陡。</p>
        <p>转生清空：现金、维度产出、升级、助手；保留：已购买维度（阶梯翻倍）、名声点、天赋、解锁位、扭蛋收藏、骷髅币、累计统计与关卡"永生加成"。</p>
        <p>关卡进度会刷回第 1 关重新打，但永生加成保留，越重生越强。</p>

        <p class="tab-tips__sub text-gold">· 天赋树</p>
        <p>用名声点点亮三系天赋：<b>离线挂机 / 在线操作 / 维度偏向</b>，共 9 节点，可无损重置，自由搭配 Build。</p>

        <p class="tab-tips__sub text-gold">· 规则颠覆挑战</p>
        <p>挑战会改写规则，通关解锁永久机制位：</p>
        <p>· <b>Even Only</b>：封禁奇数阶维度 → 解锁批量购买；<br>
         · <b>Reverse Flow</b>：购买时从高阶维度扣资源 → 解锁自动购买条件；<br>
         · <b>Dark Matter</b>：opposition 每秒增长，超现金比例即失败 → 解锁挑战切换。</p>

        <p class="tab-tips__sub text-gold">· 扭蛋机 & 收藏</p>
        <p>消耗 1 骷髅币抽帽子：普通 70% / 稀有 20% / 史诗 8% / 传说 2%（金帽、彩虹帽）。给助手戴上并加入收藏。</p>

        <p class="tab-tips__sub text-gold">· 自动化脚本</p>
        <p>高级阶段用受限 DSL 写脚本挂机（安全，不执行任意代码），例：<br>
        <span class="tab-tips__code">if cash &gt;= 1000000 then prestige 1</span><br>
        <span class="tab-tips__code">if reputation &gt;= 5 then start challenge darkMatter</span></p>

        <p class="tab-tips__sub text-gold">· 自动购买器</p>
        <p>每个硬币维度可开启独立自动购买开关，钱够即自动买，由关卡/挑战解锁。</p>
      </PxCard>
      <CoinsTab v-else-if="activeTab === 'coins'" />
      <HelpersView v-else-if="activeTab === 'helpers'" />
      <UpgradesView v-else-if="activeTab === 'upgrades'" />
      <ChallengesView v-else-if="activeTab === 'challenges'" />
      <LevelsView v-else />
    </div>

    <!-- ── 过关确认弹窗 ── -->
    <Teleport to="body">
      <div
        v-if="showLevelConfirm && pendingLevel"
        class="level-confirm-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="store.dismissLevel()"
      >
        <PxCard class="level-confirm px-card--dark">
          <h2 class="level-confirm__title pixel-number text-gold">
            {{ t('levels.confirmTitle', { n: state.levels.completed + 1 }) }}
          </h2>
          <p class="level-confirm__goal pixel-number">
            {{ t('levels.goal') }}：{{ pendingGoalText(pendingLevel.goal) }}
          </p>
          <p class="level-confirm__reward pixel-number">
            {{ t('levels.reward') }}：{{ pendingRewardText(pendingLevel.reward) }}
          </p>
          <p class="level-confirm__hint pixel-number">{{ t('levels.confirmHint') }}</p>
          <div class="level-confirm__actions">
            <PxButton :use-throttle="false" type="warning" @click="store.confirmLevel()">
              {{ t('levels.confirmYes') }}
            </PxButton>
            <PxButton :use-throttle="false" type="base" @click="store.dismissLevel()">
              {{ t('levels.confirmNo') }}
            </PxButton>
          </div>
        </PxCard>
      </div>
    </Teleport>
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
  color: #b8912b !important;
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
  /* 视口底色：深墨绿（世界边缘露出的兜底色） */
  background-color: #3d6b2e;
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
  background-color: #457a36;
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
    radial-gradient(circle at 12% 22%, #5aa34a 1.2px, transparent 1.8px),
    radial-gradient(circle at 64% 70%, #5aa34a 1px, transparent 1.5px),
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
  background: linear-gradient(180deg, #66ae52 0 4px, #3f8a35 4px);
  transform: skewX(-12deg);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.18);
}
.decor--grass .g2 {
  left: 5px;
  height: 18px;
  background: linear-gradient(180deg, #74bd5e 0 5px, #2f6d2a 5px);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.2),
    inset -1px 0 0 rgba(0, 0, 0, 0.18);
}
.decor--grass .g3 {
  left: 10px;
  height: 11px;
  background: linear-gradient(180deg, #5aa34a 0 3px, #356f25 3px);
  transform: skewX(10deg);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.16);
}
.decor--grass .g4 {
  left: 3px;
  bottom: 0;
  height: 8px;
  width: 2px;
  background: #3f7d34;
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

/* 上桌进度条：购买/雇佣后精灵逐枚上桌的倒计时 */
.spawn-status {
  position: absolute;
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  width: 240px;
  z-index: 15;
  pointer-events: none;
}

.spawn-status__label {
  color: #ffe066;
  font-size: 14px;
  white-space: nowrap;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6), 0 0 4px rgba(0, 0, 0, 0.4);
}

.spawn-status__bar {
  flex: 1;
  height: 10px !important;
}

/* 上桌进度条淡入淡出 */
.spawn-fade-enter-active,
.spawn-fade-leave-active {
  transition: opacity 0.18s ease;
}
.spawn-fade-enter-from,
.spawn-fade-leave-to {
  opacity: 0;
}

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

.tab-tips__sub {
  margin-top: 10px;
  color: #b8912b;
}

.tab-tips__code {
  display: inline-block;
  margin-top: 2px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 215, 0, 0.25);
  color: #ffe066;
  font-size: 15px;
}

/* ── 过关确认弹窗 ── */
.level-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.level-confirm {
  display: block;
  width: 380px;
  max-width: 90vw;
  padding: 16px;
  --px-border-color: var(--gold);
}

.level-confirm__title {
  font-size: 16px;
  margin-bottom: 10px;
}

.level-confirm__goal,
.level-confirm__reward {
  color: var(--text-main);
  font-size: 16px;
  margin-bottom: 6px;
}

.level-confirm__hint {
  color: var(--text-dim);
  font-size: 16px;
  margin: 10px 0 14px;
}

.level-confirm__actions {
  display: flex;
  gap: 10px;
}
</style>
