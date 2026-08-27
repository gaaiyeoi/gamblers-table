<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import { PRESTIGE_TIERS, talentsByBranch, type TalentBranch } from '../core'
import { formatNumber } from '../core/format'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

const branches = computed(() => talentsByBranch())
const branchLabel: Record<TalentBranch, string> = {
  offline: 'Offline',
  online: 'Online',
  dimension: 'Dimension',
}

const reputation = computed(() => {
  void uiVersion.value
  return formatNumber(state.value.prestige.currency.reputation ?? state.value.cash)
})

function tierProgress(tier: number): number {
  const def = PRESTIGE_TIERS[tier - 1]!
  const cash = state.value.cash
  if (cash.lte(def.threshold)) return 0
  // 进度 = (log10(cash) - log10(threshold) + 1) 归一化到 0~1
  const progress = (cash.log10() - def.threshold.log10() + 1) / 10
  return Math.min(1, Math.max(0, progress))
}

function tierReward(tier: number): string {
  void uiVersion.value
  return formatNumber(store.previewPrestige(tier))
}

function isUnlocked(talentId: string): boolean {
  return state.value.talents.includes(talentId)
}
</script>

<template>
  <div class="ascension-view">
    <!-- Tier 1-4 转生卡片 -->
    <section class="ascension-section">
      <h1 class="pixel-number text-gold">{{ t('tabs.ascension') }}</h1>
      <p class="ascension-hint pixel-number">{{ t('prestige.resetHint') }}</p>
      <div class="prestige-cards">
        <PxCard
          v-for="tierDef in PRESTIGE_TIERS"
          :key="tierDef.tier"
          class="prestige-card px-card--dark"
        >
          <div class="prestige-card__head pixel-number">
            <span>{{ t(tierDef.nameKey) }}</span>
            <span class="pixel-number text-gold">{{ t('prestige.reputation') }}：{{ reputation }}</span>
          </div>
          <div class="prestige-bar">
            <div class="prestige-bar__fill" :style="{ width: `${tierProgress(tierDef.tier) * 100}%` }" />
          </div>
          <div class="prestige-card__meta pixel-number">
            {{ t('prestige.reward') }}：{{ tierReward(tierDef.tier) }} · {{ t('prestige.threshold') }}：
            {{ formatNumber(tierDef.threshold) }}
          </div>
          <PxButton
            :use-throttle="false"
            type="success"
            :disabled="!store.state.cash.gte(tierDef.threshold)"
            @click="store.doPrestige(tierDef.tier)"
          >
            {{ t('prestige.reset') }}
          </PxButton>
        </PxCard>
      </div>
    </section>

    <!-- 天赋树（紫色星空背景 + 三系） -->
    <PxCard round class="talent-section">
      <div class="talent-section__head">
        <h2 class="pixel-number text-gold">{{ t('game.skillTree') }}</h2>
        <span class="pixel-number">
          {{ t('talents.points') }}：{{ store.state.talents.length }}
        </span>
        <PxButton :use-throttle="false" type="warning" @click="store.doFreeResetTalents()">
          {{ t('talents.reset') }}
        </PxButton>
      </div>
      <div class="talent-tree">
        <div v-for="(list, branch) in branches" :key="branch" class="talent-branch">
          <h3 class="talent-branch__title pixel-number">{{ branchLabel[branch as TalentBranch] }}</h3>
          <div class="talent-branch__nodes">
            <button
              v-for="talent in list"
              :key="talent.id"
              class="talent-node"
              :class="{ 'is-owned': isUnlocked(talent.id) }"
              type="button"
              :title="`${t('talents.pointsLabel')} ${talent.cost}`"
              @click="store.doSpendTalent(talent.id)"
            >
              {{ isUnlocked(talent.id) ? 'X' : '' }}
            </button>
          </div>
          <div class="talent-branch__names pixel-number">
            <span v-for="talent in list" :key="talent.id">{{ t(talent.nameKey) }}</span>
          </div>
        </div>
      </div>
    </PxCard>
  </div>
</template>

<style scoped>
.ascension-view {
  height: 100%;
  overflow-y: auto;
  padding: 8px 16px;
}

.ascension-hint {
  color: var(--text-dim);
  font-size: 16px;
  margin-bottom: 12px;
}

.prestige-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.prestige-card {
  display: block;
  --px-border-color: var(--gold);
  padding: 12px;
}

.prestige-card__head {
  display: flex;
  justify-content: space-between;
  color: var(--text-main);
  font-size: 16px;
  margin-bottom: 8px;
}

.prestige-bar {
  height: 12px;
  background: var(--table-bg-light);
  border: 3px solid var(--gold-dark);
  box-shadow: inset -2px -2px 0 var(--gold-dark);
  margin-bottom: 8px;
}

.prestige-bar__fill {
  height: 100%;
  background: var(--gold);
  box-shadow: inset -2px -2px 0 var(--gold-dark);
}

.prestige-card__meta {
  color: var(--text-dim);
  font-size: 16px;
  margin-bottom: 8px;
}

/* 天赋树：浅紫星空背景 */
.talent-section {
  /* 自定义渐变背景会覆盖 pixelbox paint，故单独补一条像素边框 */
  background:
    radial-gradient(circle at 30% 20%, rgba(147, 51, 234, 0.10), transparent 60%),
    radial-gradient(circle at 70% 60%, rgba(236, 72, 153, 0.10), transparent 60%),
    #f0ebe0;
  border: 4px solid var(--gold);
  --px-border-color: var(--gold);
  display: block;
  padding: 16px;
}

.talent-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.talent-tree {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}

.talent-branch {
  flex: 1;
  text-align: center;
}

.talent-branch__title {
  color: var(--gold);
  font-size: 16px;
  margin-bottom: 12px;
}

.talent-branch__nodes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.talent-node {
  width: 44px;
  height: 44px;
  border: 3px solid var(--text-dim);
  background: #e2daca;
  color: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.talent-node:hover {
  border-color: var(--gold);
}

.talent-node.is-owned {
  border-color: var(--gold);
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: #212121;
  font-weight: 700;
}

.talent-branch__names {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  color: var(--text-dim);
  font-size: 16px;
}
</style>
