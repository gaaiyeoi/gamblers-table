import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'

import { formatCash, formatNumber, formatRate } from '../src/core/format'

describe('formatNumber', () => {
  it('小于百万：逗号分隔整数', () => {
    expect(formatNumber(new Decimal(149))).toBe('149')
    expect(formatNumber(new Decimal(10000))).toBe('10,000')
    expect(formatNumber(new Decimal(938251917))).toBe('938,251,917')
  })

  it('科学计数法', () => {
    expect(formatNumber(new Decimal('1.5e12'), 'scientific')).toBe('1.50e12')
  })

  it('工程计数法', () => {
    expect(formatNumber(new Decimal('1.5e12'), 'engineering')).toBe('1.50 T')
  })

  it('负数与零', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(new Decimal(-100))).toBe('-100')
  })
})

describe('formatCash', () => {
  it('小面额', () => {
    expect(formatCash(new Decimal(149))).toBe('$149')
    expect(formatCash(new Decimal(10000))).toBe('$10,000')
  })

  it('大面额带单位后缀', () => {
    expect(formatCash(new Decimal('2.1e6'))).toBe('2.10 M$')
    expect(formatCash(new Decimal('14.2e6'))).toBe('14.20 M$')
  })
})

describe('formatRate', () => {
  it('每秒产出', () => {
    expect(formatRate(new Decimal(500))).toBe('$500/sec')
    expect(formatRate(new Decimal('2e6'))).toBe('2.00 M$/sec')
  })
})
