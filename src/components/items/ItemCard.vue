<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxCard } from '@mmt817/pixel-ui'
import {
  canAffordDimension,
  COIN_TYPES,
  costOfDimension,
  dimensionProductionPerSecond,
} from '../../core'
import { formatCash, formatRate } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'
import CooldownButton from '../ui/CooldownButton.vue'

const props = defineProps<{ tier: number }>()

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

const coin = computed(() => COIN_TYPES[props.tier - 1])

const bought = computed(() => state.value.dimensions[props.tier - 1].bought)
const costText = computed(() => {
  void uiVersion.value
  return formatCash(costOfDimension(state.value, props.tier))
})
const rateText = computed(() => {
  void uiVersion.value
  return formatRate(dimensionProductionPerSecond(state.value, props.tier))
})
const affordable = computed(() => {
  void uiVersion.value
  return canAffordDimension(state.value, props.tier)
})
const doubleProgress = computed(() => {
  const b = state.value.dimensions[props.tier - 1].bought
  const coinType = coin.value
  return (b % coinType.doublingEvery) / coinType.doublingEvery
})

function buy(): void {
  store.buyDim(props.tier, 1)
}
</script>

<template>
  <PxCard class="item-card px-card--dark" :class="{ 'is-affordable': affordable }">
    <div class="item-card__icon" aria-hidden="true">
      {{ coin.icon.slice(0, 1).toUpperCase() }}
    </div>
    <div class="item-card__body">
      <div class="item-card__name pixel-number">{{ t(coin.nameKey) }}</div>
      <div class="item-card__meta pixel-number">
        {{ t('table.cost') }} {{ costText }} · {{ t('table.owned') }} {{ bought }}
      </div>
      <div class="item-card__rate pixel-number">{{ rateText }}</div>
      <div class="double-bar" :title="t('table.doubleProgress')">
        <div class="double-bar__fill" :style="{ width: `${doubleProgress * 100}%` }" />
      </div>
    </div>
    <CooldownButton
      :type="affordable ? 'success' : 'base'"
      :disabled="!affordable"
      @click="buy"
    >
      {{ t('table.click') }}
    </CooldownButton>
  </PxCard>
</template>

<style scoped>
.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  --px-border-color: var(--gold);
  cursor: default;
}

.item-card.is-affordable {
  --px-border-color: var(--gold);
}

.item-card__icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--table-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
}

.item-card__body {
  flex: 1;
  min-width: 0;
}

.item-card__name {
  color: var(--text-main);
  font-size: 16px;
}

.item-card__meta {
  color: var(--text-dim);
  font-size: 16px;
}

.item-card__rate {
  color: var(--gold);
  font-size: 16px;
}

.double-bar {
  margin-top: 4px;
  height: 8px;
  background: var(--table-bg-light);
  border: 2px solid var(--gold-dark);
  box-shadow: inset -2px -2px 0 var(--gold-dark);
}

.double-bar__fill {
  height: 100%;
  background: var(--gold);
  box-shadow: inset -2px -2px 0 var(--gold-dark);
}
</style>
