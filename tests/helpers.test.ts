import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { helperTypeOf } from '../src/core/data/helperTypes'
import { flipCoin } from '../src/core/mechanics/coins'
import { canAffordHelper, costOfHelper, hireHelper, tickHelpers, totalFlipsPerSec } from '../src/core/mechanics/helpers'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('costOfHelper（雇佣成本几何级数）', () => {
  it('首雇 = baseCost', () => {
    expect(costOfHelper(state, 'novice', 1).eq(100)).toBe(true)
  })

  it('连续雇佣按 growth 递增', () => {
    state.cash = new Decimal(1e9)
    hireHelper(state, 'novice', 1)
    const before = costOfHelper(state, 'novice', 1)
    hireHelper(state, 'novice', 1)
    const after = costOfHelper(state, 'novice', 1)
    expect(after.gt(before)).toBe(true)
  })
})

describe('hireHelper（雇佣）', () => {
  it('成功雇佣：扣现金 + 增加 count', () => {
    state.cash = new Decimal(1000)
    expect(hireHelper(state, 'novice', 2)).toBe(true)
    expect(state.helpers.novice.count).toBe(2)
  })

  it('现金不足返回 false', () => {
    state.cash = new Decimal(50)
    expect(canAffordHelper(state, 'novice')).toBe(false)
    expect(hireHelper(state, 'novice')).toBe(false)
    expect(state.helpers.novice).toBeUndefined()
  })
})

describe('tickHelpers（自动抛硬币）', () => {
  it('无助手时无动作', () => {
    state.cash = new Decimal(1000)
    const before = state.cash
    tickHelpers(state, 1000, () => 0.9)
    expect(state.cash.eq(before)).toBe(true)
  })

  it('雇佣后每秒自动抛硬币（高频）', () => {
    state.cash = new Decimal(1e6)
    hireHelper(state, 'novice', 2) // 0.5 flips/sec × 2 = 1 flip/sec
    const before = state.stats.totalFlips
    tickHelpers(state, 5000, () => 0.9) // 5 秒 → 5 次抛硬币
    expect(state.stats.totalFlips - before).toBeGreaterThanOrEqual(5)
    expect(state.stats.totalFlips - before).toBeLessThanOrEqual(6)
  })
})

describe('totalFlipsPerSec（总速率）', () => {
  it('多助手累加', () => {
    state.cash = new Decimal(1e9)
    hireHelper(state, 'novice', 10)
    hireHelper(state, 'apprentice', 1)
    const noviceRate = helperTypeOf('novice').flipsPerSec
    const apprenticeRate = helperTypeOf('apprentice').flipsPerSec
    const expected = noviceRate.times(10).add(apprenticeRate)
    expect(totalFlipsPerSec(state).eq(expected)).toBe(true)
  })
})

describe('flipCoin 与 helpers 协作', () => {
  it('手动与自动抛硬币都更新骷髅代币', () => {
    state.cash = new Decimal(1e6)
    hireHelper(state, 'novice', 5)
    const skullsBefore = state.skullTokens
    tickHelpers(state, 1000, () => 0) // 全部 skull
    flipCoin(state, () => 0) // 手动 skull
    expect(state.skullTokens).toBeGreaterThan(skullsBefore)
  })
})