<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import { HELPER_TYPES, canAffordHelper, costOfHelper, isHelperUnlocked, type HelperType } from '../core'
import { formatCash } from '../core/format'
import { helperSpriteDataUrl } from '../components/helpers/helperSprites'
import { useGameStore } from '../stores/gameStore'
import { useSound } from '../composables/useSound'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const { playClick } = useSound()

interface HelperRow {
  id: string; label: string; rate: string; body: string; head: string
  count: number; costStr: string; affordable: boolean; unlocked: boolean; unlockHint: string
}

/** 生成助手的解锁条件文案（无解锁条件的助手返回空串）。 */
function unlockHint(h: HelperType): string {
  const goal = h.unlockGoal
  if (goal === undefined) return ''
  switch (goal.kind) {
    case 'totalFlips':
      return `累计抛币 ${goal.target.toLocaleString()} 解锁`
    case 'totalEarned':
      return `累计赚取 ${goal.target.toLocaleString()} 解锁`
    case 'totalSkullTokensEarned':
      return `累计 ${goal.target} 枚骷髅币解锁`
    default:
      return ''
  }
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
      unlocked: isHelperUnlocked(state.value, h.id),
      unlockHint: unlockHint(h),
    }
  })
})

function hire(id: string): void { store.hireHelperAction(id, 1) }
</script>

<template>
  <div class="helpers-view">
    <!-- 页头 -->
    <PxCard round class="hv-header">
      <template #header><p class="title hv-title-cls">助手雇佣</p></template>
      <p class="hv-sub pixel-number">雇佣自动翻硬币的帮手，提升每秒翻转效率。</p>
    </PxCard>

    <!-- 单列通栏卡片 -->
    <div class="hv-list">
      <PxCard
        v-for="row in rows"
        :key="row.id"
        round
        class="hc-card"
        :class="{ 'hc-card--owned': row.count > 0 }"
      >
        <!-- 左：prepend —— 16×16 像素画 SVG 头像 -->
        <template #prepend>
          <div class="hc-avatar">
            <img
              class="hc-sprite"
              :src="helperSpriteDataUrl(row.id)"
              :alt="row.label"
              width="40"
              height="40"
            >
            <div v-if="row.count > 0" class="hc-count pixel-number">×{{ row.count }}</div>
          </div>
        </template>

        <!-- 中：default —— 名称 + 速率 + 状态 -->
        <div class="hc-info">
          <div class="hc-name pixel-number">{{ row.label }}</div>
          <div class="hc-rate pixel-number">{{ row.rate }} 翻/秒</div>
          <div v-if="!row.unlocked" class="hc-locked pixel-number">🔒 未解锁 · {{ row.unlockHint }}</div>
          <div v-else-if="row.count > 0" class="hc-owned pixel-number">▶ 运行中</div>
        </div>

        <!-- 右：append —— 两个独立按钮 -->
        <template #append>
          <div class="hc-actions">
            <PxButton
              :use-throttle="false"
              class="hc-btn"
              :type="row.affordable ? 'success' : 'base'"
              :disabled="!row.affordable || !row.unlocked"
              @click="hire(row.id)"
            >
              <span class="hc-btn-label">雇佣</span>
              <span class="hc-btn-cost">{{ row.costStr }}</span>
            </PxButton>
            <PxButton :use-throttle="false" type="warning" class="hc-btn" @click="playClick">
              <span class="hc-btn-label">升级</span>
              <span class="hc-btn-cost">Lv0</span>
            </PxButton>
          </div>
        </template>
      </PxCard>
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
  display: block;
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

/* 单张卡片：依赖 PxCard 内置 Flex 横向布局（icon | content | append） */
.hc-card {
  align-items: center;
  padding: 14px 18px !important;
}

/* 让 prepend 区容纳头像（默认 .px-card__icon 宽仅 24px） */
.hc-card :deep(.px-card__icon) {
  width: auto;
  margin-right: 14px;
  flex-shrink: 0;
}

.hc-card--owned {
  --px-border-color: #b8912b !important;
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

.hc-locked {
  font-size: 16px;
  color: var(--text-secondary);
  font-weight: 700;
}

/* 右：按钮区，纵向排列，靠右对齐，避免按钮被 stretch 到全宽 */
.hc-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

/* 覆盖 px-button 固定高度/nowrap，让两行内容在按钮内自适应居中，不再溢出 */
.hc-btn {
  --px-button-size: auto !important;
  height: auto !important;
  flex-direction: column;
  white-space: normal !important;
  line-height: 1.2 !important;
  font-size: 16px !important;
  padding: 8px 16px !important;
  min-width: 96px;
}

.hc-btn-label {
  display: block;
  font-weight: 700;
}

.hc-btn-cost {
  display: block;
  margin-top: 2px;
  line-height: 1.2;
}
</style>
