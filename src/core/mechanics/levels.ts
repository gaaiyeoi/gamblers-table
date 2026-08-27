import Decimal from 'break_infinity.js'

import { LEVELS, type LevelGoal, type LevelReward } from '../data/levels'
import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { D1 } from '../math'
import type { GameState } from '../state/gameState'

/**
 * 任务关卡（主线）机制。
 *
 * 关卡是一条线性主线，采用"一局一关 + 过关确认"设计：达成当前关目标后不会
 * 自动推进，而是进入"待确认"状态（pendingLevelId），由玩家点击"过关"后才
 * 应用奖励并进入下一关（即开启对应下一关的新一局）。
 *
 * 目标大多基于累计型统计（累计抛币 / 累计赚取 / 累计购买维度 / 累计雇佣助手 /
 * 骷髅代币），这些在转生后不清零。重生（prestige）会把关卡进度 completed 刷成
 * 0（重新从第 1 关打起），但保留 clickMult/incomeMult 等"永生加成"与机制解锁。
 */

/** 判断某个目标是否已达成。 */
export function goalSatisfied(state: GameState, goal: LevelGoal): boolean {
  switch (goal.type) {
    case 'totalFlips':
      return state.stats.totalFlips >= goal.target
    case 'totalEarned':
      return state.stats.totalEarned.gte(goal.target)
    case 'cash':
      return state.cash.gte(goal.target)
    case 'dimensionsBought':
      return totalDimensionsBought(state) >= goal.target
    case 'helpersHired':
      return state.stats.totalHelpersHired >= goal.target
    case 'skullTokens':
      return state.skullTokens >= goal.target
    default:
      return false
  }
}

/** 累计购买维度数量（bought 跨转生保留）。 */
export function totalDimensionsBought(state: GameState): number {
  return state.dimensions.reduce((sum, dim) => sum + dim.bought, 0)
}

/** 永久点击收益倍率。 */
export function clickMultiplier(state: GameState): Decimal {
  return state.levels.clickMult
}

/** 永久全局收益倍率。 */
export function incomeMultiplier(state: GameState): Decimal {
  return state.levels.incomeMult
}

/** 是否已解锁某个机制级 flag。 */
export function hasFlag(state: GameState, flag: string): boolean {
  return state.unlockFlags.includes(flag)
}

/** 应用单关奖励（机制解锁 + 数值累乘）。 */
function applyReward(state: GameState, reward: LevelReward): void {
  switch (reward.type) {
    case 'clickMult':
      state.levels.clickMult = state.levels.clickMult.mul(reward.value)
      break
    case 'incomeMult':
      state.levels.incomeMult = state.levels.incomeMult.mul(reward.value)
      break
    case 'flag':
      if (!state.unlockFlags.includes(reward.flag)) {
        state.unlockFlags.push(reward.flag)
      }
      break
    default:
      break
  }
}

/** 下一个待完成的关卡定义（全部完成返回 undefined）。 */
export function currentLevel(state: GameState) {
  return LEVELS[state.levels.completed]
}

/**
 * 检查关卡：每帧调用。达成当前关目标时不会自动推进，而是置为"待确认"状态
 * 等待玩家点击过关（一局一关）。已在待确认状态下不会重复触发。
 * 返回本次新完成的关卡 id 列表（本函数不实际完成关卡，恒为空）。
 */
export function checkLevels(state: GameState): string[] {
  const next = currentLevel(state)
  if (next === undefined) {
    // 全部通关：无待确认关卡
    state.levels.pendingLevelId = null
    state.levels.dismissedLevelId = null
    return []
  }
  if (state.levels.pendingLevelId !== null) {
    // 已在等待玩家确认，停止推进
    return []
  }
  if (state.levels.dismissedLevelId === next.id) {
    // 本关已被玩家"暂缓"：不再自动弹确认框，等待玩家手动过关或转生
    return []
  }
  if (goalSatisfied(state, next.goal)) {
    state.levels.pendingLevelId = next.id
    EventHub.logic.emit(GAME_EVENT.LEVEL_READY, { levelId: next.id })
  }
  return []
}

/**
 * 确认过关：应用当前待确认关的奖励、completed +1 并开启下一关（新一局）。
 * 返回本次完成的关卡 id；无待确认关卡或数据不一致返回 null。
 * 确认后是否立即出现下一关的待确认，由下一次 checkLevels 按目标判断。
 */
export function confirmLevelAdvance(state: GameState): string | null {
  const next = currentLevel(state)
  if (next === undefined) return null
  const pendingId = state.levels.pendingLevelId
  const dismissed = state.levels.dismissedLevelId === next.id
  if (pendingId === null && !dismissed) return null
  if (next.id !== pendingId && !dismissed) {
    // 防御：待确认关卡与当前关不一致时丢弃标记
    state.levels.pendingLevelId = null
    return null
  }
  applyReward(state, next.reward)
  state.levels.completed += 1
  state.levels.pendingLevelId = null
  state.levels.dismissedLevelId = null
  EventHub.logic.emit(GAME_EVENT.LEVEL_COMPLETED, { levelId: next.id })
  return next.id
}

/**
 * 暂缓过关：关闭当前关的确认弹窗并记录 dismissedLevelId，使 checkLevels 不再
 * 因目标持续满足而反复弹窗；玩家后续可在关卡页手动过关。
 * 返回当前暂缓的关卡 id；无待确认关卡返回 null。
 */
export function dismissLevelAdvance(state: GameState): string | null {
  const next = currentLevel(state)
  if (next === undefined) return null
  if (!goalSatisfied(state, next.goal)) return null
  state.levels.pendingLevelId = null
  state.levels.dismissedLevelId = next.id
  return next.id
}

/** 仅供测试/兜底：重置关卡进度（不用于正常流程）。 */
export function resetLevels(state: GameState): void {
  state.levels.completed = 0
  state.levels.pendingLevelId = null
  state.levels.dismissedLevelId = null
  state.levels.clickMult = D1
  state.levels.incomeMult = D1
}

export { LEVELS }
