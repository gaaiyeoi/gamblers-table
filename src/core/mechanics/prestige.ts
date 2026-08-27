import Decimal from 'break_infinity.js'

import { PRESTIGE_TIERS, tierOf, type PrestigeTierDef } from '../data/prestigeTiers'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'

/**
 * 嵌套转生状态机（机制 2）：
 * - 4 层 prestige tier 共享统一的 Reset 流程
 * - 顺序：派发 RESET_BEFORE → 结算通货 → 清空作用域 → 派发 RESET_AFTER
 * - 作用域（清空）：cash、dimensions.amount、upgrades、helpers.count
 * - 保留（不重置）：bought（阶梯翻倍升级跨转生保留）、prestige.currency（高阶通货）、
 *   talents、unlockFlags、gacha.collection、skullTokens、helpers.hat（外观收藏）、
 *   stats.totalFlips（统计）
 */

export { PRESTIGE_TIERS, tierOf, type PrestigeTierDef }

/** 当前 cash 是否满足指定层转生。 */
export function canPrestige(state: GameState, tier: number): boolean {
  return state.cash.gte(tierOf(tier).threshold)
}

/** 预览本次 reset 将获得的通货（不执行）。 */
export function previewPrestigeReward(state: GameState, tier: number): Decimal {
  // 未达阈值返回 0，避免 cash < threshold 时 log10 触发 -Infinity
  if (!canPrestige(state, tier)) return new Decimal(0)
  return tierOf(tier).formula(state.cash)
}

/**
 * 执行转生：派发事件 → 结算通货 → 清空作用域。
 * 返回获得的通货数量；不满足阈值返回 0。
 */
export function prestigeReset(state: GameState, tier: number): Decimal {
  if (!canPrestige(state, tier)) return new Decimal(0)
  const def = tierOf(tier)

  EventHub.logic.emit(GAME_EVENT.PRESTIGE_RESET_BEFORE, { tier })

  // 先用原始 cash 结算通货
  const reward = def.formula(state.cash)
  state.prestige.tier = Math.max(state.prestige.tier, tier)
  const prev = state.prestige.currency[def.currencyId] ?? new Decimal(0)
  state.prestige.currency[def.currencyId] = prev.add(reward)

  // 清空作用域
  state.cash = new Decimal(0)
  for (const dim of state.dimensions) {
    dim.amount = new Decimal(0)
  }
  // bought 不重置：阶梯翻倍升级跨转生保留
  for (const key of Object.keys(state.upgrades)) {
    delete state.upgrades[key]
  }
  for (const helper of Object.values(state.helpers)) {
    helper.count = 0
    // 帽子（外观）保留
  }

  EventHub.logic.emit(GAME_EVENT.PRESTIGE_RESET_AFTER, { tier, reward })
  return reward
}