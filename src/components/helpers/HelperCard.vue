<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { canAffordHelper, costOfHelper, helperTypeOf } from '../../core'
import { formatCash } from '../../core/format'
import { useGameStore } from '../../stores/gameStore'

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
  <div class="helper-card nes-container is-dark" :class="{ 'is-affordable': affordable }">
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
    <button
      class="nes-btn"
      :class="{ 'is-success': affordable }"
      type="button"
      :disabled="!affordable"
      @click="hire"
    >
      {{ t('helpers.hire') }} · {{ owned }}
    </button>
  </div>
</template>

<style scoped>
.helper-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-color: var(--gold);
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
