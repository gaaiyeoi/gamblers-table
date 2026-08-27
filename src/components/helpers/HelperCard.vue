<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxCard } from '@mmt817/pixel-ui'
import { canAffordHelper, costOfHelper, helperTypeOf } from '../../core'
import { formatCash } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'
import CooldownButton from '../ui/CooldownButton.vue'

const props = defineProps<{ helperId: string }>()

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

const helper = computed(() => helperTypeOf(props.helperId))
const owned = computed(() => state.value.helpers[props.helperId]?.count ?? 0)
const hat = computed(() => state.value.helpers[props.helperId]?.hat ?? '')
const costText = computed(() => {
  void uiVersion.value
  return formatCash(costOfHelper(state.value, props.helperId))
})
const affordable = computed(() => {
  void uiVersion.value
  return canAffordHelper(state.value, props.helperId)
})
const iconLetter = computed(() => helper.value.icon.slice(0, 1).toUpperCase())

function hire(): void {
  store.hireHelperAction(props.helperId, 1)
}
</script>

<template>
  <PxCard class="helper-card px-card--dark" :class="{ 'is-affordable': affordable }">
    <div class="helper-card__icon" aria-hidden="true">{{ iconLetter }}</div>
    <div class="helper-card__body">
      <div class="helper-card__name pixel-number">{{ t(helper.nameKey) }}</div>
      <div class="helper-card__meta pixel-number">
        {{ t('helpers.flipsPerSec') }} {{ helper.flipsPerSec }} ·
        {{ t('table.cost') }} {{ costText }}
      </div>
      <div class="helper-card__hat pixel-number">
        {{ hat ? t(`hats.${hat.replace('hat_', '')}`) : t('helpers.noHat') }}
      </div>
    </div>
    <CooldownButton
      :type="affordable ? 'success' : 'base'"
      :disabled="!affordable"
      @click="hire"
    >
      {{ t('helpers.hire') }} · {{ owned }}
    </CooldownButton>
  </PxCard>
</template>

<style scoped>
.helper-card {
  --px-border-color: var(--gold);
}

/*
 * PxCard 内部包装是 .px-card__content（flex-direction: column），
 * 这里强制让 default slot 内的子元素横向排列。
 */
.helper-card :deep(.px-card__body) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0;
}

.helper-card__icon {
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
  flex-shrink: 0;
}

.helper-card__body {
  flex: 1;
  min-width: 0;
}

.helper-card__name {
  color: var(--text-main);
  font-size: 16px;
}

.helper-card__meta {
  color: var(--text-dim);
  font-size: 16px;
}

.helper-card__hat {
  color: var(--gold);
  font-size: 16px;
}
</style>
