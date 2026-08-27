<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { PxCard } from '@mmt817/pixel-ui'
import { COIN_TYPES } from '../../core'
import ItemCard from './ItemCard.vue'

const { t } = useI18n()
</script>

<template>
  <PxCard class="items-panel px-card--dark">
    <h2 class="items-panel__title pixel-number">{{ t('table.items') }}</h2>
    <div class="items-panel__list">
      <ItemCard v-for="(coin, index) in COIN_TYPES" :key="coin.id" :tier="index + 1" />
    </div>
  </PxCard>
</template>

<style scoped>
.items-panel {
  display: block;
  width: 320px;
  padding: 12px;
  --px-border-color: var(--gold);
  overflow-y: auto;
  max-height: 100%;
}

.items-panel__title {
  color: var(--gold);
  font-size: 16px;
  margin-bottom: 12px;
  text-align: center;
}

.items-panel__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
