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

/** 自动购买器是否已解锁（需机制级 flag `autobuyer`）。 */
export function isAutobuyerUnlocked(state: GameState): boolean {
  return state.unlockFlags.includes('autobuyer')
}

/** 切换某个维度的自动购买开关，返回切换后的状态（未解锁返回 null）。 */
export function toggleAutobuyer(state: GameState, tier: number): boolean | null {
  const ab = state.autobuyers[tier - 1]
  if (ab === undefined) return null
  if (!isAutobuyerUnlocked(state)) return null
  ab.enabled = !ab.enabled
  return ab.enabled
}

/** 显式设置某个维度的自动购买开关。未解锁时禁止开启（仍允许关闭）。 */
export function setAutobuyer(state: GameState, tier: number, enabled: boolean): boolean {
  const ab = state.autobuyers[tier - 1]
  if (ab === undefined) return false
  if (enabled && !isAutobuyerUnlocked(state)) return false
  ab.enabled = enabled
  return true
}

/** 自动购买器 tick：检查每个启用的 autobuyer 是否到时间则尝试购买。 */
export function tickAutobuyers(state: GameState, now: number): boolean {
  if (!isAutobuyerUnlocked(state)) return false
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

/** 返回自动购买间隔（毫秒），供 UI 展示节奏。 */
export function autobuyerIntervalMs(): number {
  return AUTO_BUY_INTERVAL_MS
}

/**
 * 计算某个维度自动购买器的冷却进度（0~1）。
 * - 未启用：返回 1（表示"已完成/无冷却"）。
 * - 已启用：距离上次检查的时间占比，满 1 时下一次 tick 会触发购买并归零重来。
 */
export function autobuyerProgress(state: GameState, tier: number, now: number): number {
  const ab = state.autobuyers[tier - 1]
  if (ab === undefined || !ab.enabled) return 1
  const elapsed = now - ab.lastTick
  return Math.min(1, Math.max(0, elapsed / AUTO_BUY_INTERVAL_MS))
}
