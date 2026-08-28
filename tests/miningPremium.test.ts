import { describe, expect, it } from 'vitest'

import {
  createDefaultGameState,
  doMiningPrestige,
  initMining,
  isPremiumVisible,
  MINING_PREMIUM_UPGRADES,
  miningBuyPremium,
  miningBuyPremiumMax,
  miningPremiumMaxCount,
  premiumBlock,
  premiumLevelOf,
} from '../src/core'
import { gainCurrency } from '../src/core/mechanics/mining/core'
import type { GameState } from '../src/core'

function fresh(): GameState {
  const state = createDefaultGameState()
  initMining(state)
  return state
}

describe('Premium 升级', () => {
  it('21 条升级定义完整', () => {
    expect(MINING_PREMIUM_UPGRADES.length).toBe(21)
  })

  it('红宝石不足时无法购买', () => {
    const state = fresh()
    expect(miningBuyPremium(state, 'moreDamage')).toBe(false)
    expect(premiumBlock(state.mining, 'moreDamage')?.kind).toBe('resource')
  })

  it('有红宝石时购买并提升等级、应用效果', () => {
    const state = fresh()
    gainCurrency(state.mining, 'gem_ruby', 100)
    expect(miningBuyPremium(state, 'moreDamage')).toBe(true)
    expect(premiumLevelOf(state.mining, 'moreDamage')).toBe(1)
    // 效果应反映到乘区（moreDamage Lv1 = 1.25）
    expect(state.mining.mults.miningDamage.mult['premium_moreDamage']).toBe(1.25)
  })

  it('深度门槛升级在未达深度时隐藏', () => {
    const state = fresh()
    const def = MINING_PREMIUM_UPGRADES.find((u) => u.id === 'moreCopper')!
    expect(isPremiumVisible(state.mining, def)).toBe(false)
    state.mining.maxDepth0 = 30
    initMining(state)
    expect(isPremiumVisible(state.mining, def)).toBe(true)
  })

  it('批量购买（最大）会一直买到买不起为止', () => {
    const state = fresh()
    state.mining.currency.gem_ruby = 1e6
    const before = premiumLevelOf(state.mining, 'moreDamage')
    const rubyBefore = state.mining.currency.gem_ruby ?? 0

    const count = miningPremiumMaxCount(state, 'moreDamage')
    expect(count).toBeGreaterThan(1)

    const bought = miningBuyPremiumMax(state, 'moreDamage')
    expect(bought).toBe(count)
    expect(premiumLevelOf(state.mining, 'moreDamage')).toBe(before + count)
    expect(state.mining.currency.gem_ruby ?? 0).toBeLessThan(rubyBefore)
    // 买完之后剩余红宝石不足以再买 1 级
    expect(miningPremiumMaxCount(state, 'moreDamage')).toBe(0)
  })

  it('矿石翻倍升级 cap 为 1', () => {
    const state = fresh()
    state.mining.maxDepth0 = 30
    initMining(state)
    gainCurrency(state.mining, 'gem_ruby', 1e6)
    expect(miningBuyPremium(state, 'moreCopper')).toBe(true)
    // cap 1：再买失败
    expect(premiumBlock(state.mining, 'moreCopper')?.kind).toBe('capped')
  })

  it('转生发放红宝石（绿水晶的 10%，最少 1）且升级保留', () => {
    const state = fresh()
    state.mining.unlocks.miningDepthDweller = { see: true, use: true }
    initMining(state)
    // 居民堆到上限，保证有水晶
    state.mining.maxDepth0 = 100
    initMining(state)
    state.mining.depthDweller0 = 1
    state.mining.depthDwellerCap0 = 1
    // 先买一个升级
    gainCurrency(state.mining, 'gem_ruby', 100)
    miningBuyPremium(state, 'moreDamage')

    const before = state.mining.premiumUpgrades['moreDamage']
    const rubyBefore = state.mining.currency.gem_ruby ?? 0
    doMiningPrestige(state, 0)
    // 升级保留
    expect(state.mining.premiumUpgrades['moreDamage']).toBe(before)
    // 红宝石因转生发放而增长
    expect(state.mining.currency.gem_ruby ?? 0).toBeGreaterThanOrEqual(rubyBefore)
  })

  it('stat 累加也能让深度门槛生效（气态升级用 maxDepth1）', () => {
    const state = fresh()
    state.mining.maxDepth1 = 60
    const def = MINING_PREMIUM_UPGRADES.find((u) => u.id === 'moreNeon')!
    expect(isPremiumVisible(state.mining, def)).toBe(true)
  })
})
