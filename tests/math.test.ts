import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'

import { D1, D2, doublingMultiplier, exponentialCost, ratePerSecond, safeFloor } from '../src/core/math'

describe('doublingMultiplier（阶梯加成）', () => {
  it('每 k 个购买翻倍', () => {
    expect(doublingMultiplier(0, 10).eq(D1)).toBe(true)
    expect(doublingMultiplier(10, 10).eq(D2)).toBe(true)
    expect(doublingMultiplier(20, 10).eq(4)).toBe(true)
  })

  it('非法输入返回 1', () => {
    expect(doublingMultiplier(-1, 10).eq(D1)).toBe(true)
    expect(doublingMultiplier(5, 0).eq(D1)).toBe(true)
  })
})

describe('exponentialCost（成本缩放）', () => {
  it('成本 = base * growth^n', () => {
    const cost = exponentialCost(new Decimal(10), new Decimal(2), 3)
    expect(cost.eq(80)).toBe(true)
  })
})

describe('ratePerSecond（速率换算）', () => {
  it('1 秒产出 100', () => {
    expect(ratePerSecond(new Decimal(100), 1000).eq(100)).toBe(true)
  })

  it('500ms 产出 50', () => {
    expect(ratePerSecond(new Decimal(100), 500).eq(50)).toBe(true)
  })
})

describe('safeFloor（安全取整）', () => {
  it('去除浮点误差', () => {
    expect(safeFloor(new Decimal(10.999999)).eq(10)).toBe(true)
    expect(safeFloor(new Decimal(11)).eq(11)).toBe(true)
  })
})
