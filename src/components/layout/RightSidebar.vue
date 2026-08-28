<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import GtCard from '../ui/GtCard.vue'
import GtProgress from '../ui/GtProgress.vue'
import {
  currencyOf,
  MINING_BARS,
  MINING_CURRENCY_NAMES,
  miningDwellerLimit,
  miningPrestigePreview,
  miningScrapPerSecond,
  miningWallProgress,
  oreCap,
} from '../../core'
import { useSound } from '../../composables/useSound'
import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const { play } = useSound()

type RsbTab = 'events'
const activeTab = ref<RsbTab>('events')

function onTab(id: RsbTab): void {
  play('tab')
  activeTab.value = id
}

/** 废料/秒：主货币实时速率。 */
const perSec = computed(() => {
  void uiVersion.value
  const v = miningScrapPerSecond(state.value)
  return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString()
})
/** 大数记法：与矿场面板一致，小数值保留 1~2 位，大数用 K/M/B/T… 后缀。 */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '∞'
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs < 0.01) return v.toExponential(1)
  if (abs < 1000) return abs < 10 ? v.toFixed(2).replace(/\.?0+$/, '') : Math.round(v).toString()
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N', 'D']
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3))
  const scaled = v / Math.pow(1000, tier)
  return `${scaled.toFixed(2)}${suffixes[tier]}`
}

function nameOf(id: string): string {
  return MINING_CURRENCY_NAMES[id] ?? id
}

/** 通用读数：小数值保留 1 位，大数值取整加千分位。 */
function read(id: string): string {
  const v = state.value.mining.currency[id] ?? 0
  return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString()
}
const crystal = computed(() => { void uiVersion.value; return read('crystalGreen') })
const depth = computed(() => { void uiVersion.value; return state.value.mining.depth })
const scrap = computed(() => { void uiVersion.value; return read('scrap') })
const coal = computed(() => { void uiVersion.value; return read('coal') })
const helium = computed(() => { void uiVersion.value; return read('helium') })
/** 本次转生可领取的水晶。 */
const crystalGain = computed(() => {
  void uiVersion.value
  const v = miningPrestigePreview(state.value)
  return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString()
})
/** 矿壁已挖进度：从 0% 涨到 100% 表示即将挖穿。 */
const wallPct = computed(() => {
  void uiVersion.value
  const done = 1 - miningWallProgress(state.value)
  return `${Math.min(100, Math.max(0, done * 100)).toFixed(0)}%`
})

/** 转生进度：深度居民累积量 → 当前上限，转生后归零重新累积。 */
const progressPct = computed(() => {
  void uiVersion.value
  const limit = miningDwellerLimit(state.value)
  const cur = state.value.mining.depthDwellerCap0
  return limit <= 0 ? 0 : Math.min(100, Math.max(0, (cur / limit) * 100))
})
/** 本次转生的目标：把深度居民堆到上限。 */
const thresholdText = computed(() => {
  void uiVersion.value
  const limit = miningDwellerLimit(state.value)
  const cur = state.value.mining.depthDwellerCap0
  return `目标 居民 ${cur.toFixed(0)} / ${limit.toFixed(0)}`
})

const events = computed(() => { void uiVersion.value; return state.value.eventLog.slice(0, 10) })

/** 资源一览：当前持有量 > 0 的矿石列表。 */
const currencyList = computed(() => {
  void uiVersion.value
  const shown = ['scrap', 'granite', 'salt', 'coal', 'sulfur', 'niter', 'obsidian', 'deeprock']
  for (const bar of MINING_BARS) {
    shown.push(bar)
  }
  return shown
    .map((id) => ({ id, value: currencyOf(state.value, id), cap: oreCap(state.value, id) }))
    .filter((c) => c.value > 0)
})

const tabs: Array<{ id: RsbTab; label: string }> = [
  { id: 'events', label: '事件' },
]
</script>

