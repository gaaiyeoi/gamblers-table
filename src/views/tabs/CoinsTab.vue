<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import { canAffordDimension, COIN_TYPES, costOfDimension } from '../../core'
import { formatCash } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

// 硬币颜色 + 中文名 + 详细说明
const COIN_META: Record<string, { color: string; name: string; symbol: string }> = {
  copper:   { color: '#cd7f32', name: '铜币',    symbol: '$' },
  silver:   { color: '#a8a9ad', name: '银币',    symbol: 'S' },
  gold:     { color: '#ffd700', name: '金币',    symbol: 'G' },
  platinum: { color: '#d0d0d8', name: '铂金币',  symbol: 'P' },
  diamond:  { color: '#7dd3fc', name: '钻石币',  symbol: '◆' },
  ruby:     { color: '#e0115f', name: '红宝石币', symbol: '♦' },
  emerald:  { color: '#50c878', name: '祖母绿币', symbol: '★' },
  obsidian: { color: '#6b7280', name: '黑曜石币', symbol: '▲' },
}

interface CoinRow {
  tier: number; id: string; name: string; color: string; symbol: string
  bought: number; cost1: string; cost10: string; affordable: boolean; base: string
}

const rows = computed((): CoinRow[] => {
  void uiVersion.value
  return COIN_TYPES.map((coin, i) => {
    const tier = i + 1
    const dim = state.value.dimensions[i]!
    const meta = COIN_META[coin.icon] ?? { color: '#888', name: coin.id, symbol: '$' }
    return {
      tier, id: coin.id,
      name: meta.name, color: meta.color, symbol: meta.symbol,
      bought: dim.bought,
      cost1: formatCash(costOfDimension(state.value, tier, 1)),
      cost10: formatCash(costOfDimension(state.value, tier, 10)),
      affordable: canAffordDimension(state.value, tier, 1),
      base: formatCash(coin.baseRate),
    }
  })
})

function buy(tier: number, count: number): void { store.buyDim(tier, count) }
</script>

<template>
  <div class="coins-tab">
    <!-- 页头 -->
    <div class="ct-head pixel-number">
      <span class="ct-dot" />
      <div>
        <div class="ct-title">硬币</div>
        <div class="ct-sub">购买更多硬币上桌，强化硬币提升单枚价值。</div>
      </div>
    </div>

    <!-- 卡片列表 -->
    <div class="ct-list">
      <PxCard
        v-for="row in rows"
        :key="row.id"
        class="cc-card px-card--dark"
        :class="{ 'cc-card--owned': row.bought > 0 }"
      >
        <!-- 已拥有徽章 -->
        <span v-if="row.bought > 0" class="cc-badge pixel-number">×{{ row.bought }}</span>

        <!-- 顶部：像素硬币图标 + 名称/说明 -->
        <div class="cc-top">
          <div
            class="cc-coin-icon"
            :style="{ '--cc': row.color }"
          >
            <span class="cc-coin-sym pixel-number">{{ row.symbol }}</span>
          </div>
          <div class="cc-info">
            <div class="cc-name pixel-number" :style="{ color: row.color }">{{ row.name }}</div>
            <div class="cc-sub pixel-number">
              基础 {{ row.base }} · 强化 +25%/级 · Charge
            </div>
          </div>
        </div>

        <!-- 像素虚线分隔 -->
        <div class="cc-divider" />

        <!-- 底部按钮（全部在卡片内） -->
        <div class="cc-actions">
          <PxButton
            class="cc-btn"
            :type="row.affordable ? 'success' : 'base'"
            :disabled="!row.affordable"
            @click="buy(row.tier, 1)"
          >
            <span class="cc-btn-label">购买</span>
            <span class="cc-btn-cost">{{ row.cost1 }}</span>
          </PxButton>
          <PxButton class="cc-btn" @click="buy(row.tier, 10)">
            <span class="cc-btn-label">×10</span>
            <span class="cc-btn-cost">{{ row.cost10 }}</span>
          </PxButton>
          <PxButton type="warning" class="cc-btn">
            <span class="cc-btn-label">强化</span>
            <span class="cc-btn-cost">Lv0</span>
          </PxButton>
        </div>
      </PxCard>
    </div>
  </div>
</template>

<style scoped>
.coins-tab { padding: 0 0 32px; }

/* 页头 */
.ct-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 10px;
  border-bottom: 4px solid #1e2d45;
}

