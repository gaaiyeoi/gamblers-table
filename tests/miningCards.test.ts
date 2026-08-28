import { describe, expect, it } from 'vitest'

import { statIncreaseTo } from '../src/core/mechanics/mining/stats'
import { rebuildMults } from '../src/core/mechanics/mining/effects'
import {
  achievementLevel,
  createDefaultGameState,
  initMining,
  miningActivateCards,
  miningOpenPack,
  miningToggleCard,
  type GameState,
} from '../src/core'
import { cardCap, cardPower, openPack } from '../src/core/mechanics/mining/cards'
import { MINING_CARD_PACKS } from '../src/core/data/miningCards'

function fresh(): GameState {
  const state = createDefaultGameState()
  initMining(state)
  return state
}

describe('卡片', () => {
  it('绿宝石不足时无法开卡包', () => {
    const state = fresh()
    expect(miningOpenPack(state, 'intoDarkness').ok).toBe(false)
  })

  it('有绿宝石时开包消耗宝石并增加卡', () => {
    const state = fresh()
    state.mining.currency.gem_emerald = 1e6
    const result = miningOpenPack(state, 'intoDarkness')
    expect(result.ok).toBe(true)
    expect(result.cards.length).toBe(MINING_CARD_PACKS.intoDarkness.amount)
    expect(Object.keys(state.mining.cards).length).toBeGreaterThanOrEqual(1)
    expect(state.mining.currency.gem_emerald).toBe(1e6 - 45)
  })

  it('卡包在资源不足时逐张进入卡池，无副作用', () => {
    const state = fresh()
    state.mining.currency.gem_emerald = 1e9
    const result = openPack(state.mining, 'intoDarkness', () => 0.5)
    expect(result.ok).toBe(true)
    expect(result.cards.length).toBe(3)
  })

  it('默认装备上限为 1，超选会被截断', () => {
    const state = fresh()
    expect(cardCap(state.mining)).toBe(1)
    state.mining.cards = { 1: 1, 2: 1, 3: 1 }
    state.mining.cardSelected = [1, 2, 3]
    miningActivateCards(state)
    expect(state.mining.cardEquipped.length).toBe(1)
  })

  it('装备卡贡献卡力量', () => {
    const state = fresh()
    state.mining.cards = { 1: 1, 2: 1 }
    miningToggleCard(state, 1)
    miningToggleCard(state, 2)
    miningActivateCards(state)
    // 卡 1 力量 3、卡 2 力量 2；仅 1 张可装备
    expect(cardPower(state.mining)).toBe(3)
  })
})

describe('成就（keepUpgrade 正确来源）', () => {
  it('深度居民上限成就第 0 级奖励保留 craftingStation', () => {
    const state = fresh()
    statIncreaseTo(state.mining, 'depthDwellerCap0', 5)
    expect(achievementLevel(state.mining, 'depthDwellerCap0')).toBe(1)
    rebuildMults(state.mining)
    expect(state.mining.keepUpgrades['mining_craftingStation']).toBe(true)
  })

  it('树脂成就在第 3 级判定时发现蜂蜜罐遗物', () => {
    const state = fresh()
    statIncreaseTo(state.mining, 'resin', 400)
    expect(achievementLevel(state.mining, 'resin')).toBe(4)
    rebuildMults(state.mining)
    expect(state.mining.unlocks['relic_honeyPot']?.see).toBe(true)
  })

  it('深度不足时深度居民成就为 0，无奖励', () => {
    const state = fresh()
    expect(achievementLevel(state.mining, 'depthDwellerCap0')).toBe(0)
    rebuildMults(state.mining)
    expect(state.mining.keepUpgrades['mining_craftingStation']).not.toBe(true)
  })
})
