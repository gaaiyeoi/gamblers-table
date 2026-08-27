import Decimal from 'break_infinity.js'

import { talentOf, TALENTS } from '../data/talents'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'

/**
 * 天赋树机制（机制 5）：可无损重置的三系加点树。
 * - 花费来自转生通货（reputation，对应 Tier1）
 * - 每个节点消耗其 cost 点数
 * - 重置：清空已点天赋，返还所有点数（无损）
 */

/** 默认通货：Tier1 的 reputation（玩家主要通货）。 */
const TALENT_CURRENCY = 'reputation'

/** 获取可用天赋点数（来自转生通货 = reputation）。 */
export function availableTalentPoints(state: GameState): number {
  const rep = state.prestige.currency[TALENT_CURRENCY] ?? new Decimal(0)
  // reputation 来自 prestigeReset 公式（floor），实际是整数。
  // 还原时从已花 + 可用计算更稳健：total = spent + available，spent = sum(talents.cost)
  // 为简化直接用 reputation 作为总额（已花 = sum(talents.cost），可用 = reputation - spent）
  const spent = TALENTS.filter((t) => state.talents.includes(t.id)).reduce((sum, t) => sum + t.cost, 0)
  return Math.max(0, rep.toNumber() - spent)
}

/** 是否可花费：节点存在 + 货币足够 + 未点亮。 */
export function canSpendTalent(state: GameState, talentId: string): boolean {
  if (state.talents.includes(talentId)) return false
  const talent = talentOf(talentId)
  return availableTalentPoints(state) >= talent.cost
}

/** 点亮天赋节点：扣减点数（不可撤销，除非 freeReset）。 */
export function spendTalent(state: GameState, talentId: string): boolean {
  if (!canSpendTalent(state, talentId)) return false
  state.talents.push(talentId)
  EventHub.logic.emit(GAME_EVENT.TALENT_POINT_CHANGED, { talentId, action: 'spend' })
  return true
}

/**
 * 无损重置：清空所有已点天赋（点数自动可重新花费）。
 * 这是关键特性——允许玩家针对不同挑战自由组合 Build。
 */
export function freeResetTalents(state: GameState): void {
  const cleared = state.talents.splice(0, state.talents.length)
  EventHub.logic.emit(GAME_EVENT.TALENT_POINT_CHANGED, { cleared, action: 'reset' })
}

/** 计算天赋节点的总倍率贡献（MVP：连乘各点亮节点的 multiplier）。 */
export function talentTotalMultiplier(state: GameState): Decimal {
  let m = new Decimal(1)
  for (const t of TALENTS) {
    if (!state.talents.includes(t.id)) continue
    if (t.multiplier !== undefined) m = m.mul(t.multiplier)
  }
  return m
}