<template>
  <aside class="rsb">
    <!-- ── 常驻：当局进度 ── -->
    <GtCard class="rsb-block">
      <template #header><p class="title">当局进度</p></template>
      <div class="rsb-progress-text pixel-number">
        <span>重生进度</span>
        <span class="rsb-progress-text__pct">({{ progressPct.toFixed(0) }}%)</span>
      </div>
      <GtProgress
        class="rsb-progress-bar"
        :percentage="progressPct"
        status="warning"
      />
      <div class="rsb-progress-threshold pixel-number">
        <span class="rsb-progress-threshold__label">重生门槛</span>
        <span>{{ thresholdText }}</span>
      </div>
    </GtCard>

    <!-- ── 常驻：关键指标 ── -->
    <GtCard class="rsb-block">
      <template #header><p class="title">关键指标</p></template>
      <div class="rsb-kv-list">
        <div class="rsb-kv pixel-number">
          <span class="rsb-kv__label"><span class="rsb-dot rsb-dot--gold"></span>废料/秒</span>
          <span class="rsb-kv__val text-gold">{{ perSec }}/s</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span class="rsb-kv__label"><span class="rsb-dot rsb-dot--cyan"></span>绿水晶</span>
          <span class="rsb-kv__val rsb-kv__val--crystal">{{ crystal }} <span class="rsb-kv__sub">(+{{ crystalGain }})</span></span>
        </div>
        <div class="rsb-kv pixel-number">
          <span class="rsb-kv__label"><span class="rsb-dot rsb-dot--purple"></span>深度</span>
          <span class="rsb-kv__val text-gold">第 {{ depth }} 层</span>
        </div>
        <div class="rsb-kv pixel-number rsb-kv--minor">
          <span class="rsb-kv__label">废料</span>
          <span class="rsb-kv__val text-gold">{{ scrap }}</span>
        </div>
        <div class="rsb-kv pixel-number rsb-kv--minor">
          <span class="rsb-kv__label">煤炭</span>
          <span class="rsb-kv__val text-gold">{{ coal }}</span>
        </div>
        <div class="rsb-kv pixel-number rsb-kv--minor">
          <span class="rsb-kv__label">矿壁</span>
          <span class="rsb-kv__val text-gold">{{ wallPct }}</span>
        </div>
        <div class="rsb-kv pixel-number rsb-kv--minor">
          <span class="rsb-kv__label">氦</span>
          <span class="rsb-kv__val text-gold">{{ helium }}</span>
        </div>
      </div>
      <div v-if="currencyList.length > 0" class="rsb-resources">
        <p class="rsb-resources__title">资源一览</p>
        <div class="rsb-resources__chips">
          <span v-for="c in currencyList" :key="c.id" class="rsb-resource-chip">
            {{ nameOf(c.id) }} {{ fmt(c.value) }}
          </span>
        </div>
      </div>
    </GtCard>

    <!-- ── Tab 面板区 ── -->
    <div class="rsb-panel">
      <div class="rsb-tabbar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="rsb-tab pixel-number"
          :class="{ 'is-active': activeTab === tab.id }"
          @click="onTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="rsb-tabbody">
        <!-- 事件流 -->
        <div class="rsb-events">
          <div v-if="events.length === 0" class="rsb-empty pixel-number">暂无事件</div>
          <div
            v-for="(ev, i) in events"
            :key="i"
            class="rsb-event-row pixel-number"
            :class="`rsb-event-row--${ev.type ?? 'info'}`"
          >
            <span class="rsb-event-time">{{ ev.time }}</span>
            <span class="rsb-event-msg">{{ ev.msg }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.rsb {
  width: calc(360px * var(--ui-scale));
  max-width: 40vw;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--bg-2) 0%, var(--bg-1) 100%);
  border-left: 1px solid var(--line-1);
  box-shadow: inset 2px 0 0 rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  gap: var(--sp-4);
  padding: var(--sp-4);
}

.rsb-block { flex-shrink: 0; }

/* GtCard header 区的标题样式 */
.rsb-block .title {
  margin: 0;
  color: var(--gold-400);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.rsb-progress-text {
  font-size: var(--fs-sm);
  color: var(--txt-sub);
  margin-bottom: var(--sp-2);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.rsb-progress-text__pct { color: var(--gold-400); font-weight: 700; }
.rsb-progress-threshold {
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--txt-faint);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.rsb-progress-threshold__label { color: var(--txt-dim); }

.rsb-progress-bar {
  width: 100%;
  margin-bottom: var(--sp-1);
}

.rsb-kv-list { width: 100%; }

.rsb-kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-2) 0;
  font-size: var(--fs-base);
  color: var(--txt-main);
  border-bottom: 1px dashed var(--line-1);
}
.rsb-kv:last-child { border-bottom: none; }

