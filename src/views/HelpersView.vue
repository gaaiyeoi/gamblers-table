<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { HELPER_TYPES, canAffordHelper, costOfHelper } from '../core'
import { formatCash } from '../core/format'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

/**
 * 16×16 像素人物 SVG（内联，pixelated）
 * 每个助手有独特的颜色方案
 */
const HELPER_SVG: Record<string, string> = {
  // 小鸭学徒：黄鸭
  novice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="1" width="6" height="1" fill="#f5c518"/>
    <rect x="4" y="2" width="8" height="4" fill="#f5c518"/>
    <rect x="3" y="3" width="1" height="2" fill="#f5c518"/>
    <rect x="11" y="3" width="2" height="1" fill="#ff8c00"/>
    <rect x="4" y="4" width="1" height="1" fill="#000"/>
    <rect x="7" y="4" width="1" height="1" fill="#000"/>
    <rect x="3" y="6" width="10" height="5" fill="#f5a623"/>
    <rect x="2" y="7" width="1" height="3" fill="#f5a623"/>
    <rect x="13" y="7" width="1" height="3" fill="#f5a623"/>
    <rect x="4" y="11" width="2" height="3" fill="#f5a623"/>
    <rect x="9" y="11" width="2" height="3" fill="#f5a623"/>
    <rect x="3" y="13" width="4" height="1" fill="#ff8c00"/>
    <rect x="8" y="13" width="4" height="1" fill="#ff8c00"/>
  </svg>`,

  // 狐狸老手：橙红狐狸
  apprentice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="1" width="2" height="3" fill="#ef4444"/>
    <rect x="12" y="1" width="2" height="3" fill="#ef4444"/>
    <rect x="4" y="2" width="8" height="4" fill="#ef4444"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fca5a5"/>
    <rect x="3" y="6" width="10" height="5" fill="#dc2626"/>
    <rect x="5" y="6" width="6" height="2" fill="#fca5a5"/>
    <rect x="2" y="8" width="1" height="2" fill="#ef4444"/>
    <rect x="13" y="8" width="1" height="2" fill="#ef4444"/>
    <rect x="4" y="11" width="3" height="3" fill="#ef4444"/>
    <rect x="9" y="11" width="3" height="3" fill="#ef4444"/>
    <rect x="3" y="14" width="4" height="1" fill="#7a0000"/>
    <rect x="9" y="14" width="4" height="1" fill="#7a0000"/>
  </svg>`,

  // 熊力壮汉：棕熊
  journeyman: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="2" height="2" fill="#92400e"/>
    <rect x="11" y="1" width="2" height="2" fill="#92400e"/>
    <rect x="4" y="2" width="8" height="5" fill="#92400e"/>
    <rect x="5" y="5" width="1" height="1" fill="#000"/>
    <rect x="9" y="5" width="1" height="1" fill="#000"/>
    <rect x="6" y="6" width="4" height="1" fill="#d97706"/>
    <rect x="2" y="7" width="12" height="5" fill="#78350f"/>
    <rect x="5" y="7" width="6" height="3" fill="#92400e"/>
    <rect x="2" y="9" width="2" height="2" fill="#92400e"/>
    <rect x="12" y="9" width="2" height="2" fill="#92400e"/>
    <rect x="4" y="12" width="3" height="3" fill="#78350f"/>
    <rect x="9" y="12" width="3" height="3" fill="#78350f"/>
  </svg>`,

  // 魔法师傅：紫袍
  expert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="0" width="6" height="1" fill="#4c1d95"/>
    <rect x="4" y="1" width="8" height="1" fill="#7c3aed"/>
    <rect x="5" y="2" width="6" height="4" fill="#a78bfa"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#c4b5fd"/>
    <rect x="3" y="6" width="10" height="6" fill="#5b21b6"/>
    <rect x="2" y="7" width="1" height="4" fill="#7c3aed"/>
    <rect x="13" y="7" width="1" height="4" fill="#7c3aed"/>
    <rect x="7" y="6" width="2" height="1" fill="#ffd700"/>
    <rect x="4" y="12" width="3" height="3" fill="#4c1d95"/>
    <rect x="9" y="12" width="3" height="3" fill="#4c1d95"/>
    <rect x="13" y="9" width="2" height="2" fill="#ffd700"/>
  </svg>`,

  // 冰霜大师：冰蓝
  master: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="1" width="6" height="4" fill="#7dd3fc"/>
    <rect x="4" y="2" width="1" height="3" fill="#7dd3fc"/>
    <rect x="11" y="2" width="1" height="3" fill="#7dd3fc"/>
    <rect x="5" y="3" width="1" height="1" fill="#000"/>
    <rect x="9" y="3" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#e0f2fe"/>
    <rect x="3" y="6" width="10" height="5" fill="#0ea5e9"/>
    <rect x="2" y="7" width="1" height="4" fill="#38bdf8"/>
    <rect x="13" y="7" width="1" height="4" fill="#38bdf8"/>
    <rect x="4" y="11" width="3" height="4" fill="#0369a1"/>
    <rect x="9" y="11" width="3" height="4" fill="#0369a1"/>
    <rect x="6" y="0" width="1" height="2" fill="#bae6fd"/>
    <rect x="9" y="0" width="1" height="2" fill="#bae6fd"/>
  </svg>`,

  // 炎炎宗师：火红
  grandmaster: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="6" y="0" width="4" height="2" fill="#ef4444"/>
    <rect x="5" y="1" width="6" height="4" fill="#fca5a5"/>
    <rect x="5" y="3" width="1" height="1" fill="#000"/>
    <rect x="9" y="3" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fee2e2"/>
    <rect x="3" y="6" width="10" height="5" fill="#dc2626"/>
    <rect x="2" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="13" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="6" y="6" width="4" height="2" fill="#fca5a5"/>
    <rect x="4" y="11" width="3" height="4" fill="#991b1b"/>
    <rect x="9" y="11" width="3" height="4" fill="#991b1b"/>
    <rect x="5" y="0" width="1" height="1" fill="#ffd700"/>
    <rect x="10" y="0" width="1" height="1" fill="#ffd700"/>
  </svg>`,

  // 传奇英雄：金色
  legend: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="0" width="8" height="2" fill="#ffd700"/>
    <rect x="5" y="2" width="6" height="4" fill="#fef08a"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fff"/>
    <rect x="3" y="6" width="10" height="5" fill="#b8860b"/>
    <rect x="5" y="6" width="6" height="3" fill="#d4a017"/>
    <rect x="2" y="7" width="1" height="4" fill="#ffd700"/>
    <rect x="13" y="7" width="1" height="4" fill="#ffd700"/>
    <rect x="4" y="11" width="3" height="4" fill="#92680a"/>
    <rect x="9" y="11" width="3" height="4" fill="#92680a"/>
    <rect x="3" y="0" width="1" height="2" fill="#ffd700"/>
    <rect x="12" y="0" width="1" height="2" fill="#ffd700"/>
  </svg>`,

  // 神话存在：粉紫
  mythic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="10" height="1" fill="#ec4899"/>
    <rect x="5" y="2" width="6" height="4" fill="#f9a8d4"/>
    <rect x="3" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="11" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fce7f3"/>
    <rect x="3" y="6" width="10" height="5" fill="#be185d"/>
    <rect x="5" y="6" width="6" height="3" fill="#ec4899"/>
    <rect x="2" y="7" width="1" height="4" fill="#f472b6"/>
    <rect x="13" y="7" width="1" height="4" fill="#f472b6"/>
    <rect x="4" y="11" width="3" height="4" fill="#9d174d"/>
    <rect x="9" y="11" width="3" height="4" fill="#9d174d"/>
    <rect x="7" y="0" width="2" height="1" fill="#a855f7"/>
    <rect x="6" y="15" width="4" height="1" fill="#ec4899"/>
  </svg>`,
}

