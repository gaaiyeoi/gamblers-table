import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { buyDimension } from '../src/core/mechanics/derivativeChain'
import { checkCoinUnlocks, isCoinUnlocked } from '../src/core/mechanics/coins'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('硬币按累计统计解锁（checkCoinUnlocks）', () => {
  it('铜币始终解锁', () => {
    expect(isCoinUnlocked(state, 1)).toBe(true)
  })

  it('银币：累计赚取 50 万前未解锁，达成后自动解锁', () => {
    expect(isCoinUnlocked(state, 2)).toBe(false)
    state.stats.totalEarned = new Decimal(499_999)
    checkCoinUnlocks(state)
    expect(isCoinUnlocked(state, 2)).toBe(false)
    state.stats.totalEarned = new Decimal(500_000)
    checkCoinUnlocks(state)
    expect(isCoinUnlocked(state, 2)).toBe(true)
    expect(state.unlockFlags).toContain('coin.silver')
  })

  it('红宝石币：累计获得骷髅 100 枚解锁', () => {
    expect(isCoinUnlocked(state, 6)).toBe(false)
    state.stats.totalSkullTokensEarned = 100
    checkCoinUnlocks(state)
    expect(isCoinUnlocked(state, 6)).toBe(true)
    expect(state.unlockFlags).toContain('coin.ruby')
  })

  it('解锁条件按档次递增，未达标的高阶硬币保持锁定', () => {
    // 累计赚取 1000 万：解锁银币与金币，但黑曜石币（1 万亿）仍锁定。
    state.stats.totalEarned = new Decimal(10_000_000)
    checkCoinUnlocks(state)
    expect(isCoinUnlocked(state, 2)).toBe(true)
    expect(isCoinUnlocked(state, 3)).toBe(true)
    expect(isCoinUnlocked(state, 8)).toBe(false)
  })

  it('解锁为幂等操作：重复调用不产生重复 flag', () => {
    state.stats.totalEarned = new Decimal(500_000)
    checkCoinUnlocks(state)
    checkCoinUnlocks(state)
    expect(state.unlockFlags.filter((f) => f === 'coin.silver')).toHaveLength(1)
  })
})

describe('未解锁硬币不可购买', () => {
  it('未解锁的银币不可购买，解锁后可购买', () => {
    state.cash = new Decimal(1e9)
    expect(buyDimension(state, 2, 1)).toBe(false)
    expect(state.dimensions[1].bought).toBe(0)

    state.stats.totalEarned = new Decimal(500_000)
    checkCoinUnlocks(state)
    expect(buyDimension(state, 2, 1)).toBe(true)
    expect(state.dimensions[1].bought).toBe(1)
  })

  it('解锁不改变铜币（D1）的正常购买', () => {
    state.cash = new Decimal(1e9)
    expect(isCoinUnlocked(state, 1)).toBe(true)
    expect(buyDimension(state, 1, 2)).toBe(true)
  })
})
