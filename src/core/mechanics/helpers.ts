import Decimal from 'break_infinity.js'

import { HELPER_TYPES, helperTypeOf, type HelperUnlockGoal } from '../data/helperTypes'
import { Lazy, GameCache } from '../cache'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { D1 } from '../math'
import type { GameState } from '../state/gameState'
import { flipCoin, type FlipResult } from './coins'

/**
 * 助手机制：雇佣助手 → 助手每秒自动抛硬币 → 产出 + 骷髅代币。
 * 助手购买的 cost 与维度同模式（几何级数递增）。
 * 除新手助手外，每个助手都有基于累计统计的解锁条件（见 HELPER_TYPES）。
 */

/** 判断某个助手的累计统计解锁目标是否已达成。 */
function helperUnlockSatisfied(state: GameState, goal: HelperUnlockGoal): boolean {
  switch (goal.kind) {
    case 'totalFlips':
      return state.stats.totalFlips >= goal.target
    case 'totalEarned':
      return state.stats.totalEarned.gte(goal.target)
    case 'totalSkullTokensEarned':
      return state.stats.totalSkullTokensEarned >= goal.target
    default:
      return false
  }
}

/** 助手是否已解锁（无解锁条件一律视为已解锁）。 */
export function isHelperUnlocked(state: GameState, helperId: string): boolean {
  const helper = helperTypeOf(helperId)
  if (helper.unlockFlag === undefined) return true
  return state.unlockFlags.includes(helper.unlockFlag)
}

/**
 * 检查并推进助手解锁：遍历所有助手，达成累计统计目标即写入对应 unlockFlag。
 * 每帧随 checkLevels 一起调用。
 */
export function checkHelperUnlocks(state: GameState): void {
  for (const helper of HELPER_TYPES) {
    if (helper.unlockFlag === undefined || helper.unlockGoal === undefined) continue
    if (state.unlockFlags.includes(helper.unlockFlag)) continue
    if (!helperUnlockSatisfied(state, helper.unlockGoal)) continue
    state.unlockFlags.push(helper.unlockFlag)
    EventHub.logic.emit(GAME_EVENT.HELPER_UNLOCKED, { helperId: helper.id })
  }
}

/** 单个助手雇佣成本。 */
export function costOfHelper(state: GameState, helperId: string, count = 1): Decimal {
  const helper = helperTypeOf(helperId)
  const current = state.helpers[helperId]?.count ?? 0

  // 固定成本助手（如新手助手）：第 1 只用 baseCost（特价），第 2 只起固定为 fixedCost。
  if (helper.fixedCost !== undefined) {
    let total = new Decimal(0)
    for (let i = 1; i <= count; i += 1) {
      const nth = current + i
      total = total.add(nth === 1 ? helper.baseCost : helper.fixedCost)
    }
    return total
  }

  const first = helper.baseCost.mul(helper.costGrowth.pow(current))
  if (count <= 1) return first
  return first
    .mul(Decimal.pow(helper.costGrowth, count).sub(1))
    .div(helper.costGrowth.sub(1))
}

export function canAffordHelper(state: GameState, helperId: string, count = 1): boolean {
  return state.cash.gte(costOfHelper(state, helperId, count))
}

/** 雇佣助手：扣现金、增加 count、赋予默认帽子（null 表示未戴帽）。 */
export function hireHelper(state: GameState, helperId: string, count = 1): boolean {
  const helper = helperTypeOf(helperId)
  // 门控：未解锁的助手不可雇佣。
  if (!isHelperUnlocked(state, helperId)) return false
  if (!canAffordHelper(state, helperId, count)) return false
  const cost = costOfHelper(state, helperId, count)
  state.cash = state.cash.sub(cost)
  const existing = state.helpers[helperId]
  if (existing === undefined) {
    state.helpers[helperId] = { count, hat: '' }
  } else {
    existing.count += count
  }
  state.stats.totalHelpersHired += count
  EventHub.logic.emit(GAME_EVENT.HELPER_HIRED, { helperId, count })
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return true
}

/** 助手每秒总抛硬币速率（所有助手叠加）。 */
export function totalFlipsPerSec(state: GameState): Decimal {
  let total = new Decimal(0)
  for (const helper of HELPER_TYPES) {
    const owned = state.helpers[helper.id]
    if (owned === undefined || owned.count === 0) continue
    total = total.add(helper.flipsPerSec.times(owned.count))
  }
  return total
}

/**
 * 批量结算 n 次抛硬币（可被可视化层或 tickHelpers 复用）。
 * 返回每次翻转的结果，便于逐枚展示。
 * multiplier 透传给每次 flipCoin（助手自动抛币应传 incomeMultiplier）。
 */
export function flipCoins(
  state: GameState,
  count: number,
  rng: () => number = Math.random,
  multiplier: Decimal = D1,
): FlipResult[] {
  const results: FlipResult[] = []
  for (let i = 0; i < count; i += 1) {
    results.push(flipCoin(state, rng, multiplier))
  }
  return results
}

/**
 * 助手 tick：按 dt 内应抛硬币次数逐次执行 flipCoin。
 * 频率较高时累计整数次执行，避免浮点误差累积。
 */
export function tickHelpers(
  state: GameState,
  dtMs: number,
  rng: () => number = Math.random,
  multiplier: Decimal = D1,
): void {
  const flipsThisTick = totalFlipsPerSec(state).mul(dtMs / 1000)
  const wholeFlips = Decimal.floor(flipsThisTick).toNumber()
  const fractional = flipsThisTick.sub(wholeFlips).toNumber()
  flipCoins(state, wholeFlips, rng, multiplier)
  // 概率累积（分数部分用于下次 tick 补足；这里简化丢弃）
  void fractional
}

/** 给指定助手戴指定帽子（外观收集系统）。 */
export function setHelperHat(state: GameState, helperId: string, hatId: string): void {
  const helper = state.helpers[helperId]
  if (helper === undefined || helper.count === 0) return
  helper.hat = hatId
  EventHub.logic.emit(GAME_EVENT.HELPER_HAT_CHANGED, { helperId, hatId })
}

/** 注册助手产能倍率缓存：雇佣时失效。 */
export function registerHelperCaches(state: GameState): void {
  const cacheKey = 'totalFlipsPerSec'
  if (GameCache[cacheKey] !== undefined) return
  const lazy = new Lazy(() => totalFlipsPerSec(state))
  lazy.invalidateOn(EventHub.logic, GAME_EVENT.HELPER_HIRED)
  GameCache[cacheKey] = lazy
}