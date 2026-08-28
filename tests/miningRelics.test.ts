import { describe, expect, it } from 'vitest'

import { createDefaultGameState, initMining, miningRelicUnlocked } from '../src/core'
import { useRelicActive } from '../src/core/mechanics/mining/actions'
import type { GameState } from '../src/core'

function fresh(): GameState {
  const state = createDefaultGameState()
  initMining(state)
  return state
}

describe('遗物解锁', () => {
  it('friendlyBat 需全局等级 ≥ 40（maxDepth0 - 1 ≥ 40）', () => {
    const state = fresh()
    state.mining.maxDepth0 = 40
    initMining(state)
    expect(miningRelicUnlocked(state, 'friendlyBat')).toBe(false)

    state.mining.maxDepth0 = 41
    initMining(state)
    expect(miningRelicUnlocked(state, 'friendlyBat')).toBe(true)
  })

  it('honeyPot 需树脂成就发现（unlock.relic_honeyPot）', () => {
    const state = fresh()
    expect(miningRelicUnlocked(state, 'honeyPot')).toBe(false)
    state.mining.unlocks['relic_honeyPot'] = { see: true, use: true }
    expect(miningRelicUnlocked(state, 'honeyPot')).toBe(true)
  })
})

describe('遗物被动效果', () => {
  it('friendlyBat 解锁后废料增益 ×1.25', () => {
    const state = fresh()
    state.mining.maxDepth0 = 41
    initMining(state)
    expect(state.mining.mults.currencyMiningScrapGain.mult['relic_friendlyBat']).toBe(1.25)
  })

  it('honeyPot 解锁后树脂上限 +1', () => {
    const state = fresh()
    state.mining.unlocks['relic_honeyPot'] = { see: true, use: true }
    initMining(state)
    expect(state.mining.mults.miningResinMax.base['relic_honeyPot']).toBe(1)
  })
})

describe('遗物主动技能', () => {
  it('遗物之力不足时无法发动', () => {
    const state = fresh()
    state.mining.maxDepth0 = 41
    initMining(state)
    state.mining.relicPower = 0
    expect(useRelicActive(state.mining, 'friendlyBat').ok).toBe(false)
  })

  it('friendlyBat 发动消耗 8 点遗物之力并获取废料', () => {
    const state = fresh()
    state.mining.maxDepth0 = 41
    initMining(state)
    state.mining.relicPower = 10
    const before = state.mining.currency.scrap ?? 0
    const result = useRelicActive(state.mining, 'friendlyBat')
    expect(result.ok).toBe(true)
    expect(result.gain).toBeGreaterThan(0)
    expect(state.mining.relicPower).toBeCloseTo(2, 6)
    expect(state.mining.currency.scrap ?? 0).toBeGreaterThan(before)
  })

  it('honeyPot 发动消耗 10 点并获取树脂', () => {
    const state = fresh()
    state.mining.unlocks['relic_honeyPot'] = { see: true, use: true }
    initMining(state)
    state.mining.relicPower = 12
    const result = useRelicActive(state.mining, 'honeyPot')
    expect(result.ok).toBe(true)
    expect(result.gain).toBeGreaterThan(0)
    expect(state.mining.relicPower).toBeCloseTo(2, 6)
  })

  it('未解锁的遗物无法发动', () => {
    const state = fresh()
    state.mining.relicPower = 100
    expect(useRelicActive(state.mining, 'honeyPot').ok).toBe(false)
  })
})
