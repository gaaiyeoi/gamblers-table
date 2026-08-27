import Decimal from 'break_infinity.js'

import { UPGRADES, upgradeOf, type UpgradeDef } from '../data/upgrades'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'

/**
 * 当局升级机制：用现金购买、转生后清空的一次性/分级升级。
 *
 * - 等级存于 state.upgrades（id -> 等级），prestigeReset 会一并清空 → 当局生效。
 * - 与全局天赋树（talents，名声点 + 跨转生保留）明确区分。
 * - 购买：扣现金、等级 +1、发射 UPGRADE_BOUGHT。
 */

/** 已购买的等级（未购买为 0）。 */
export function upgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgrades[upgradeId] ?? 0
}

/** 是否已升满（一次性升级购买后即为 true）。 */
export function isUpgradeMaxed(state: GameState, upgradeId: string): boolean {
  return upgradeLevel(state, upgradeId) >= upgradeOf(upgradeId).maxLevel
}

/**
 * 下一级成本（已满级返回 -1 哨兵值）。
 *
 * 多级升级成本随等级几何递增：baseCost × costGrowth^level，
 * 使成本具有阶级性（核心收益升级需后期经济才能点满）。
 */
export function costOfUpgrade(state: GameState, upgradeId: string): Decimal {
  if (isUpgradeMaxed(state, upgradeId)) return new Decimal(-1)
  const def = upgradeOf(upgradeId)
  const level = upgradeLevel(state, upgradeId)
  return def.baseCost.mul(Decimal.pow(def.costGrowth, level))
}

/** 是否可购买：未满级 + 现金足够。 */
export function canAffordUpgrade(state: GameState, upgradeId: string): boolean {
  if (isUpgradeMaxed(state, upgradeId)) return false
  return state.cash.gte(costOfUpgrade(state, upgradeId))
}

/** 购买当局升级：扣现金、升级。返回是否成功。 */
export function buyUpgrade(state: GameState, upgradeId: string): boolean {
  if (!canAffordUpgrade(state, upgradeId)) return false
  const cost = costOfUpgrade(state, upgradeId)
  state.cash = state.cash.sub(cost)
  state.upgrades[upgradeId] = upgradeLevel(state, upgradeId) + 1
  EventHub.logic.emit(GAME_EVENT.UPGRADE_BOUGHT, { upgradeId, level: state.upgrades[upgradeId] })
  EventHub.logic.emit(GAME_EVENT.CASH_CHANGED)
  return true
}

/** 当前生效的当局升级定义列表（用于 UI 渲染全量配置）。 */
export function upgradeDefs(): UpgradeDef[] {
  return UPGRADES
}

/**
 * 幸运四叶草：$ 面（赢现金）概率 +3% 每级。
 * 基础 50%，封顶 95%，余下为骷髅面概率。供 coins.flipCoin 判定 outcome。
 */
export function dollarChance(state: GameState): number {
  const level = upgradeLevel(state, 'luckyClover')
  return Math.min(0.95, 0.5 + 0.03 * level)
}

/** 骷髅面概率 = 1 - dollarChance。 */
export function skullChance(state: GameState): number {
  return 1 - dollarChance(state)
}
