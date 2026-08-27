<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

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
      <div
        v-for="row in rows"
        :key="row.id"
        class="nes-container is-dark cc-card"
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
            <div class="cc-name pixel-number">{{ row.name }}</div>
            <div class="cc-sub pixel-number">
              基础 {{ row.base }} · 强化 +25%/级 · Charge
            </div>
          </div>
        </div>

        <!-- 像素虚线分隔 -->
        <div class="cc-divider" />

        <!-- 底部按钮（全部在卡片内） -->
        <div class="cc-actions">
          <button
            class="nes-btn cc-btn"
            :class="row.affordable ? 'is-success' : ''"
            type="button"
            :disabled="!row.affordable"
            @click="buy(row.tier, 1)"
          >
            购买<br>{{ row.cost1 }}
          </button>
          <button
            class="nes-btn cc-btn"
            :class="row.affordable ? '' : ''"
            type="button"
            @click="buy(row.tier, 10)"
          >
            ×10<br>{{ row.cost10 }}
          </button>
          <button class="nes-btn is-warning cc-btn" type="button">
            强化<br>Lv0
          </button>
        </div>
      </div>
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
  padding: 12px !important;
  background: #141d2e !important;
  /* NES.css 像素阴影核心 */
  box-shadow:
    inset -4px -4px #0c1219,
    inset  4px  4px #1e2d45 !important;
}

.cc-card:hover {
  box-shadow:
    inset -4px -4px #0c1219,
    inset  4px  4px #2a3e5c,
    0 0 0 2px rgba(245, 166, 35, 0.2) !important;
}

.cc-card--owned {
  border-color: #f5a623 !important;
  box-shadow:
    inset -4px -4px rgba(0,0,0,0.6),
    inset  4px  4px rgba(255,255,255,0.04),
    0 0 8px rgba(245, 166, 35, 0.2) !important;
}

/* 徽章 */
.cc-badge {
  position: absolute;
  top: 8px; right: 8px;
  background: #0c1219;
  border: 2px solid #3e4f6a;
  color: #6b7a99;
  padding: 1px 7px;
  font-size: 16px;
  box-shadow: inset -2px -2px #060c13, inset 2px 2px #1e2d45;
}

/* 顶部布局 */
.cc-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

/* 像素硬币图标 */
.cc-coin-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--cc) 60%, #fff), var(--cc) 55%, color-mix(in srgb, var(--cc) 50%, #000));
  border: 3px solid color-mix(in srgb, var(--cc) 40%, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  image-rendering: pixelated;
  /* 立体阴影 */
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--cc) 30%, #000),
    inset 0 2px 0 rgba(255,255,255,0.4),
    inset 0 -2px 0 rgba(0,0,0,0.3);
}

.cc-coin-sym {
  font-size: 16px;
  font-weight: 900;
  color: color-mix(in srgb, var(--cc) 20%, #000);
}

/* 信息 */
.cc-info { flex: 1; }

.cc-name {
  font-size: 16px;
  font-weight: 900;
  color: #cdd7e8;
  margin-bottom: 3px;
}

.cc-sub { font-size: 16px; color: #6b7a99; }

/* 虚线分隔 */
.cc-divider {
  height: 2px;
  margin-bottom: 10px;
  background:
    repeating-linear-gradient(90deg, #2a3e5c 0, #2a3e5c 4px, transparent 4px, transparent 8px);
}

/* 按钮区 */
.cc-actions { display: flex; gap: 6px; }

.cc-btn {
  flex: 1;
  font-size: 16px !important;
  padding: 4px 6px !important;
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
  min-width: 0;
}

.cc-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
</style>
