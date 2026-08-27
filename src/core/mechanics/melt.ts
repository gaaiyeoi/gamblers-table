import Decimal from 'break_infinity.js'

import { COIN_TYPES, coinTypeOf } from '../data/coinTypes'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { isCoinUnlocked } from './coins'
import type { GameState } from '../state/gameState'

/**
 * 熔铸机制：把多枚低阶硬币熔合成一枚高阶硬币，减少桌布上需要渲染的硬币数量。
 *
 * 规则：
 * - 固定比例 MELT_RATIO:1（默认 10 枚 tier k 币 = 1 枚 tier k+1 币）。
 * - 只能向更高阶熔铸，且目标阶必须已解锁。
 * - 熔铸同时按 baseRate 等价转移 amount，保证"数量价值"（amount × baseRate）守恒；
 *   阶梯翻倍（2^(bought/25)）因 bought 变化产生的微小差异视为熔铸的自然损耗/收益。
 */

/** 熔铸比例：多少枚低阶币合成 1 枚高阶币。 */
export const MELT_RATIO = 10

/** 某阶硬币能否熔铸到下一阶。 */
export function canMelt(state: GameState, tier: number): boolean {
  if (tier < 1 || tier >= COIN_TYPES.length) return false
  if (!isCoinUnlocked(state, tier + 1)) return false
  return state.dimensions[tier - 1].bought >= MELT_RATIO
}

/**
 * 把 `groups` 组低阶硬币熔铸成高阶硬币（每组消耗 MELT_RATIO 枚低阶币，
 * 产出 1 枚高阶币）。返回实际成功熔铸的组数（0 表示条件不满足）。
 */
export function meltCoins(state: GameState, tier: number, groups = 1): number {
  if (groups <= 0 || !canMelt(state, tier)) return 0

  const low = state.dimensions[tier - 1]
  const high = state.dimensions[tier]
  const maxGroups = Math.floor(low.bought / MELT_RATIO)
  const actual = Math.min(groups, maxGroups)
  if (actual <= 0) return 0

  const lowCoin = coinTypeOf(tier)
  const highCoin = coinTypeOf(tier + 1)

  // 1) bought 兑换：减少渲染数量（低阶 -10×actual，高阶 +actual）。
  low.bought -= actual * MELT_RATIO
  high.bought += actual

  // 2) amount 按 baseRate 等价转移，保证产出守恒；仅转移实际可扣的部分。
  const amountToRemove = new Decimal(actual * MELT_RATIO)
  const removed = low.amount.lt(amountToRemove) ? low.amount : amountToRemove
  low.amount = low.amount.sub(removed)
  high.amount = high.amount.add(removed.mul(lowCoin.baseRate).div(highCoin.baseRate))

  // 3) 通知：倍率缓存随 bought 变化失效，并广播熔铸事件。
  EventHub.logic.emit(GAME_EVENT.DIMENSION_BOUGHT, { tier, count: -actual * MELT_RATIO })
  EventHub.logic.emit(GAME_EVENT.DIMENSION_BOUGHT, { tier: tier + 1, count: actual })
  EventHub.logic.emit(GAME_EVENT.COIN_MELTED, { tier, groups: actual })

  return actual
}

/** 一次性把某阶所有可熔铸的低阶币全部熔铸到下一阶。 */
export function meltAll(state: GameState, tier: number): number {
  if (!canMelt(state, tier)) return 0
  const low = state.dimensions[tier - 1]
  return meltCoins(state, tier, Math.floor(low.bought / MELT_RATIO))
}