/* 次要指标字号缩小，减少视觉权重 */
.rsb-kv--minor {
  padding: calc(var(--sp-1) * 1.5) 0;
  font-size: var(--fs-xs);
  color: var(--txt-sub);
}
.rsb-kv--minor .rsb-kv__val { font-size: var(--fs-xs); }

.rsb-kv__label {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  color: var(--txt-sub);
}

.rsb-kv__val {
  color: var(--txt-gold-bright);
  font-weight: 700;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6), 0 0 8px rgba(240, 162, 60, 0.18);
}

.rsb-kv__val--crystal { color: #7ee0a0; text-shadow: 0 0 8px rgba(126, 224, 160, 0.25); }
.rsb-kv__sub { color: var(--txt-dim); font-weight: 400; font-size: var(--fs-xs); }

/* 资源一览 */
.rsb-resources {
  margin-top: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px dashed var(--line-1);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.rsb-resources__title {
  margin: 0;
  color: var(--txt-dim);
  font-size: var(--fs-xs);
  letter-spacing: 1px;
}
.rsb-resources__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-2);
}
.rsb-resource-chip {
  font-size: var(--fs-xs);
  color: #c0c4cc;
  padding: calc(1px * var(--ui-scale)) var(--sp-1);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--line-2);
}

/* 彩色状态圆点 */
.rsb-dot {
  display: inline-block;
  width: calc(6px * var(--ui-scale));
  height: calc(6px * var(--ui-scale));
  flex-shrink: 0;
}
.rsb-dot--gold { background: var(--gold-400); box-shadow: 0 0 4px var(--gold-glow); }
.rsb-dot--cyan { background: #7ee0a0; box-shadow: 0 0 4px rgba(126, 224, 160, 0.4); }
.rsb-dot--purple { background: #d0a0ff; box-shadow: 0 0 4px rgba(208, 160, 255, 0.4); }

.rsb-skull { color: var(--skull); font-weight: 700; }

/* ── Tab 面板区 ── */
.rsb-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.rsb-tabbar {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  background: var(--bg-2);
  border: 1px solid var(--line-1);
  border-bottom: none;
  flex-shrink: 0;
}

.rsb-tab {
  flex: 1;
  padding: var(--sp-2) var(--sp-1);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--txt-dim);
  font-size: var(--fs-sm);
  font-family: inherit;
  cursor: pointer;
  transition: color 0.1s ease, border-color 0.1s ease;
}
.rsb-tab:hover {
  color: var(--txt-hi);
}
.rsb-tab.is-active {
  color: var(--gold-300);
  border-bottom-color: var(--gold-500);
  text-shadow: 0 0 8px var(--gold-glow);
}

.rsb-tabbody {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--bg-2);
  border: 1px solid var(--line-1);
}

/* 事件流 */
.rsb-events { padding: var(--sp-2) var(--sp-3); }

.rsb-empty {
  font-size: var(--fs-sm);
  color: var(--text-dim);
  padding: var(--sp-1) 0;
}

.rsb-event-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 var(--sp-2);
  padding: var(--sp-1) 0 var(--sp-2);
  font-size: var(--fs-xs);
  border-bottom: 1px solid rgba(58, 39, 23, 0.5);
  line-height: 1.5;
}
.rsb-event-row:last-child { border-bottom: none; }

.rsb-event-time {
  color: var(--txt-faint);
  flex-shrink: 0;
  font-size: calc(11px * var(--ui-scale));
  padding-top: 2px;
  white-space: nowrap;
}
.rsb-event-msg  { color: var(--gold-400); font-weight: 600; word-break: break-all; }

/* 事件性质配色：成功绿 / 提示灰 / 警告橙 / 失败红 */
.rsb-event-row--success .rsb-event-msg { color: var(--pos, #5ab884); }
.rsb-event-row--info .rsb-event-msg    { color: var(--txt-sub, #b9b1c8); }
.rsb-event-row--warn .rsb-event-msg    { color: var(--warn, #f0a23c); }
.rsb-event-row--error .rsb-event-msg   { color: var(--neg, #e05a5a); }

/* warn/error 行整体有轻微背景 */
.rsb-event-row--warn  { background: rgba(240, 162, 60, 0.04); padding-left: var(--sp-1); }
.rsb-event-row--error { background: rgba(224, 90, 90, 0.05); padding-left: var(--sp-1); }
</style>
