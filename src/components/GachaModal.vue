<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, X } from 'lucide-vue-next'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import { HAT_POOL, hatOf, type HatRarity } from '../core'
import { useGameStore } from '../stores/gameStore'

const emit = defineEmits<{ close: [] }>()

const store = useGameStore()
const { t } = useI18n()
const { state } = storeToRefs(store)

const lastResult = ref<string[]>([])
const skullTokens = computed(() => state.value.skullTokens)
const collection = computed(() => state.value.gacha.collection)

/** 稀有度 → 像素色。 */
const rarityColor: Record<HatRarity, string> = {
  common: '#8E9BAE',
  rare: '#3DDC84',
  epic: '#B8860B',
  legendary: 'var(--gold)',
}

function pull(): void {
  const results = store.doGacha(1)
  if (results === null) {
    console.warn(t('gacha.notEnoughSkulls'))
    return
  }
  lastResult.value = results.map((hat) => hat.id)
}

function hatColor(hatId: string): string {
  return rarityColor[hatOf(hatId).rarity]
}
</script>

<template>
  <Teleport to="body">
    <div class="gacha-overlay" role="dialog" aria-modal="true">
      <PxCard class="gacha px-card--dark">
        <div class="gacha__header">
          <h2 class="gacha__title pixel-number text-gold">{{ t('table.gacha') }}</h2>
          <PxButton type="warning" aria-label="close" @click="emit('close')">
            <X :size="14" />
          </PxButton>
        </div>

        <PxCard round class="gacha__machine" aria-hidden="true">
          <Sparkles class="gacha__sparkle" :size="40" />
          <span class="gacha__skull pixel-number">{{ skullTokens }}</span>
        </PxCard>

        <PxButton type="primary" class="gacha__pull" @click="pull">
          {{ t('gacha.pull') }}
        </PxButton>

        <div v-if="lastResult.length > 0" class="gacha__result">
          <span class="pixel-number">{{ t('gacha.result') }}：</span>
          <span v-for="hatId in lastResult" :key="hatId" class="gacha__result-hat" :style="{ color: hatColor(hatId) }">
            {{ t(`hats.${hatId.replace('hat_', '')}`) }}
          </span>
        </div>

        <div class="gacha__collection">
          <h3 class="pixel-number">{{ t('gacha.collection') }}（{{ collection.length }}/{{ HAT_POOL.length }}）</h3>
          <div v-if="collection.length === 0" class="gacha__empty pixel-number">
            {{ t('gacha.noCollection') }}
          </div>
          <div v-else class="gacha__collection-list">
            <span
              v-for="hatId in collection"
              :key="hatId"
              class="gacha__collection-item"
              :style="{ borderColor: hatColor(hatId) }"
            >
              {{ t(`hats.${hatId.replace('hat_', '')}`) }}
            </span>
          </div>
        </div>
      </PxCard>
    </div>
  </Teleport>
</template>

<style scoped>
.gacha-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.gacha {
  display: block;
  width: 420px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
  --px-border-color: var(--gold);
}

.gacha__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.gacha__machine {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  --px-bg-color: var(--table-bg-light);
  --px-border-color: var(--gold);
  margin-bottom: 12px;
}

.gacha__sparkle {
  color: var(--gold);
}

.gacha__skull {
  font-size: 24px;
  color: var(--text-dim);
}

.gacha__pull {
  width: 100%;
  margin-bottom: 12px;
}

.gacha__result {
  color: var(--gold);
  margin-bottom: 12px;
}

.gacha__result-hat {
  font-weight: 700;
}

.gacha__collection {
  border-top: 2px solid var(--gold-dark);
  padding-top: 12px;
}

.gacha__collection h3 {
  color: var(--text-dim);
  font-size: 16px;
  margin-bottom: 8px;
}

.gacha__collection-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gacha__collection-item {
  border: 2px solid;
  padding: 4px 8px;
  font-size: 16px;
}

.gacha__empty {
  color: var(--text-dim);
  font-size: 16px;
}
</style>
