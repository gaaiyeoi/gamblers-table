<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import {
  canAffordUpgrade,
  costOfUpgrade,
  isUpgradeMaxed,
  upgradeDefs,
  upgradeLevel,
  type UpgradeDef,
} from '../core'
import { upgradeSpriteDataUrl } from '../components/upgrades/upgradeSprites'
import { formatCash } from '../core/format'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const { t } = useI18n()

interface UpgradeRow {
  id: string
  icon: string
  name: string
  desc: string
  level: number
  maxLevel: number
  costStr: string
  affordable: boolean
  maxed: boolean
}

const rows = computed((): UpgradeRow[] => {
  void uiVersion.value
  return upgradeDefs().map((def: UpgradeDef) => {
    const level = upgradeLevel(state.value, def.id)
    const maxed = isUpgradeMaxed(state.value, def.id)
    return {
      id: def.id,
      icon: upgradeSpriteDataUrl(def.icon),
      name: t(def.nameKey),
      desc: t(def.descKey),
      level,
      maxLevel: def.maxLevel,
      costStr: maxed ? '' : formatCash(costOfUpgrade(state.value, def.id)),
      affordable: canAffordUpgrade(state.value, def.id),
      maxed,
    }
  })
})

function buy(id: string): void {
  store.buyUpgradeAction(id)
}
</script>

<template>
  <div class="upgrades-view">
    <!-- 页头 -->
    <PxCard round class="uv-header">
      <template #header><p class="title uv-title-cls">{{ t('upgrades.title') }}</p></template>
      <p class="uv-sub pixel-number">{{ t('upgrades.hint') }}</p>
    </PxCard>

    <!-- 升级列表 -->
    <div class="uv-list">
      <PxCard
        v-for="row in rows"
        :key="row.id"
        round
        class="uc-card"
        :class="{ 'uc-card--owned': row.maxed }"
      >
        <!-- 左：16×16 像素画图标 -->
        <template #prepend>
          <div class="uc-icon" :class="{ 'uc-icon--owned': row.maxed }">
            <img class="uc-icon-img" :src="row.icon" :alt="row.name" />
          </div>
        </template>

        <!-- 中：名称 + 描述 + 等级 -->
        <div class="uc-info">
          <div class="uc-name pixel-number">
            {{ row.name }}
            <span v-if="row.maxLevel > 1" class="uc-lvl pixel-number">
              Lv{{ row.level }}/{{ row.maxLevel }}
            </span>
            <span v-else-if="row.maxed" class="uc-owned pixel-number">已购买</span>
          </div>
          <div class="uc-desc pixel-number">{{ row.desc }}</div>
          <!-- 等级圆点 -->
          <div v-if="row.maxLevel > 1" class="uc-dots" aria-hidden="true">
            <span
              v-for="n in row.maxLevel"
              :key="n"
              class="uc-dot"
              :class="{ 'uc-dot--on': n <= row.level }"
            />
          </div>
        </div>

        <!-- 右：购买按钮 -->
        <template #append>
          <PxButton
            :use-throttle="false"
            class="uc-btn"
            :type="row.maxed ? 'base' : row.affordable ? 'success' : 'base'"
            :disabled="row.maxed || !row.affordable"
            @click="buy(row.id)"
          >
            <span class="uc-btn-label">{{ row.maxed ? t('upgrades.maxed') : t('upgrades.buy') }}</span>
            <span v-if="!row.maxed" class="uc-btn-cost">{{ row.costStr }}</span>
          </PxButton>
        </template>
      </PxCard>
    </div>
  </div>
</template>

<style scoped>
.upgrades-view {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

/* 页头 */
.uv-header {
  display: block;
  margin: 12px 12px 0 !important;
}

.uv-title {
  font-size: 16px;
  font-weight: 700;
  color: #f5a623;
  margin: 0 0 6px;
}

.uv-sub {
  font-size: 16px;
  color: #6b7a99;
  margin: 0;
}

/* 升级列表：单列，固定间距 */
.uv-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}

/* 单张卡片 */
.uc-card {
  align-items: center;
  padding: 14px 18px !important;
}

.uc-card--owned {
  --px-border-color: #b8912b !important;
}

/* 左：像素图标 */
.uc-card :deep(.px-card__icon) {
  width: auto;
  margin-right: 14px;
  flex-shrink: 0;
}

.uc-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2daca;
  border: 3px solid var(--text-dim);
  box-shadow: inset -3px -3px 0 rgba(0, 0, 0, 0.08);
}

.uc-icon-img {
  width: 34px;
  height: 34px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  object-fit: contain;
  display: block;
}

.uc-icon--owned {
  border-color: var(--gold);
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
}

/* 中：信息区 */
.uc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uc-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.uc-lvl {
  font-size: 14px;
  color: var(--gold);
  font-weight: 700;
}

.uc-owned {
  font-size: 14px;
  color: var(--positive);
  font-weight: 700;
}

.uc-desc {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 等级圆点 */
.uc-dots {
  display: flex;
  gap: 5px;
}

.uc-dot {
  width: 10px;
  height: 10px;
  border: 2px solid var(--text-dim);
  background: transparent;
}

.uc-dot--on {
  border-color: var(--gold);
  background: var(--gold);
}

/* 右：购买按钮 */
.uc-btn {
  --px-button-size: auto !important;
  height: auto !important;
  flex-direction: column;
  white-space: normal !important;
  line-height: 1.2 !important;
  font-size: 16px !important;
  padding: 8px 16px !important;
  min-width: 96px;
  flex-shrink: 0;
}

.uc-btn-label {
  display: block;
  font-weight: 700;
}

.uc-btn-cost {
  display: block;
  margin-top: 2px;
  line-height: 1.2;
}
</style>