interface HelperRow {
  id: string; label: string; rate: string; body: string; head: string
  count: number; costStr: string; affordable: boolean
}

const HELPER_META: Record<string, { body: string; head: string; label: string; rate: string }> = {
  novice:      { body: '#f5a623', head: '#fcd34d', label: '小鸭学徒',  rate: '0.5/s' },
  apprentice:  { body: '#ef4444', head: '#fca5a5', label: '狐狸老手',  rate: '2/s'   },
  journeyman:  { body: '#92400e', head: '#d97706', label: '熊力壮汉',  rate: '8/s'   },
  expert:      { body: '#7c3aed', head: '#a78bfa', label: '魔法师傅',  rate: '30/s'  },
  master:      { body: '#0ea5e9', head: '#7dd3fc', label: '冰霜大师',  rate: '100/s' },
  grandmaster: { body: '#dc2626', head: '#fca5a5', label: '炎炎宗师',  rate: '400/s' },
  legend:      { body: '#ffd700', head: '#fef08a', label: '传奇英雄',  rate: '1.5k/s' },
  mythic:      { body: '#ec4899', head: '#f9a8d4', label: '神话存在',  rate: '5k/s'  },
}

const rows = computed((): HelperRow[] => {
  void uiVersion.value
  return HELPER_TYPES.map((h) => {
    const meta = HELPER_META[h.id] ?? { body: '#888', head: '#aaa', label: h.id, rate: '' }
    return {
      id: h.id,
      label: meta.label,
      rate: meta.rate,
      body: meta.body,
      head: meta.head,
      count: state.value.helpers[h.id]?.count ?? 0,
      costStr: formatCash(costOfHelper(state.value, h.id)),
      affordable: canAffordHelper(state.value, h.id),
    }
  })
})

