import { describe, expect, it } from 'vitest'

import { createDefaultGameState, currencyOf, initMining } from '../src/core'
import { gainCurrency } from '../src/core/mechanics/mining/core'

/** 构造一份已初始化、且耐久填充完毕的存档。 */
function fresh() {
  const state = createDefaultGameState()
  initMining(state)
  return state
}

describe('currency overcap（对齐 Gooboo store/currency.js → gain）', () => {
  it('无上限货币直接累加，不受 cap 约束', () => {
    const state = fresh()
    state.mining.currency.granite = 100
    const gained = gainCurrency(state.mining, 'granite', 50)
    expect(gained).toBe(50)
    expect(currencyOf(state, 'granite')).toBe(150)
  })

  it('smoke（cap 10, overcap 0.25/0.25）：第 0 段满额，之后衰减累积', () => {
    const state = fresh()
    state.mining.currency.smoke = 9
    // 剩余 1 以满额进入第 0 段，剩余 9 以 0.25 进入第 1 段 → 9*0.25 = 2.25
    const gained = gainCurrency(state.mining, 'smoke', 10)
    expect(gained).toBeCloseTo(3.25, 6)
    expect(currencyOf(state, 'smoke')).toBeCloseTo(12.25, 6)
  })

  it('smoke 达到上限后仍可持续超出 cap（逐段衰减累积）', () => {
    const state = fresh()
    state.mining.currency.smoke = 10
    gainCurrency(state.mining, 'smoke', 100)
    // 第 1 段 room=10 @0.25 → 得 10；第 2 段 @0.25²=0.0625，吃满剩余 60 raw → 得 3.75
    expect(currencyOf(state, 'smoke')).toBeCloseTo(23.75, 6)
  })

  it('ember（cap 100, overcap 1/0）：可线性超出一段（100），再多即封顶', () => {
    const state = fresh()
    state.mining.currency.ember = 100
    gainCurrency(state.mining, 'ember', 50)
    expect(currencyOf(state, 'ember')).toBe(150)

    gainCurrency(state.mining, 'ember', 50)
    expect(currencyOf(state, 'ember')).toBe(200)

    // 已到第 2 段，overcapScaling=0 使该段倍率为 0 → 不再增长
    gainCurrency(state.mining, 'ember', 50)
    expect(currencyOf(state, 'ember')).toBe(200)
  })

  it('scrap（cap 10K, 默认 overcap 0.25/0.5）：达到上限后按 0.25 继续累积', () => {
    const state = fresh()
    state.mining.currency.scrap = 10_000
    const gained = gainCurrency(state.mining, 'scrap', 100)
    expect(gained).toBeCloseTo(25, 6)
    expect(currencyOf(state, 'scrap')).toBeCloseTo(10_025, 6)
  })

  it('amount<=0 时不产生任何变化', () => {
    const state = fresh()
    state.mining.currency.smoke = 5
    expect(gainCurrency(state.mining, 'smoke', 0)).toBe(0)
    expect(currencyOf(state, 'smoke')).toBe(5)
  })
})
