import Decimal from 'break_infinity.js'

import { challengeOf, CHALLENGES, type ChallengeDef, type ChallengeRule } from '../data/challenges'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'

/**
 * 规则颠覆型挑战系统（机制 3）。
 * 挑战不修改基础配置，而是在购买/生产/时间推进边界注入规则 modifier。
 */

export function activeChallenge(state: GameState): ChallengeDef | null {
  return state.challenge.activeId === null ? null : challengeOf(state.challenge.activeId)
}

export function startChallenge(state: GameState, challengeId: string): boolean {
  if (state.challenge.activeId !== null) return false
  const def = challengeOf(challengeId)
  state.challenge.activeId = def.id
  state.challenge.opposition = new Decimal(0)
  EventHub.logic.emit(GAME_EVENT.CHALLENGE_STARTED, { challengeId: def.id })
  return true
}

export function isChallengeCompleted(state: GameState, challengeId: string): boolean {
  return state.challenge.completedIds.includes(challengeId)
}

/** 停止当前挑战，不发放完成奖励。 */
export function stopChallenge(state: GameState): void {
  state.challenge.activeId = null
  state.challenge.opposition = new Decimal(0)
}

/** 维度封禁：购买或生产前调用。 */
export function isDimensionBanned(state: GameState, tier: number): boolean {
  const def = activeChallenge(state)
  if (def === null) return false
  return def.rules.some((rule) => rule.type === 'banDimensions' && rule.tiers.includes(tier))
}

/** 类型守卫：判断规则是否为反向扣减。 */
function isReverseRule(rule: ChallengeRule): rule is Extract<ChallengeRule, { type: 'reversePurchase' }> {
  return rule.type === 'reversePurchase'
}

/** 类型守卫：判断规则是否为动态对抗。 */
function isOppositionRule(rule: ChallengeRule): rule is Extract<ChallengeRule, { type: 'opposition' }> {
  return rule.type === 'opposition'
}

/** 反向扣减：购买目标维度时从高阶维度 amount 扣除额外资源。 */
export function reversePurchaseRule(state: GameState, tier: number, count: number): ChallengeRule | null {
  const def = activeChallenge(state)
  if (def === null) return null
  const rule = def.rules.filter(isReverseRule).find((item) => item.sourceTier > tier)
  if (rule === undefined) return null
  const source = state.dimensions[rule.sourceTier - 1]
  if (source === undefined || source.amount.lt(rule.ratio * count)) return rule
  return rule
}

/** 执行反向扣减；返回是否成功。 */
export function applyReversePurchase(state: GameState, tier: number, count: number): boolean {
  const def = activeChallenge(state)
  if (def === null) return true
  const rule = def.rules.filter(isReverseRule).find((item) => item.sourceTier > tier)
  if (rule === undefined) return true
  const source = state.dimensions[rule.sourceTier - 1]
  const cost = new Decimal(rule.ratio * count)
  if (source === undefined || source.amount.lt(cost)) return false
  source.amount = source.amount.sub(cost)
  return true
}

/**
 * 处理动态对抗资源：opposition 以每秒增长；超过 cash × failureRatio 则失败并重置本轮。
 * 达到目标 cash 则完成挑战并获得机制级 unlockFlag。
 */
export function tickChallenge(state: GameState, dtMs: number): void {
  const def = activeChallenge(state)
  if (def === null) return

  const oppositionRule = def.rules.find(isOppositionRule)
  if (oppositionRule !== undefined) {
    state.challenge.opposition = state.challenge.opposition.add(oppositionRule.growthPerSec.mul(dtMs / 1000))
    const failureLimit = state.cash.mul(oppositionRule.failureRatio)
    if (state.challenge.opposition.gt(failureLimit)) {
      state.challenge.failures += 1
      state.challenge.activeId = null
      state.challenge.opposition = new Decimal(0)
      resetChallengeScope(state)
      EventHub.logic.emit(GAME_EVENT.CHALLENGE_FAILED, { challengeId: def.id })
      return
    }
  }

  if (state.cash.gte(def.target)) {
    state.challenge.activeId = null
    if (!state.challenge.completedIds.includes(def.id)) {
      state.challenge.completedIds.push(def.id)
    }
    if (!state.unlockFlags.includes(def.rewardFlag)) {
      state.unlockFlags.push(def.rewardFlag)
    }
    state.challenge.opposition = new Decimal(0)
    EventHub.logic.emit(GAME_EVENT.CHALLENGE_COMPLETED, {
      challengeId: def.id,
      rewardFlag: def.rewardFlag,
    })
  }
}

/** 失败重置：只清本轮可再生进度，高阶货币/收藏/购买阶梯保留。 */
function resetChallengeScope(state: GameState): void {
  state.cash = new Decimal(0)
  for (const dim of state.dimensions) dim.amount = new Decimal(0)
  for (const helper of Object.values(state.helpers)) helper.count = 0
}

/** 是否已解锁批量购买等挑战奖励。 */
export function hasChallengeReward(state: GameState, rewardFlag: string): boolean {
  return state.unlockFlags.includes(rewardFlag)
}

export { CHALLENGES }
