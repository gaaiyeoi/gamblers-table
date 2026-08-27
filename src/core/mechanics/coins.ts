import Decimal from 'break_infinity.js'

import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { D1 } from '../math'
import type { GameState } from '../state/gameState'

/**
 * 手动抛硬币（点击核心玩法）：
 * - dollar 面朝上：赢得现金
 * - skull 面朝上：不赚钱，但获得 1 枚骷髅代币
 */

/** 每次点击的基础收益。 */
export const CLICK_BASE_REWARD = new Decimal(1)
/** 骷髅面概率（50%）。 */
export const SKULL_CHANCE = 0.5

export interface FlipResult {
  /** 是否 skull 面。 */
  skull: boolean
  /** 本点击获得的现金。 */
  earned: Decimal
}

/**
 * 点击抛硬币。rng 可注入便于测试（默认 Math.random）。
 */
export function flipCoin(state: GameState, rng: () => number = Math.random): FlipResult {
  const skull = rng() < SKULL_CHANCE
  state.stats.totalFlips += 1

  if (skull) {
    state.skullTokens += 1
    EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
    return { skull: true, earned: D1.times(0) }
  }

  // 手动收益 = 基础收益 × (1 + 已购买硬币数 × 0.1)，体现"越多硬币抛得越多"
  const totalBought = state.dimensions.reduce((sum, dim) => sum + dim.bought, 0)
  const reward = CLICK_BASE_REWARD.mul(1 + totalBought * 0.1)
  state.cash = state.cash.add(reward)
  state.stats.totalWins += 1
  state.stats.totalEarned = state.stats.totalEarned.add(reward)
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return { skull: false, earned: reward }
}
