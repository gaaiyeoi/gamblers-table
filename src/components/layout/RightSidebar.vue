<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { PxCard, PxProgress } from '@mmt817/pixel-ui'
import { HELPER_TYPES, PRESTIGE_TIERS, dimensionProductionPerSecond, talentTotalMultiplier } from '../../core'
import { formatCash } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

const cash = computed(() => { void uiVersion.value; return formatCash(state.value.cash) })
const perSec = computed(() => { void uiVersion.value; return formatCash(dimensionProductionPerSecond(state.value, 1)) })
const multiplier = computed(() => { void uiVersion.value; return `×${talentTotalMultiplier(state.value).toFixed(1)}` })
const skulls = computed(() => { void uiVersion.value; return `$${state.value.skullTokens.toLocaleString()}` })
const totalHelpers = computed(() => { void uiVersion.value; return HELPER_TYPES.reduce((s, h) => s + (state.value.helpers[h.id]?.count ?? 0), 0) })
const totalFlips = computed(() => { void uiVersion.value; return state.value.stats.totalFlips })
const totalWins = computed(() => { void uiVersion.value; return state.value.stats.totalWins })
const winRate = computed(() => totalFlips.value === 0 ? '0%' : `${((totalWins.value / totalFlips.value) * 100).toFixed(0)}%`)
const totalEarned = computed(() => { void uiVersion.value; return formatCash(state.value.stats.totalEarned) })

const tier1 = PRESTIGE_TIERS[0]!
const round = computed(() => state.value.prestige.tier)
const progressPct = computed(() => { void uiVersion.value; return Math.min(100, state.value.cash.div(tier1.threshold).mul(100).toNumber()) })

const helperSummary = computed(() => {
  void uiVersion.value
  return HELPER_TYPES
    .map((h) => ({ id: h.id, count: state.value.helpers[h.id]?.count ?? 0 }))
    .filter((h) => h.count > 0)
    .slice(0, 4)
})

const HELPER_NAMES: Record<string, string> = {
  novice: '小鸭学徒', apprentice: '狐狸老手', journeyman: '熊力壮汉',
  expert: '魔法师傅', master: '冰霜大师', grandmaster: '炎炎宗师',
  legend: '传奇英雄', mythic: '神话存在',
}

const HELPER_COLORS: Record<string, string> = {
  novice: '#c08000', apprentice: '#c03000', journeyman: '#6b3000',
  expert: '#5b21b6', master: '#0369a1', grandmaster: '#991b1b',
  legend: '#806000', mythic: '#9d174d',
}

const events = computed(() => { void uiVersion.value; return state.value.eventLog.slice(0, 10) })
</script>

<template>
  <aside class="rsb">
    <!-- ── 当局游戏 ── -->
    <PxCard round class="rsb-block">
      <template #header><p class="title">当局游戏</p></template>
      <div class="rsb-progress-text pixel-number">
        第 {{ round }} 关 · {{ progressPct.toFixed(0) }}%
      </div>
      <PxProgress
        class="rsb-progress-bar"
        :percentage="progressPct"
        status="warning"
        :show-text="false"
      />
      <div class="rsb-kv-list">
        <div class="rsb-kv pixel-number">
          <span>余额</span>
          <span class="text-gold">{{ cash }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>每秒</span><span>{{ perSec }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>倍率</span><span>{{ multiplier }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>助手</span><span>{{ totalHelpers }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>骷髅</span>
          <span class="rsb-skull">{{ skulls }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>累赚</span><span>{{ totalEarned }}</span>
        </div>
      </div>
    </PxCard>

    <!-- ── 助手概览 ── -->
    <PxCard round class="rsb-block">
      <template #header><p class="title">助手概览</p></template>
      <div v-if="helperSummary.length === 0" class="rsb-empty pixel-number">暂无助手</div>
      <div
        v-for="h in helperSummary"
        :key="h.id"
        class="rsb-helper-row pixel-number"
      >
        <span class="rsb-helper-dot" :style="{ background: HELPER_COLORS[h.id] ?? '#888' }" />
        <span class="rsb-helper-name">{{ HELPER_NAMES[h.id] ?? h.id }}</span>
        <span class="rsb-helper-cnt">×{{ h.count }}</span>
      </div>
    </PxCard>

    <!-- ── 详细统计 ── -->
    <PxCard round class="rsb-block">
      <template #header><p class="title">详细统计</p></template>
      <div class="rsb-kv-list">
        <div class="rsb-kv pixel-number">
          <span>每秒收入</span><span>{{ perSec }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>累计翻转</span><span>{{ totalFlips }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>当前胜率</span>
          <span :class="{ 'text-pos': totalWins > 0 }">{{ winRate }}</span>
        </div>
        <div class="rsb-kv pixel-number">
          <span>今日收入</span><span>{{ totalEarned }}</span>
        </div>
      </div>
    </PxCard>

    <!-- ── 事件流 ── -->
    <PxCard round class="rsb-block rsb-block--grow">
      <template #header><p class="title">事件流</p></template>
      <div class="rsb-events">
        <div v-if="events.length === 0" class="rsb-empty pixel-number">暂无事件</div>
        <div
          v-for="ev in events"
          :key="ev.id"
          class="rsb-event-row pixel-number"
        >
          <span class="rsb-event-time">{{ ev.time }}</span>
          <span class="rsb-event-msg">{{ ev.msg }}</span>
        </div>
      </div>
    </PxCard>
  </aside>
</template>

<style scoped>
.rsb {
  width: 230px;
  flex-shrink: 0;
  background: var(--app-bg);
  border-left: 4px solid #212121;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 12px;
  padding: 10px;
}

.rsb-block { flex-shrink: 0; display: block; }
.rsb-block--grow { flex: 1; display: flex; flex-direction: column; }

/* PxCard 头标题（对应 NES with-title） */
.rsb-block .title {
  margin: 0;
  color: #c03000;
  font-size: 16px;
  font-weight: 700;
}

.rsb-progress-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.rsb-progress-bar {
  width: 100%;
  margin-bottom: 12px;
}

.rsb-kv-list { width: 100%; }

.rsb-kv {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 16px;
  color: var(--text-secondary);
  border-bottom: 2px solid #ddd;
}
.rsb-kv:last-child { border-bottom: none; }
.rsb-kv span:last-child { color: var(--text-primary); font-weight: 600; }

.rsb-skull { color: #6b21a8; font-weight: 700; }

.rsb-helper-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 16px;
  border-bottom: 2px solid #ddd;
  color: var(--text-secondary);
}
.rsb-helper-row:last-child { border-bottom: none; }

.rsb-helper-dot {
  width: 10px; height: 10px;
  flex-shrink: 0;
  border: 2px solid #212121;
  box-shadow: inset -2px -2px rgba(0,0,0,.3), inset 2px 2px rgba(255,255,255,.3);
}

.rsb-helper-name { flex: 1; color: var(--text-primary); }
.rsb-helper-cnt  { color: var(--text-gold); font-weight: 700; }

.rsb-empty {
  font-size: 16px;
  color: var(--text-dim);
  padding: 4px 0;
}

.rsb-events { flex: 1; overflow-y: auto; }

.rsb-event-row {
  display: flex;
  gap: 8px;
  padding: 5px 0;
  font-size: 16px;
  border-bottom: 2px solid #ddd;
  line-height: 1.6;
}
.rsb-event-row:last-child { border-bottom: none; }

.rsb-event-time { color: var(--text-dim); flex-shrink: 0; }
.rsb-event-msg  { color: #c03000; font-weight: 600; }
</style>
