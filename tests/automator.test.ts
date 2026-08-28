import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { evaluateScript, parseAutomatorScript } from '../src/core/mechanics/automator'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('parseAutomatorScript（受限 DSL）', () => {
  it('解析 prestige 规则', () => {
    const rules = parseAutomatorScript('if cash >= 1e6 then prestige 1')
    expect(rules).toHaveLength(1)
    expect(rules[0]?.action).toEqual({ type: 'prestige', tier: 1 })
  })

  it('解析 reputation 规则', () => {
    const rules = parseAutomatorScript('if reputation >= 5 then prestige 2')
    expect(rules[0]?.action).toEqual({ type: 'prestige', tier: 2 })
  })

  it('拒绝任意 JavaScript', () => {
    expect(() => parseAutomatorScript('window.alert(1)')).toThrow()
    expect(() => parseAutomatorScript('start challenge darkMatter')).toThrow()
  })
})

describe('evaluateScript（条件命中）', () => {
  it('cash 达标返回 prestige 动作', () => {
    state.cash = new Decimal(1e6)
    const result = evaluateScript(state, 'if cash >= 1e6 then prestige 1')
    expect(result.error).toBeNull()
    expect(result.action).toEqual({ type: 'prestige', tier: 1 })
  })

  it('条件未命中返回 null', () => {
    state.cash = new Decimal(10)
    const result = evaluateScript(state, 'if cash >= 1e6 then prestige 1')
    expect(result.action).toBeNull()
    expect(result.error).toBeNull()
  })

  it('错误结构化返回，不抛出到主循环', () => {
    const result = evaluateScript(state, 'invalid syntax')
    expect(result.action).toBeNull()
    expect(result.error).not.toBeNull()
  })
})
