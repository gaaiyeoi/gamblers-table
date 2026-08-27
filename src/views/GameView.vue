<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { HELPER_TYPES, HAT_POOL, canAffordDimension } from '../core'
import type { HatRarity } from '../core'
import { formatCash } from '../core/format'
import { PRESTIGE_TIERS } from '../core/data/prestigeTiers'
import HelperSprite from '../components/helpers/HelperSprite.vue'
import CoinsTab from './tabs/CoinsTab.vue'
import HelpersView from './HelpersView.vue'
import AscensionView from './AscensionView.vue'
import ChallengesView from './ChallengesView.vue'
import { useGameStore } from '../stores/gameStore'

type BottomTab = 'tips' | 'coins' | 'helpers' | 'upgrades' | 'casino'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const activeTab = ref<BottomTab>('helpers')

const tableRef = ref<HTMLElement | null>(null)
const tableW = ref(500)
const tableH = ref(360)
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!tableRef.value) return
  tableW.value = tableRef.value.clientWidth
  tableH.value = tableRef.value.clientHeight
  ro = new ResizeObserver(([e]) => {
    tableW.value = e!.contentRect.width
    tableH.value = e!.contentRect.height
  })
  ro.observe(tableRef.value)
})
onBeforeUnmount(() => ro?.disconnect())

const sprites = computed(() => {
  void uiVersion.value
  const list: Array<{ key: string; helperId: string; hat: string; rarity: HatRarity; index: number }> = []
  let idx = 0
  for (const h of HELPER_TYPES) {
    const owned = state.value.helpers[h.id]
    if (!owned || owned.count === 0) continue
    for (let i = 0; i < Math.min(owned.count, 4) && list.length < 16; i++) {
      const hatDef = owned.hat ? HAT_POOL.find((x) => x.id === owned.hat) : null
      list.push({ key: `${h.id}-${i}`, helperId: h.id, hat: owned.hat, rarity: hatDef?.rarity ?? 'common', index: idx++ })
    }
  }
  return list
})

const tier1 = PRESTIGE_TIERS[0]!
const round = computed(() => state.value.prestige.tier)
const cashText = computed(() => { void uiVersion.value; return formatCash(state.value.cash) })
const thresholdText = computed(() => formatCash(tier1.threshold))
const progressPct = computed(() => { void uiVersion.value; return Math.min(100, state.value.cash.div(tier1.threshold).mul(100).toNumber()) })
const tableOnCount = computed(() => { void uiVersion.value; return state.value.dimensions[0]!.bought })
const stockCount = computed(() => { void uiVersion.value; return state.value.dimensions[0]!.amount.floor().toNumber() })
const canBuyCopper = computed(() => { void uiVersion.value; return canAffordDimension(state.value, 1) })

function deployCopper(): void { store.buyDim(1, 1) }

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
    <!-- ── 绿色赌台（nes-container 外框） ── -->
    <div class="table-wrap">
      <div class="nes-container is-rounded is-dark with-title table-outer">
        <p class="title table-title">♠ 赌桌</p>
        <div ref="tableRef" class="felt-table">
          <div class="felt-hint pixel-number">
            点击硬币翻转 · $ 面得钱 · ☠ 面得骷髅币
          </div>

          <HelperSprite
            v-for="sp in sprites"
            :key="sp.key"
            :helper-id="sp.helperId"
            :hat="sp.hat"
            :rarity="sp.rarity"
            :count="1"
            :area-width="tableW"
            :area-height="tableH"
            :index="sp.index"
            @flip="store.doFlip()"
          />

          <div
            v-if="sprites.length === 0"
            class="felt-click-hint pixel-number"
            @click="store.doFlip()"
          >
            点击此处翻转硬币
          </div>
        </div>

        <!-- 台面状态行 -->
        <div class="table-statusbar pixel-number">
          <div class="tsb-left">
            <span>第 {{ round }} 关 · {{ cashText }} / {{ thresholdText }} ({{ progressPct.toFixed(0) }}%)</span>
            <progress class="nes-progress is-warning tsb-progress" :value="progressPct" max="100" />
          </div>
          <div class="tsb-right">
            <span>桌上 {{ tableOnCount }} · 库存 {{ stockCount }}</span>
            <button
              class="nes-btn tsb-btn"
              :class="canBuyCopper ? 'is-success' : ''"
              type="button"
              :disabled="!canBuyCopper"
              @click="deployCopper"
            >
              抄币上桌
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab 导航（nes-btn） ── -->
    <div class="bottom-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="nes-btn btab"
        :class="{ 'is-warning': activeTab === tab.id }"
        type="button"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Tab 内容 ── -->
    <div class="tab-body">
      <div v-if="activeTab === 'tips'" class="tab-tips nes-container is-dark pixel-number">
        <p class="tab-tips__title text-gold">[ 核心玩法 ]</p>
        <p>· 雇佣助手自动翻转硬币赚取现金</p>
        <p>· $ 面 → 赢得现金 · ☠ 面 → 获得骷髅代币</p>
        <p>· 购买更多硬币提升每秒翻转量</p>
        <p>· 积攒现金后可「重生」获得永久增益</p>
      </div>
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
  /* NES is-rounded 自带 margin:4px，不覆盖 border/box-shadow */
  padding: 8px !important;
  /* 台面容器保持亮色（白底黑边是 NES 原生效果） */
}

.table-title {
  color: #c03000 !important;
  font-size: 16px;
  font-weight: 700;
}

/* ── 绿色台面（粗糙像素点阵绒布） ── */
.felt-table {
  width: 100%;
  height: 36vh;
  min-height: 200px;
  max-height: 400px;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  image-rendering: pixelated;
  /* 双层像素网格：细格(8px) + 粗格(32px)，模拟绒布粗糙感 */
  background-color: #1a6025;
  background-image:
    linear-gradient(rgba(0,0,0,.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,.25) 1px, transparent 1px),
    linear-gradient(rgba(0,0,0,.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,.10) 1px, transparent 1px);
  background-size:
    32px 32px,
    32px 32px,
    8px 8px,
    8px 8px;
  /* 深木色像素边框 */
  border: 6px solid #5a3210;
  box-shadow:
    inset 0 0 0 3px #3d2008,
    inset 0 0 0 5px #7a4818,
    4px 4px 0 #212121;
}

.felt-hint {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65);
  color: rgba(255, 255, 255, 0.75);
  padding: 5px 16px;
  font-size: 16px;
  white-space: nowrap;
  z-index: 15;
  pointer-events: none;
  letter-spacing: 1px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.felt-click-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.3);
  font-size: 16px;
  cursor: pointer;
  pointer-events: all;
  letter-spacing: 1px;
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
.tsb-btn { font-size: 16px !important; padding: 7px 12px !important; }

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
