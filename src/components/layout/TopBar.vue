<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { talentTotalMultiplier } from '../../core'
import { formatCash } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

const cash = computed(() => { void uiVersion.value; return formatCash(state.value.cash) })
const multiplier = computed(() => { void uiVersion.value; return `×${talentTotalMultiplier(state.value).toFixed(1)}` })
const skulls = computed(() => { void uiVersion.value; return state.value.skullTokens })
const totalFlips = computed(() => { void uiVersion.value; return state.value.stats.totalFlips })
const totalWins = computed(() => { void uiVersion.value; return state.value.stats.totalWins })
const winRate = computed(() => totalFlips.value === 0 ? '+0.0%' : `+${((totalWins.value / totalFlips.value) * 100).toFixed(1)}%`)
const headsCount = computed(() => totalWins.value)
const tailsCount = computed(() => totalFlips.value - totalWins.value)
</script>

<template>
  <div class="topbar-wrap">
    <header class="topbar">
      <!-- LOGO -->
      <div class="topbar__logo">
        <span class="logo-px">■</span>
        <span class="logo-text pixel-number">像素赌桌</span>
        <span class="logo-sub pixel-number">GAMBLERS TABLE</span>
      </div>

      <!-- 数据徽章（nes-container 小框） -->
      <div class="topbar__stats">
        <div class="nes-container stat-chip">
          <span class="stat-chip__lbl">家资</span>
          <span class="stat-chip__val pixel-number text-gold">{{ cash }}</span>
        </div>
        <div class="nes-container stat-chip">
          <span class="stat-chip__lbl">倍率</span>
          <span class="stat-chip__val pixel-number">{{ multiplier }}</span>
        </div>
        <div class="nes-container stat-chip">
          <span class="stat-chip__lbl">胜率</span>
          <span class="stat-chip__val pixel-number" style="color:#209020">{{ winRate }}</span>
        </div>
        <div class="nes-container stat-chip">
          <span class="stat-chip__lbl">骷髅</span>
          <span class="stat-chip__val pixel-number" style="color:#6b21a8">☠{{ skulls }}</span>
        </div>
        <div class="nes-container stat-chip">
          <span class="stat-chip__lbl">翻转</span>
          <span class="stat-chip__val pixel-number">{{ headsCount }}正/{{ tailsCount }}反</span>
        </div>
      </div>

      <!-- 右侧操作 -->
      <div class="topbar__right">
        <button class="nes-btn" type="button">▣</button>
        <button class="nes-btn is-primary" type="button">≡ 菜单</button>
      </div>
    </header>
  </div>
</template>

<style scoped>
.topbar-wrap {
  flex-shrink: 0;
  background: var(--app-bg);
  border-bottom: 4px solid #212121;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  min-height: 56px;
}

.topbar__logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-right: 8px;
}

.logo-px {
  color: #c03000;
  font-size: 16px;
  line-height: 1;
}

.logo-text {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.logo-sub {
  color: var(--text-dim);
  font-size: 16px;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* 数据徽章区 */
.topbar__stats {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}

/* nes-container 小数据块 */
.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px !important;
  min-width: 72px;
}

.stat-chip__lbl {
  font-size: 16px;
  color: var(--text-dim);
  margin-bottom: 3px;
  font-family: 'Ark Pixel 16px Monospaced', monospace;
}

.stat-chip__val {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

/* 右侧按钮 */
.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}
</style>
