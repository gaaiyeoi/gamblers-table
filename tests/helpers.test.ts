import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { helperTypeOf } from '../src/core/data/helperTypes'
import { flipCoin } from '../src/core/mechanics/coins'
import {
  canAffordHelper,
  checkHelperUnlocks,
  costOfHelper,
  hireHelper,
  isHelperUnlocked,
  tickHelpers,
  totalFlipsPerSec,
} from '../src/core/mechanics/helpers'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('costOfHelper（雇佣成本）', () => {
  it('首雇 = baseCost（新手助手 5$ 特价）', () => {
    expect(costOfHelper(state, 'novice', 1).eq(5)).toBe(true)
  })

  it('新手助手第 2 只起固定原价 100$，不再递增', () => {
    state.cash = new Decimal(1e9)
    hireHelper(state, 'novice', 1)
    expect(costOfHelper(state, 'novice', 1).eq(100)).toBe(true)
    hireHelper(state, 'novice', 1)
    expect(costOfHelper(state, 'novice', 1).eq(100)).toBe(true)
  })

  it('批量购买按首只特价 + 后续固定原价累加', () => {
    state.cash = new Decimal(1e9)
    expect(costOfHelper(state, 'novice', 3).eq(5 + 100 + 100)).toBe(true)
  })

  it('几何递增助手连续雇佣按 growth 递增', () => {
    state.cash = new Decimal(1e9)
    state.unlockFlags.push('apprentice')
    hireHelper(state, 'apprentice', 1)
    const before = costOfHelper(state, 'apprentice', 1)
    hireHelper(state, 'apprentice', 1)
    const after = costOfHelper(state, 'apprentice', 1)
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
    state.cash = new Decimal(3) // 低于首次雇佣价 5$
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
    state.unlockFlags.push('apprentice') // 学徒助手需关卡第 7 关解锁
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

  it('翻到骷髅累计 totalSkullTokensEarned，扭蛋消费不回退累计', () => {
    flipCoin(state, () => 0) // skull
    flipCoin(state, () => 0) // skull
    expect(state.stats.totalSkullTokensEarned).toBe(2)
    state.skullTokens = 0 // 模拟被扭蛋消费掉
    expect(state.stats.totalSkullTokensEarned).toBe(2)
  })
})

describe('助手按顺序解锁（checkHelperUnlocks）', () => {
  it('新手助手始终解锁', () => {
    expect(isHelperUnlocked(state, 'novice')).toBe(true)
  })

  it('未达成累计目标前未解锁，达成后自动解锁', () => {
    expect(isHelperUnlocked(state, 'apprentice')).toBe(false)
    state.stats.totalSkullTokensEarned = 30
    checkHelperUnlocks(state)
    expect(isHelperUnlocked(state, 'apprentice')).toBe(true)
    expect(state.unlockFlags).toContain('apprentice')
  })

  it('各助手解锁条件按难度递增（门槛不相交）', () => {
    // 熊力壮汉：累计赚取 5 万
    state.stats.totalEarned = new Decimal(49_999)
    checkHelperUnlocks(state)
    expect(isHelperUnlocked(state, 'journeyman')).toBe(false)
    state.stats.totalEarned = new Decimal(50_000)
    checkHelperUnlocks(state)
    expect(isHelperUnlocked(state, 'journeyman')).toBe(true)
  })

  it('未解锁助手不可雇佣', () => {
    state.cash = new Decimal(1e9)
    expect(hireHelper(state, 'master')).toBe(false)
    state.stats.totalEarned = new Decimal(1_000_000)
    checkHelperUnlocks(state)
    expect(hireHelper(state, 'master')).toBe(true)
  })
})