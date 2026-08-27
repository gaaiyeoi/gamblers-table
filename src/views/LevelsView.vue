<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PxButton, PxCard } from '@mmt817/pixel-ui'
import {
  LEVEL_COUNT,
  LEVELS,
  goalSatisfied,
  type LevelGoal,
  type LevelReward,
} from '../core'
import { formatCash, formatNumber } from '../core/format'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

/** 关卡完成数（0 开始）。 */
const completedCount = computed(() => {
  void uiVersion.value
  return state.value.levels.completed
})

/** 关卡状态：completed / inProgress / locked。 */
function levelStatus(index: number): 'completed' | 'inProgress' | 'locked' {
  const completed = completedCount.value
  if (index < completed) return 'completed'
  if (index === completed) return 'inProgress'
  return 'locked'
}

/** 当前进行中的关卡是否已达成目标（含已暂缓）。 */
const currentGoalMet = computed(() => {
  void uiVersion.value
  const next = LEVELS[state.value.levels.completed]
  if (next === undefined) return false
  return goalSatisfied(state.value, next.goal)
})

/** 处理过关：应用奖励并进入下一关。 */
function onConfirmLevel(): void {
  const id = store.confirmLevel()
  if (id !== null) {
    // confirmLevel 内部已触发 uiVersion++，无需额外处理
  }
}

/** 目标文案：金额类用 $ 格式，计数类用整数格式。 */
function goalText(goal: LevelGoal): string {
  const label = t(`levels.goals.${goal.type}`)
  const value = goal.type === 'cash' || goal.type === 'totalEarned'
    ? formatCash(goal.target)
    : formatNumber(goal.target)
  return `${label} ${value}`
}

/** 奖励文案。 */
function rewardText(reward: LevelReward): string {
  if (reward.type === 'clickMult') return `${t('levels.rewards.clickMult')} ×${reward.value}`
  if (reward.type === 'incomeMult') return `${t('levels.rewards.incomeMult')} ×${reward.value}`
  return `${t('levels.rewards.flag')} ${t(`levels.flags.${reward.flag}`)}`
}
</script>

<template>
  <div class="levels-view">
    <h1 class="pixel-number text-gold">{{ t('levels.title') }}</h1>

    <!-- 任务关卡主线 -->
    <PxCard round class="level-progress px-card--dark">
      <span class="pixel-number text-gold">
        {{ t('levels.progress') }}：{{ completedCount }} / {{ LEVEL_COUNT }}
      </span>
    </PxCard>

    <div class="level-cards">
      <PxCard
        v-for="(level, index) in LEVELS"
        :key="level.id"
        class="level-card px-card--dark"
        :class="`is-${levelStatus(index)}`"
      >
        <div class="level-card__head">
          <span class="pixel-number text-gold">{{ t('levels.level', { n: index + 1 }) }}</span>
          <span class="level-card__status pixel-number" :class="`is-${levelStatus(index)}`">
            {{ t(`levels.${levelStatus(index)}`) }}
          </span>
        </div>
        <div class="level-card__goal pixel-number">
          {{ t('levels.goal') }}：{{ goalText(level.goal) }}
        </div>
        <div class="level-card__reward pixel-number">
          {{ t('levels.reward') }}：{{ rewardText(level.reward) }}
        </div>
        <PxButton
          v-if="index === state.levels.completed && currentGoalMet"
          :use-throttle="false"
          type="warning"
          class="level-card__confirm"
          @click="onConfirmLevel"
        >
          {{ t('levels.confirmYes') }}
        </PxButton>
      </PxCard>
    </div>
  </div>
</template>

<style scoped>
.levels-view {
  height: 100%;
  overflow-y: auto;
  padding: 8px 16px;
}

.level-progress {
  display: block;
  --px-border-color: var(--gold);
  padding: 12px;
  margin: 16px 0;
}

.level-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.level-card {
  display: block;
  --px-border-color: var(--gold);
  padding: 12px;
}

.level-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.level-card__goal {
  color: var(--text-main);
  font-size: 15px;
  margin-bottom: 4px;
}

.level-card__reward {
  color: var(--text-dim);
  font-size: 15px;
}

.level-card__confirm {
  margin-top: 10px;
  width: 100%;
}

.level-card__status.is-completed {
  color: var(--functional-green);
}

.level-card__status.is-inProgress {
  color: var(--gold);
}

.level-card__status.is-locked {
  color: var(--text-dim);
}

.level-card.is-locked {
  opacity: 0.6;
}
</style>
