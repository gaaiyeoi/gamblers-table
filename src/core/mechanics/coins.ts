import Decimal from 'break_infinity.js'

import { COIN_TYPES, coinTypeOf, type CoinUnlockGoal } from '../data/coinTypes'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { D1 } from '../math'
import type { GameState } from '../state/gameState'
import { skullChance } from './upgrades'

/**
 * 手动抛硬币（点击核心玩法）：
 * - dollar 面朝上：赢得现金
 * - skull 面朝上：不赚钱，但获得 1 枚骷髅代币
 */

/** 每次点击的基础收益。 */
export const CLICK_BASE_REWARD = new Decimal(1)
/** 基础骷髅面概率（50%），可被当局升级「幸运四叶草」降低。 */
export const SKULL_CHANCE = 0.5

export interface FlipResult {
  /** 是否 skull 面。 */
  skull: boolean
  /** 本点击获得的现金。 */
  earned: Decimal
}

/**
 * 点击抛硬币。rng 可注入便于测试（默认 Math.random）。
 * multiplier 为本次收益倍率：手动点击传 clickMultiplier，助手自动抛币传 incomeMultiplier。
 */
export function flipCoin(
  state: GameState,
  rng: () => number = Math.random,
  multiplier: Decimal = D1,
): FlipResult {
  const skull = rng() < skullChance(state)
  state.stats.totalFlips += 1

  if (skull) {
    state.skullTokens += 1
    state.stats.totalSkullTokensEarned += 1
    EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
    return { skull: true, earned: D1.times(0) }
  }

  // 手动收益 = 基础收益 × (1 + 已购买硬币数 × 0.1) × 倍率，体现"越多硬币抛得越多"
  const totalBought = state.dimensions.reduce((sum, dim) => sum + dim.bought, 0)
  const reward = CLICK_BASE_REWARD.mul(1 + totalBought * 0.1).mul(multiplier)
  state.cash = state.cash.add(reward)
  state.stats.totalWins += 1
  state.stats.totalEarned = state.stats.totalEarned.add(reward)
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return { skull: false, earned: reward }
}

/** 判断某个硬币的累计统计解锁目标是否已达成。 */
function coinUnlockSatisfied(state: GameState, goal: CoinUnlockGoal): boolean {
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

/** 某阶硬币是否已解锁（无解锁条件一律视为已解锁）。 */
export function isCoinUnlocked(state: GameState, tier: number): boolean {
  const coin = coinTypeOf(tier)
  if (coin.unlockFlag === undefined) return true
  return state.unlockFlags.includes(coin.unlockFlag)
}

/**
 * 检查并推进硬币解锁：遍历所有硬币，达成累计统计目标即写入对应 unlockFlag。
 * 每帧随 checkHelperUnlocks 一起调用。
 */
export function checkCoinUnlocks(state: GameState): void {
  for (const coin of COIN_TYPES) {
    if (coin.unlockFlag === undefined || coin.unlockGoal === undefined) continue
    if (state.unlockFlags.includes(coin.unlockFlag)) continue
    if (!coinUnlockSatisfied(state, coin.unlockGoal)) continue
    state.unlockFlags.push(coin.unlockFlag)
    EventHub.logic.emit(GAME_EVENT.COIN_UNLOCKED, { coinId: coin.id })
  }
}
