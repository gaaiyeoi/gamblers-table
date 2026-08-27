import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { setAutobuyer, tickAutobuyers, toggleAutobuyer } from '../src/core/mechanics/autobuyers'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('默认状态（自动购买开关）', () => {
  it('每个硬币维度都有独立开关，且默认关闭', () => {
    expect(state.autobuyers.length).toBe(state.dimensions.length)
    state.autobuyers.forEach((ab, i) => {
      expect(ab.tier).toBe(i + 1)
      expect(ab.enabled).toBe(false)
    })
  })
})

describe('tickAutobuyers（自动购买器）', () => {
  it('关闭状态：钱再多也不自动购买', () => {
    state.cash = new Decimal(1e9)
    expect(tickAutobuyers(state, 1500)).toBe(false)
    expect(state.dimensions[0].bought).toBe(0)
  })

  it('首次执行：未到间隔则不购买', () => {
    state.cash = new Decimal(1e9)
    setAutobuyer(state, 1, true)
    state.autobuyers[0]!.lastTick = 1000
    expect(tickAutobuyers(state, 1500)).toBe(false)
    expect(state.dimensions[0].bought).toBe(0)
  })

  it('到间隔 + 现金充足：自动购买', () => {
    state.cash = new Decimal(1e9)
    setAutobuyer(state, 1, true)
    state.autobuyers[0]!.lastTick = 0
    expect(tickAutobuyers(state, 1500)).toBe(true)
    expect(state.dimensions[0].bought).toBe(1)
  })

  it('到间隔 + 现金不足：不购买', () => {
    state.cash = new Decimal(1)
    setAutobuyer(state, 1, true)
    state.autobuyers[0]!.lastTick = 0
    expect(tickAutobuyers(state, 1500)).toBe(false)
    expect(state.dimensions[0].bought).toBe(0)
  })

  it('enabled=false：跳过', () => {
    state.cash = new Decimal(1e9)
    setAutobuyer(state, 1, false)
    state.autobuyers[0]!.lastTick = 0
    expect(tickAutobuyers(state, 5000)).toBe(false)
    expect(state.dimensions[0].bought).toBe(0)
  })

  it('只有开启的维度才会自动购买', () => {
    state.cash = new Decimal(1e9)
    // 只开启 D1，D2 保持关闭
    setAutobuyer(state, 1, true)
    state.autobuyers[0]!.lastTick = 0
    state.autobuyers[1]!.lastTick = 0
    expect(tickAutobuyers(state, 5000)).toBe(true)
    expect(state.dimensions[0].bought).toBe(1)
    expect(state.dimensions[1].bought).toBe(0)
  })
})

describe('toggleAutobuyer（开关切换）', () => {
  it('切换返回新状态', () => {
    expect(toggleAutobuyer(state, 1)).toBe(true)
    expect(state.autobuyers[0]!.enabled).toBe(true)
    expect(toggleAutobuyer(state, 1)).toBe(false)
    expect(state.autobuyers[0]!.enabled).toBe(false)
  })

  it('非法 tier 返回 null', () => {
    expect(toggleAutobuyer(state, 0)).toBeNull()
    expect(toggleAutobuyer(state, state.autobuyers.length + 1)).toBeNull()
  })
})
