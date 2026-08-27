import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { LEVELS } from '../src/core/data/levels'
import {
  checkLevels,
  clickMultiplier,
  confirmLevelAdvance,
  dismissLevelAdvance,
  goalSatisfied,
  hasFlag,
  incomeMultiplier,
  totalDimensionsBought,
} from '../src/core/mechanics/levels'
import { prestigeReset } from '../src/core/mechanics/prestige'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('关卡定义', () => {
  it('共 12 关，目标从小到大排列', () => {
    expect(LEVELS).toHaveLength(12)
    expect(LEVELS[0].id).toBe('level-1')
    expect(LEVELS[11].id).toBe('level-12')
  })

  it('第 1 关目标为累计赚取 $1,000,000', () => {
    expect(LEVELS[0].goal).toEqual({ type: 'totalEarned', target: 1_000_000 })
  })
})

describe('goalSatisfied（目标判定）', () => {
  it('累计抛币目标', () => {
    state.stats.totalFlips = 25
    expect(goalSatisfied(state, { type: 'totalFlips', target: 25 })).toBe(true)
    expect(goalSatisfied(state, { type: 'totalFlips', target: 26 })).toBe(false)
  })

  it('现金达标目标', () => {
    state.cash = new Decimal(50)
    expect(goalSatisfied(state, { type: 'cash', target: 50 })).toBe(true)
  })

  it('累计购买维度目标（bought 跨转生保留）', () => {
    state.dimensions[0].bought = 10
    state.dimensions[1].bought = 5
    expect(totalDimensionsBought(state)).toBe(15)
    expect(goalSatisfied(state, { type: 'dimensionsBought', target: 15 })).toBe(true)
  })

  it('累计雇佣助手目标', () => {
    state.stats.totalHelpersHired = 3
    expect(goalSatisfied(state, { type: 'helpersHired', target: 3 })).toBe(true)
  })

  it('骷髅代币目标', () => {
    state.skullTokens = 30
    expect(goalSatisfied(state, { type: 'skullTokens', target: 30 })).toBe(true)
  })
})

describe('checkLevels（一局一关 · 达标待确认）', () => {
  it('初始不待确认、不推进', () => {
    const completed = checkLevels(state)
    expect(completed).toEqual([])
    expect(state.levels.completed).toBe(0)
    expect(state.levels.pendingLevelId).toBeNull()
  })

  it('达成第 1 关目标后进入待确认，确认后推进并应用点击倍率', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    // 达标后：置为待确认，未确认不推进、不应用奖励
    checkLevels(state)
    expect(state.levels.pendingLevelId).toBe('level-1')
    expect(state.levels.completed).toBe(0)
    expect(clickMultiplier(state).eq(1)).toBe(true)

    // 玩家确认过关：进入第 2 关，应用奖励
    const completedId = confirmLevelAdvance(state)
    expect(completedId).toBe('level-1')
    expect(state.levels.completed).toBe(1)
    expect(state.levels.pendingLevelId).toBeNull()
    expect(clickMultiplier(state).eq(1.5)).toBe(true)
  })

  it('连续达成多关需逐关确认，奖励累乘且 flag 生效', () => {
    // 第 1 关（totalEarned 1e6）+ 第 2 关（totalEarned 1e7）+ 第 3 关（totalEarned 1e8）
    state.stats.totalEarned = new Decimal(1e8)
    state.stats.totalHelpersHired = 5
    state.skullTokens = 40

    checkLevels(state)
    confirmLevelAdvance(state) // 过第 1 关
    checkLevels(state)
    confirmLevelAdvance(state) // 过第 2 关
    checkLevels(state)
    confirmLevelAdvance(state) // 过第 3 关

    expect(state.levels.completed).toBe(3)
    expect(clickMultiplier(state).eq(1.5)).toBe(true)
    expect(incomeMultiplier(state).eq(1.5)).toBe(true)
    expect(hasFlag(state, 'bulkBuy')).toBe(true)
  })

  it('待确认状态下重复 checkLevels 不重复触发、不推进', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    checkLevels(state)
    checkLevels(state)
    expect(state.levels.pendingLevelId).toBe('level-1')
    expect(state.levels.completed).toBe(0)
    expect(clickMultiplier(state).eq(1)).toBe(true)
  })

  it('无可确认关卡时 confirmLevelAdvance 返回 null 且不清数据', () => {
    expect(confirmLevelAdvance(state)).toBeNull()
    expect(state.levels.completed).toBe(0)
  })
})

describe('dismissLevelAdvance（暂缓过关）', () => {
  it('达成后暂缓：关闭确认并记录 dismissedLevelId，不再反复弹窗', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    checkLevels(state)
    expect(state.levels.pendingLevelId).toBe('level-1')

    // 玩家暂缓：关闭弹窗、记录当前关
    const dismissedId = dismissLevelAdvance(state)
    expect(dismissedId).toBe('level-1')
    expect(state.levels.pendingLevelId).toBeNull()
    expect(state.levels.dismissedLevelId).toBe('level-1')

    // 后续 checkLevels 不再因目标满足而重新弹窗
    checkLevels(state)
    checkLevels(state)
    expect(state.levels.pendingLevelId).toBeNull()
    expect(state.levels.completed).toBe(0)
  })

  it('暂缓后仍可通过 confirmLevelAdvance 手动过关', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    checkLevels(state)
    dismissLevelAdvance(state)
    expect(state.levels.pendingLevelId).toBeNull()

    const completedId = confirmLevelAdvance(state)
    expect(completedId).toBe('level-1')
    expect(state.levels.completed).toBe(1)
    expect(state.levels.dismissedLevelId).toBeNull()
  })

  it('无待确认关卡时 dismissLevelAdvance 返回 null', () => {
    expect(dismissLevelAdvance(state)).toBeNull()
    expect(state.levels.dismissedLevelId).toBeNull()
  })

  it('重生会清空暂缓标记', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    checkLevels(state)
    dismissLevelAdvance(state)
    expect(state.levels.dismissedLevelId).toBe('level-1')

    state.cash = new Decimal(1e6)
    prestigeReset(state, 1)
    expect(state.levels.dismissedLevelId).toBeNull()
  })
})

describe('关卡进度与重生', () => {
  it('重生会清空关卡进度，但保留永久倍率（永生加成）', () => {
    state.stats.totalEarned = new Decimal(1_000_000)
    checkLevels(state)
    confirmLevelAdvance(state)
    expect(state.levels.completed).toBe(1)
    expect(clickMultiplier(state).eq(1.5)).toBe(true)

    // 触发一次 Tier1 重生（需现金达标）
    state.cash = new Decimal(1e6)
    prestigeReset(state, 1)

    // 关卡进度刷回 0，待确认标记清除，但 clickMult 永生加成保留
    expect(state.levels.completed).toBe(0)
    expect(state.levels.pendingLevelId).toBeNull()
    expect(state.levels.dismissedLevelId).toBeNull()
    expect(clickMultiplier(state).eq(1.5)).toBe(true)
  })
})

describe('倍率与门控 helper', () => {
  it('默认倍率为 1', () => {
    expect(clickMultiplier(state).eq(1)).toBe(true)
    expect(incomeMultiplier(state).eq(1)).toBe(true)
  })

  it('hasFlag 判断机制解锁', () => {
    expect(hasFlag(state, 'bulkBuy')).toBe(false)
    state.unlockFlags.push('bulkBuy')
    expect(hasFlag(state, 'bulkBuy')).toBe(true)
  })
})