.ct-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: #f5a623;
  border: 2px solid #b8860b;
  /* 像素阴影 */
  box-shadow: inset -2px -2px #7a5c00, inset 2px 2px #ffe066;
  flex-shrink: 0;
}

.ct-title {
  font-size: 16px;
  font-weight: 900;
  color: #f5a623;
  margin-bottom: 2px;
}

.ct-sub { font-size: 16px; color: #6b7a99; }

/* 卡片列表 */
.ct-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 硬币卡片 */
.cc-card {
  position: relative;
  display: block;
  padding: 12px !important;
  /* 用 paint 变量代替 background 简写，避免覆盖 pixelbox 边框 */
  --px-bg-color: #3a2410 !important;
  /* Pixel UI 像素阴影核心 */
  box-shadow:
    inset -4px -4px #1c1006,
    inset  4px  4px #4a2f16 !important;
}

.cc-card:hover {
  box-shadow:
    inset -4px -4px #1c1006,
    inset  4px  4px #543a1c,
    0 0 0 2px rgba(212, 160, 23, 0.25) !important;
}

.cc-card--owned {
  --px-border-color: #d4a017 !important;
  box-shadow:
    inset -4px -4px rgba(0,0,0,0.6),
    inset  4px  4px rgba(255,255,255,0.04),
    0 0 8px rgba(212, 160, 23, 0.25) !important;
}

/* 徽章 */
.cc-badge {
  position: absolute;
  top: 8px; right: 8px;
  background: #e2daca;
  border: 2px solid #a8a090;
  color: #555;
  padding: 1px 7px;
  font-size: 16px;
  box-shadow: inset -2px -2px #c8c0a8, inset 2px 2px #fff;
}

/* 顶部布局 */
.cc-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

/* 像素硬币图标（8-bit 方块金币，与桌布硬币统一：无圆角、无渐变） */
.cc-coin-icon {
  position: relative;
  width: 40px; height: 40px;
  background: var(--cc, #d4a017);
  border: 3px solid color-mix(in srgb, var(--cc, #d4a017) 40%, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  image-rendering: pixelated;
  /* 像素立体阴影：左上亮 / 右下暗 + 外阴影 */
  box-shadow:
    inset -6px -6px 0 color-mix(in srgb, var(--cc, #d4a017) 35%, #000),
    inset  6px  6px 0 color-mix(in srgb, var(--cc, #d4a017) 60%, #fff),
    4px 4px 0 rgba(0, 0, 0, 0.8);
}

/* 左上角像素高光（阶梯式，增强 8-bit 感） */
.cc-coin-icon::before {
  content: '';
  position: absolute;
  top: 3px; left: 3px;
  width: 8px; height: 4px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 4px 4px 0 rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

/* 右下角像素阴影块 */
.cc-coin-icon::after {
  content: '';
  position: absolute;
  bottom: 3px; right: 3px;
  width: 8px; height: 4px;
  background: rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.cc-coin-sym {
  font-size: 18px;
  font-weight: 900;
  color: color-mix(in srgb, var(--cc, #d4a017) 15%, #000);
  position: relative;
  z-index: 2;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.45);
}

/* 信息 */
.cc-info { flex: 1; }

.cc-name {
  font-size: 16px;
  font-weight: 900;
  margin-bottom: 3px;
  /* 亮色：跟随硬币自身颜色，深色卡片上更醒目 */
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}

.cc-sub {
  font-size: 16px;
  /* 亮暖色，替代原来偏灰的 #555 */
  color: #e8ddc0;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
}

/* 虚线分隔 */
.cc-divider {
  height: 2px;
  margin-bottom: 10px;
  background:
    repeating-linear-gradient(90deg, #b8b0a0 0, #b8b0a0 4px, transparent 4px, transparent 8px);
}

/* 按钮区 */
.cc-actions { display: flex; gap: 6px; }

/* 覆盖 px-button 固定高度/nowrap，让两行内容在按钮内自适应居中，不再溢出 */
.cc-btn {
  flex: 1;
  --px-button-size: auto !important;
  height: auto !important;
  flex-direction: column;
  white-space: normal !important;
  line-height: 1.2 !important;
  font-size: 16px !important;
  padding: 7px 8px !important;
  text-align: center;
  cursor: pointer;
  min-width: 0;
}

.cc-btn-label {
  display: block;
  font-weight: 700;
}

.cc-btn-cost {
  display: block;
  margin-top: 2px;
  line-height: 1.2;
}

.cc-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
</style>
