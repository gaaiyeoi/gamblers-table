import Decimal from 'break_infinity.js'

import { Lazy, GameCache } from '../cache'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { applyReversePurchase, isDimensionBanned } from './challenges'
import { isCoinUnlocked } from './coins'
import { incomeMultiplier } from './levels'
import { doublingMultiplier } from '../math'
import type { GameState } from '../state/gameState'
import { COIN_TYPES, coinTypeOf } from '../data/coinTypes'

/**
 * 机制 1：导数级联递推生产链（参考 antimatter-dimensions 的 AntimatterDimensions.tick）。
 *
 * 递推公式（用户需求）：dD_k/dt = D_{k+1} × R_{k+1}，
 * 其中 R 为该维度生产速率/倍率因子；D_1 负责产出基础资源现金。
 *
 * 实现：
 * - 每 tick 从最高阶维度向下级联：D_k 的产出注入 D_{k-1}.amount
 * - D_1 的产出注入现金
 * - 产出倍率 = baseRate × 2^(bought/K)（每买 K 个翻倍），包装为 Lazy 缓存
 */

/** 硬币强化每级产出提升倍率（默认 +25%，可用 coinType.enhanceBonus 覆盖）。 */
const ENHANCE_BONUS = 0.25

/** 维度产出倍率（不含 amount）：baseRate × 阶梯翻倍 × 强化等级加成。 */
export function dimensionMultiplier(state: GameState, tier: number): Decimal {
  const coin = coinTypeOf(tier)
  const dim = state.dimensions[tier - 1]
  const bonus = coin.enhanceBonus ?? ENHANCE_BONUS
  const enhance = new Decimal(1).add(bonus * (dim.enhanceLevel ?? 0))
  return coin.baseRate.mul(doublingMultiplier(dim.bought, coin.doublingEvery)).mul(enhance)
}

/** 某阶硬币的强化等级。 */
export function enhanceLevelOf(state: GameState, tier: number): number {
  return state.dimensions[tier - 1].enhanceLevel ?? 0
}

/** 下一级强化成本：baseCost × 5 × costGrowth^level（几何递增）。 */
export function costOfEnhancement(state: GameState, tier: number): Decimal {
  const coin = coinTypeOf(tier)
  const level = enhanceLevelOf(state, tier)
  return coin.baseCost.mul(5).mul(Decimal.pow(coin.costGrowth, level))
}

/** 是否可强化该阶硬币：已解锁 + 现金足够。 */
export function canAffordEnhancement(state: GameState, tier: number): boolean {
  if (!isCoinUnlocked(state, tier)) return false
  return state.cash.gte(costOfEnhancement(state, tier))
}

/**
 * 强化硬币：扣现金、强化等级 +1，该阶产出倍率 ×(1 + enhanceBonus)。
 * 需先解锁该阶硬币。返回是否成功。
 */
export function enhanceDimension(state: GameState, tier: number): boolean {
  if (!canAffordEnhancement(state, tier)) return false
  const cost = costOfEnhancement(state, tier)
  const dim = state.dimensions[tier - 1]
  state.cash = state.cash.sub(cost)
  dim.enhanceLevel = (dim.enhanceLevel ?? 0) + 1
  EventHub.logic.emit(GAME_EVENT.ENHANCED, { tier, level: dim.enhanceLevel })
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return true
}

/** 每秒产出 = amount × 倍率。 */
export function dimensionProductionPerSecond(state: GameState, tier: number): Decimal {
  const dim = state.dimensions[tier - 1]
  return dim.amount.mul(dimensionMultiplier(state, tier))
}

/** 单个维度的总每秒产出（供 INFO 面板显示）。 */
export function dimensionTotalRate(state: GameState, tier: number): Decimal {
  return dimensionProductionPerSecond(state, tier)
}

/**
 * 级联 tick：按 dD_k/dt = D_{k+1}×R_{k+1} 做微分累加。
 * 从最高阶向下，D_k 产出注入 D_{k-1}；最后 D_1 产出现金。
 */
export function tickDerivativeChain(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000
  for (let tier = state.dimensions.length; tier >= 2; tier -= 1) {
    const rate = dimensionProductionPerSecond(state, tier)
    state.dimensions[tier - 2].amount = state.dimensions[tier - 2].amount.add(rate.mul(dt))
  }
  const cashGain = dimensionProductionPerSecond(state, 1).mul(dt).mul(incomeMultiplier(state))
  state.cash = state.cash.add(cashGain)
  state.stats.totalEarned = state.stats.totalEarned.add(cashGain)
}

/** 购买 count 个的总成本（几何级数求和）。 */
export function costOfDimension(state: GameState, tier: number, count = 1): Decimal {
  const coin = coinTypeOf(tier)
  const bought = state.dimensions[tier - 1].bought
  const first = coin.baseCost.mul(coin.costGrowth.pow(bought))
  if (count <= 1) return first
  return first
    .mul(Decimal.pow(coin.costGrowth, count).sub(1))
    .div(coin.costGrowth.sub(1))
}

/** 是否买得起 count 个。 */
export function canAffordDimension(state: GameState, tier: number, count = 1): boolean {
  return state.cash.gte(costOfDimension(state, tier, count))
}

/**
 * 购买 count 个维度。
 * 购买同时增加 amount（初始数量）与 bought（驱动阶梯翻倍）。
 */
export function buyDimension(state: GameState, tier: number, count = 1): boolean {
  const dim = state.dimensions[tier - 1]
  if (isDimensionBanned(state, tier)) return false
  // 门控：未解锁的硬币不可购买。
  if (!isCoinUnlocked(state, tier)) return false
  const cost = costOfDimension(state, tier, count)
  if (state.cash.lt(cost)) return false
  if (!applyReversePurchase(state, tier, count)) return false

  state.cash = state.cash.sub(cost)
  dim.bought += count
  dim.amount = dim.amount.add(count)
  state.stats.totalDimensionsBought += count
  EventHub.logic.emit(GAME_EVENT.DIMENSION_BOUGHT, { tier, count })
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return true
}

/**
 * 注册倍率缓存：每个维度的产出倍率登记为 Lazy，
 * 购买维度时自动失效（DIMENSION_BOUGHT 事件）。
 */
export function registerDimensionCaches(state: GameState): void {
  for (let tier = 1; tier <= COIN_TYPES.length; tier += 1) {
    const cacheKey = `dimensionMultiplier:${tier}`
    // 已注册则跳过，避免重复挂载监听导致泄漏
    if (GameCache[cacheKey] !== undefined) continue
    const lazy = new Lazy(() => dimensionMultiplier(state, tier))
    lazy.invalidateOn(EventHub.logic, GAME_EVENT.DIMENSION_BOUGHT, GAME_EVENT.ENHANCED)
    GameCache[cacheKey] = lazy
  }
}
