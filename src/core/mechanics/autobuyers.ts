import type { GameState } from '../state/gameState'

import { buyDimension } from './derivativeChain'

/**
 * 自动购买器（机制 4 自动化雏形）。
 * - 每个硬币维度（tier 1..n）一个独立开关，玩家可在硬币界面自行开启/关闭。
 * - 配置存放在 GameState.autobuyers 中，随存档持久化。
 * - 开启后，每隔固定间隔尝试购买一次对应维度（钱够才买）。
 */

/** 自动购买检查间隔（毫秒）。 */
const AUTO_BUY_INTERVAL_MS = 1000

/** 切换某个维度的自动购买开关，返回切换后的状态。 */
export function toggleAutobuyer(state: GameState, tier: number): boolean | null {
  const ab = state.autobuyers[tier - 1]
  if (ab === undefined) return null
  ab.enabled = !ab.enabled
  return ab.enabled
}

/** 显式设置某个维度的自动购买开关。 */
export function setAutobuyer(state: GameState, tier: number, enabled: boolean): boolean {
  const ab = state.autobuyers[tier - 1]
  if (ab === undefined) return false
  ab.enabled = enabled
  return true
}

/** 自动购买器 tick：检查每个启用的 autobuyer 是否到时间则尝试购买。 */
export function tickAutobuyers(state: GameState, now: number): boolean {
  let purchased = false
  for (const ab of state.autobuyers) {
    if (!ab.enabled) continue
    if (now - ab.lastTick < AUTO_BUY_INTERVAL_MS) continue
    ab.lastTick = now
    if (buyDimension(state, ab.tier, 1)) {
      purchased = true
    }
  }
  return purchased
}
