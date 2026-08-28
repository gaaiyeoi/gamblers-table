import Decimal from 'break_infinity.js'

import { PRESTIGE_TIERS, tierOf, type PrestigeTierDef } from '../data/prestigeTiers'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import type { GameState } from '../state/gameState'
import { miningPrestigePreview } from './mining'

/**
 * 嵌套转生状态机：
 * - Tier1 为采矿转生：基于**深度居民**奖励绿水晶（crystalGreen），与 Gooboo 一致。
 * - 流程：派发 RESET_BEFORE → 结算通货 → 清空作用域 → 派发 RESET_AFTER。
 * - 保留（不重置）：声望升级等级、气体、余烬、unlockFlags、stats。
 */

export { PRESTIGE_TIERS, tierOf, type PrestigeTierDef }

/**
 * 当前是否满足指定层转生。
 * Tier1 门槛：已解锁「深度居民」且本次累积的居民可兑换出至少 1 枚绿水晶。
 */
export function canPrestige(state: GameState, tier: number): boolean {
  if (tier === 1) {
    return state.mining.unlocks.miningDepthDweller?.use === true && miningPrestigePreview(state) >= 1
  }
  return state.cash.gte(tierOf(tier).threshold)
}

/** 预览本次 reset 将获得的通货（不执行）。 */
export function previewPrestigeReward(state: GameState, tier: number): Decimal {
  if (!canPrestige(state, tier)) return new Decimal(0)
  return tierOf(tier).formula(state)
}

/** 执行转生：派发事件 → 结算通货 → 清空作用域。 */
export function prestigeReset(state: GameState, tier: number): Decimal {
  if (!canPrestige(state, tier)) return new Decimal(0)
  const def = tierOf(tier)

  EventHub.logic.emit(GAME_EVENT.PRESTIGE_RESET_BEFORE, { tier })

  const reward = def.formula(state)
  state.prestige.tier = Math.max(state.prestige.tier, tier)
  const prev = state.prestige.currency[def.currencyId] ?? new Decimal(0)
  state.prestige.currency[def.currencyId] = prev.add(reward)

  // 采矿当局进度由 store 在 PRESTIGE_RESET_AFTER 中重置（doMiningPrestige）
  state.cash = new Decimal(0)

  EventHub.logic.emit(GAME_EVENT.PRESTIGE_RESET_AFTER, { tier, reward })
  return reward
}
