<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { CHALLENGES, isChallengeCompleted } from '../core'
import { formatNumber } from '../core/format'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

const activeId = computed(() => state.value.challenge.activeId)
const opposition = computed(() => {
  void uiVersion.value
  return state.value.challenge.opposition
})

/** 对抗进度：opposition / (cash × ratio)。 */
function oppositionProgress(): number {
  const def = CHALLENGES.find((item) => item.id === state.value.challenge.activeId)
  if (def === undefined) return 0
  const rule = def.rules.find((item) => item.type === 'opposition')
  if (rule?.type !== 'opposition') return 0
  const limit = state.value.cash.mul(rule.failureRatio)
  if (limit.lte(0)) return 0
  const ratio = state.value.challenge.opposition.div(limit).toNumber()
  return Math.min(1, Math.max(0, ratio))
}

function statusOf(challengeId: string): 'active' | 'completed' | 'idle' {
  if (activeId.value === challengeId) return 'active'
  if (isChallengeCompleted(state.value, challengeId)) return 'completed'
  return 'idle'
}

function start(challengeId: string): void {
  store.doStartChallenge(challengeId)
}
</script>

<template>
  <div class="challenges-view">
    <h1 class="pixel-number text-gold">{{ t('tabs.challenges') }}</h1>

    <div class="challenge-cards">
      <div v-for="challenge in CHALLENGES" :key="challenge.id" class="challenge-card nes-container is-dark">
        <div class="challenge-card__head">
          <span class="pixel-number text-gold">{{ t(challenge.nameKey) }}</span>
          <span
            class="challenge-card__status pixel-number"
            :class="`is-${statusOf(challenge.id)}`"
          >
            {{ t(`challenges.${statusOf(challenge.id)}`) }}
          </span>
        </div>
        <p class="challenge-card__desc pixel-number">{{ t(challenge.descriptionKey) }}</p>
        <div class="challenge-card__meta pixel-number">
          {{ t('challenges.target') }}：{{ formatNumber(challenge.target) }} ·
          {{ t('challenges.reward') }}：{{ challenge.rewardFlag }}
        </div>
        <button
          v-if="statusOf(challenge.id) === 'active'"
          class="nes-btn is-error"
          type="button"
          @click="store.doStopChallenge()"
        >
          {{ t('challenges.stop') }}
        </button>
        <button
          v-else
          class="nes-btn is-primary"
          type="button"
          :disabled="statusOf(challenge.id) === 'completed'"
          @click="start(challenge.id)"
        >
          {{ t('challenges.start') }}
        </button>
      </div>
    </div>

    <!-- 对抗资源进度（进行中挑战） -->
    <div v-if="activeId !== null" class="opposition nes-container is-rounded">
      <span class="pixel-number">{{ t('challenges.opposition') }}：{{ formatNumber(opposition) }}</span>
      <div class="opposition__bar">
        <div class="opposition__fill" :style="{ width: `${oppositionProgress() * 100}%` }" />
      </div>
    </div>

    <!-- 自动化 DSL 脚本 -->
    <section class="automator nes-container is-dark">
      <div class="automator__head">
        <h2 class="pixel-number text-gold">{{ t('automator.script') }}</h2>
        <button
          class="nes-btn"
          :class="{ 'is-success': state.automator.enabled }"
          type="button"
          @click="store.setAutomator(!state.automator.enabled)"
        >
          {{ state.automator.enabled ? t('automator.disable') : t('automator.enable') }}
        </button>
      </div>
      <textarea
        v-model="state.automator.script"
        class="automator__script pixel-number"
        :placeholder="t('automator.placeholder')"
        rows="4"
      />
    </section>
  </div>
</template>

<style scoped>
.challenges-view {
  height: 100%;
  overflow-y: auto;
  padding: 8px 16px;
}

.challenge-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.challenge-card {
  border-color: var(--gold);
  padding: 12px;
}

.challenge-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.challenge-card__status.is-active {
  color: var(--gold);
}

.challenge-card__status.is-completed {
  color: var(--functional-green);
}

.challenge-card__desc {
  color: var(--text-main);
  font-size: 16px;
  margin-bottom: 6px;
}

.challenge-card__meta {
  color: var(--text-dim);
  font-size: 16px;
  margin-bottom: 8px;
}

.opposition {
  border-color: var(--gold);
  padding: 12px;
  margin-bottom: 16px;
}

.opposition__bar {
  height: 10px;
  background: var(--table-bg-light);
  border: 1px solid var(--gold-dark);
  margin-top: 8px;
}

.opposition__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--functional-red), var(--gold));
  transition: width 0.2s ease;
}

.automator {
  border-color: var(--gold);
  padding: 12px;
}

.automator__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.automator__script {
  width: 100%;
  background: var(--table-bg-light);
  border: 2px solid var(--gold-dark);
  color: var(--text-main);
  padding: 8px;
  resize: vertical;
}
</style>
