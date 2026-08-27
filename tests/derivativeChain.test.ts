import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { coinTypeOf } from '../src/core/data/coinTypes'
import { flipCoin } from '../src/core/mechanics/coins'
import {
  buyDimension,
  canAffordDimension,
  costOfDimension,
  dimensionMultiplier,
  dimensionProductionPerSecond,
  tickDerivativeChain,
} from '../src/core/mechanics/derivativeChain'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('costOfDimension（成本几何级数）', () => {
  it('首购成本 = baseCost', () => {
    // D1 开局自带 1 枚，首购成本含 growth^1；D2/D3 初始未持有，首购即 baseCost
    expect(costOfDimension(state, 2, 1).eq(150)).toBe(true)
    expect(costOfDimension(state, 3, 1).eq(11000)).toBe(true)
  })

  it('连续购买成本按 growth 递增', () => {
    state.cash = new Decimal(1e9)
    const c1 = costOfDimension(state, 1, 1)
    expect(buyDimension(state, 1, 1)).toBe(true)
    const c2 = costOfDimension(state, 1, 1)
    expect(c2.gt(c1)).toBe(true)
  })

  it('批量成本 = 单买累加', () => {
    buyDimension(state, 1, 5)
    const batch = costOfDimension(state, 1, 3)
    const single = costOfDimension(state, 1, 1)
      .add(costOfDimension(state, 1, 1))
    // 批量 = 首项 * (g^3-1)/(g-1)
    expect(batch.gt(single)).toBe(true)
  })
})

describe('buyDimension（购买）', () => {
  it('成功购买：扣现金 + 增加 bought/amount', () => {
    state.cash = new Decimal(1000)
    expect(buyDimension(state, 1, 2)).toBe(true)
    expect(state.dimensions[0].bought).toBe(3) // 初始 1 + 买 2
    expect(state.dimensions[0].amount.eq(3)).toBe(true)
    expect(state.cash.lt(1000)).toBe(true)
  })

  it('现金不足返回 false', () => {
    state.cash = new Decimal(5)
    expect(canAffordDimension(state, 1, 1)).toBe(false)
    expect(buyDimension(state, 1, 1)).toBe(false)
    expect(state.dimensions[0].bought).toBe(1) // 初始 1 枚保持不变
  })
})

describe('dimensionMultiplier（阶梯翻倍）', () => {
  it('每买 K 个翻倍', () => {
    const coin = coinTypeOf(1)
    const base = dimensionMultiplier(state, 1)
    state.dimensions[0].bought = coin.doublingEvery
    const after = dimensionMultiplier(state, 1)
    expect(after.eq(base.mul(2))).toBe(true)
  })
})

describe('tickDerivativeChain（导数级联）', () => {
  it('D1 无产出时现金不增长', () => {
    state.dimensions[0].amount = new Decimal(0) // 模拟无产出（开局自带 1 枚会产钱）
    const before = state.cash
    tickDerivativeChain(state, 1000)
    expect(state.cash.eq(before)).toBe(true)
  })

  it('购买 D1 后每秒产生现金 = amount × 倍率', () => {
    const cost = costOfDimension(state, 1, 10)
    state.cash = cost.add(100)
    expect(buyDimension(state, 1, 10)).toBe(true)
    const expectedRate = dimensionProductionPerSecond(state, 1)
    tickDerivativeChain(state, 1000)
    expect(state.cash.eq(cost.add(100).sub(cost).add(expectedRate))).toBe(true)
  })

  it('D2 产出注入 D1（级联）', () => {
    state.cash = new Decimal(1e12)
    buyDimension(state, 2, 5)
    state.dimensions[0].amount = new Decimal(0)
    const d2Rate = dimensionProductionPerSecond(state, 2)
    tickDerivativeChain(state, 1000)
    // D1.amount 增加 = D2 每秒产出
    expect(state.dimensions[0].amount.eq(d2Rate)).toBe(true)
  })

  it('dt 与产出成正比（微分累加）', () => {
    state.cash = new Decimal(1e9)
    buyDimension(state, 1, 10)
    const half = createDefaultGameState()
    half.cash = new Decimal(1e9)
    buyDimension(half, 1, 10)

    tickDerivativeChain(state, 2000)
    tickDerivativeChain(half, 1000)
    tickDerivativeChain(half, 1000)
    expect(state.cash.eq(half.cash)).toBe(true)
  })
})

describe('flipCoin（抛硬币）', () => {
  it('skull 面：不赚钱但 +1 骷髅代币', () => {
    const result = flipCoin(state, () => 0)
    expect(result.skull).toBe(true)
    expect(state.skullTokens).toBe(1)
    expect(state.stats.totalFlips).toBe(1)
  })

  it('dollar 面：赢得现金', () => {
    const result = flipCoin(state, () => 0.9)
    expect(result.skull).toBe(false)
    expect(result.earned.gt(0)).toBe(true)
    expect(state.cash.eq(result.earned)).toBe(true)
  })

  it('购买的硬币越多，点击收益越高', () => {
    flipCoin(state, () => 0.9)
    const first = state.cash
    state.cash = new Decimal(1e9)
    buyDimension(state, 1, 50)
    const rich = createDefaultGameState()
    rich.cash = new Decimal(1e9)
    buyDimension(rich, 1, 50)
    const r2 = flipCoin(rich, () => 0.9)
    expect(r2.earned.gt(first)).toBe(true)
  })
})