function hire(id: string): void { store.hireHelperAction(id, 1) }
function svgDataUrl(id: string): string {
  const svg = HELPER_SVG[id] ?? HELPER_SVG['novice']!
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
</script>

<template>
  <div class="helpers-view">
    <!-- 页头 -->
    <div class="nes-container is-rounded with-title hv-header">
      <p class="title hv-title-cls">助手雇佣</p>
      <p class="hv-sub pixel-number">雇佣自动翻硬币的帮手，提升每秒翻转效率。</p>
    </div>

    <!-- 单列通栏卡片 -->
    <div class="hv-list">
      <div
        v-for="row in rows"
        :key="row.id"
        class="nes-container is-rounded hc-card"
        :class="{ 'hc-card--owned': row.count > 0 }"
      >
        <!-- 左：16×16 像素画 SVG 头像 -->
        <div class="hc-avatar">
          <img
            class="hc-sprite"
            :src="svgDataUrl(row.id)"
            :alt="row.label"
            width="40"
            height="40"
          >
          <div v-if="row.count > 0" class="hc-count pixel-number">×{{ row.count }}</div>
        </div>

        <!-- 中：名称 + 速率 -->
        <div class="hc-info">
          <div class="hc-name pixel-number">{{ row.label }}</div>
          <div class="hc-rate pixel-number">{{ row.rate }} 翻/秒</div>
          <div v-if="row.count > 0" class="hc-owned pixel-number">▶ 运行中</div>
        </div>

        <!-- 右：两个独立按钮，足够间距 -->
        <div class="hc-actions">
          <button
            class="nes-btn hc-btn"
            :class="row.affordable ? 'is-success' : ''"
            type="button"
            :disabled="!row.affordable"
            @click="hire(row.id)"
          >
            雇佣<br>
            <span class="hc-btn-cost">{{ row.costStr }}</span>
          </button>
          <button class="nes-btn is-warning hc-btn" type="button">
            升级<br>
            <span class="hc-btn-cost">Lv0</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.helpers-view {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

/* 页头 */
.hv-header {
  margin: 12px 12px 0 !important;
}

.hv-title {
  font-size: 16px;
  font-weight: 700;
  color: #f5a623;
  margin: 0 0 6px;
}

.hv-sub {
  font-size: 16px;
  color: #6b7a99;
  margin: 0;
}

/* 卡片列表：单列，固定间距 */
.hv-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}

/* 单张卡片：Flex 横向布局 */
.hc-card {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 18px;
  padding: 16px 20px !important;
}

.hc-card--owned {
  border-color: #c03000 !important;
}

/* 左：像素画 Avatar */
.hc-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.hc-sprite {
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.hc-count {
  font-size: 16px;
  color: #f5a623;
  font-weight: 700;
}

/* 中：信息区 */
.hc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hc-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.hc-rate {
  font-size: 16px;
  color: var(--text-secondary);
}

.hc-owned {
  font-size: 16px;
  color: var(--positive);
  font-weight: 700;
}

/* 右：按钮区，纵向排列，充足间距 */
.hc-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.hc-btn {
  font-size: 16px !important;
  padding: 8px 16px !important;
  line-height: 1.5;
  text-align: center;
  min-width: 88px;
}

.hc-btn-cost {
  font-size: 16px;
  display: block;
  margin-top: 3px;
}
</style>
