import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { canPrestige, prestigeReset, previewPrestigeReward } from '../src/core/mechanics/prestige'
import { buyDimension } from '../src/core/mechanics/derivativeChain'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('canPrestige（阈值判定）', () => {
  it('cash < threshold 不可转生', () => {
    state.cash = new Decimal(1e5)
    expect(canPrestige(state, 1)).toBe(false)
  })

  it('cash >= threshold 可转生', () => {
    state.cash = new Decimal(1e7)
    expect(canPrestige(state, 1)).toBe(true)
  })
})

describe('previewPrestigeReward（奖励预览）', () => {
  it('cash=1e7 reward=1', () => {
    state.cash = new Decimal(1e7)
    expect(previewPrestigeReward(state, 1).eq(1)).toBe(true)
  })

  it('cash=1e9 reward=9', () => {
    state.cash = new Decimal(1e9)
    expect(previewPrestigeReward(state, 1).eq(9)).toBe(true)
  })

  it('cash=1e6（边界）reward=0', () => {
    state.cash = new Decimal(1e6)
    expect(previewPrestigeReward(state, 1).eq(0)).toBe(true)
  })

  it('cash < threshold：返回 0（防御 -Infinity）', () => {
    state.cash = new Decimal(0)
    expect(previewPrestigeReward(state, 2).eq(0)).toBe(true)
    expect(previewPrestigeReward(state, 3).eq(0)).toBe(true)
    expect(previewPrestigeReward(state, 4).eq(0)).toBe(true)
  })
})

describe('prestigeReset（执行转生）', () => {
  it('成功：cash 清零、amount 清零、bought 保留、reputation 增加', () => {
    state.cash = new Decimal(1e9)
    buyDimension(state, 1, 5) // D1 amount=5, bought=5
    const before = previewPrestigeReward(state, 1)

    const reward = prestigeReset(state, 1)

    expect(reward.eq(before)).toBe(true)
    expect(state.cash.eq(0)).toBe(true)
    expect(state.dimensions[0].amount.eq(0)).toBe(true)
    expect(state.dimensions[0].bought).toBe(5) // 保留
    expect(state.prestige.currency.reputation.eq(before)).toBe(true)
    expect(state.prestige.tier).toBe(1)
  })

  it('累计：多次转生通货相加', () => {
    state.cash = new Decimal(1e7)
    const r1 = prestigeReset(state, 1)
    state.cash = new Decimal(1e7)
    const r2 = prestigeReset(state, 1)
    expect(state.prestige.currency.reputation.eq(r1.add(r2))).toBe(true)
  })

  it('不满足阈值返回 0 且状态不变', () => {
    state.cash = new Decimal(100)
    const reward = prestigeReset(state, 1)
    expect(reward.eq(0)).toBe(true)
    expect(state.cash.eq(100)).toBe(true)
  })

  it('helpers count 清零，帽子保留', () => {
    state.cash = new Decimal(1e7)
    buyDimension(state, 1, 5)
    state.helpers.novice = { count: 3, hat: 'hat_brown' }
    prestigeReset(state, 1)
    expect(state.helpers.novice.count).toBe(0)
    expect(state.helpers.novice.hat).toBe('hat_brown')
  })
})