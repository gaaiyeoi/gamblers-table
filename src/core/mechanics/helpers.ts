import Decimal from 'break_infinity.js'

import { HELPER_TYPES, helperTypeOf } from '../data/helperTypes'
import { Lazy, GameCache } from '../cache'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'
import { flipCoin, type FlipResult } from './coins'

/**
 * 助手机制：雇佣助手 → 助手每秒自动抛硬币 → 产出 + 骷髅代币。
 * 助手购买的 cost 与维度同模式（几何级数递增）。
 */

/** 单个助手雇佣成本。 */
export function costOfHelper(state: GameState, helperId: string, count = 1): Decimal {
  const helper = helperTypeOf(helperId)
  const current = state.helpers[helperId]?.count ?? 0
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
  if (!canAffordHelper(state, helperId, count)) return false
  const cost = costOfHelper(state, helperId, count)
  state.cash = state.cash.sub(cost)
  const existing = state.helpers[helperId]
  if (existing === undefined) {
    state.helpers[helperId] = { count, hat: '' }
  } else {
    existing.count += count
  }
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
 */
export function flipCoins(state: GameState, count: number, rng: () => number = Math.random): FlipResult[] {
  const results: FlipResult[] = []
  for (let i = 0; i < count; i += 1) {
    results.push(flipCoin(state, rng))
  }
  return results
}

/**
 * 助手 tick：按 dt 内应抛硬币次数逐次执行 flipCoin。
 * 频率较高时累计整数次执行，避免浮点误差累积。
 */
export function tickHelpers(state: GameState, dtMs: number, rng: () => number = Math.random): void {
  const flipsThisTick = totalFlipsPerSec(state).mul(dtMs / 1000)
  const wholeFlips = Decimal.floor(flipsThisTick).toNumber()
  const fractional = flipsThisTick.sub(wholeFlips).toNumber()
  flipCoins(state, wholeFlips, rng)
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