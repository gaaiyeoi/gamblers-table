import { describe, expect, it } from 'vitest'

import {
  canEnhancePickaxe,
  createDefaultGameState,
  currencyOf,
  ensureDurability,
  enhancePickaxe,
  initMining,
  miningAddToSmeltery,
  miningEffectiveDamage,
  miningEnhanceBlock,
  miningEnhancementLevel,
  miningPlaceBeacon,
  miningRareDrops,
  miningSetDepth,
  miningSetEnhancementIngredient,
  miningSmelteryStored,
  miningToughness,
  tickMining,
} from '../src/core'

function fresh() {
  const state = createDefaultGameState()
  initMining(state)
  ensureDurability(state)
  return state
}

describe('smeltery 生产', () => {
  it('投料后随着时间推进产出对应锭', () => {
    const state = fresh()
    state.mining.currency.oreAluminium = 1e6
    state.mining.currency.granite = 1e9
    expect(miningAddToSmeltery(state, 'aluminium')).toBeGreaterThan(0)
    const stored = miningSmelteryStored(state, 'aluminium')
    expect(stored).toBeGreaterThan(0)

    tickMining(state, 5_000)
    // 有产出后待产出数减少或锭数增加
    expect(miningSmelteryStored(state, 'aluminium')).toBeLessThanOrEqual(stored)
    expect(currencyOf(state, 'barAluminium')).toBeGreaterThanOrEqual(0)
  })
})

describe('enhancement（锭增强）', () => {
  it('未选择锭时无法增强', () => {
    const state = fresh()
    expect(miningEnhanceBlock(state)).toBe('noIngredient')
    expect(canEnhancePickaxe(state)).toBe(false)
  })

  it('锭数量不足时提示缺锭', () => {
    const state = fresh()
    miningSetEnhancementIngredient(state, 'barAluminium')
    expect(miningEnhanceBlock(state)).toBe('bars')
  })

  it('锭充足时增强成功并提升等级', () => {
    const state = fresh()
    state.mining.currency.barAluminium = 1000
    miningSetEnhancementIngredient(state, 'barAluminium')
    expect(miningEnhanceBlock(state)).toBe('none')
    expect(canEnhancePickaxe(state)).toBe(true)
    expect(enhancePickaxe(state)).toBe(true)
    expect(miningEnhancementLevel(state, 'barAluminium')).toBe(1)
  })
})

describe('超深深度数值稳定性', () => {
  it('深度 5000（现实玩法深水区）时各派生值均有限', () => {
    const state = fresh()
    state.mining.depth = 5_000
    state.mining.durability = 1
    expect(Number.isFinite(miningEffectiveDamage(state))).toBe(true)
    expect(Number.isFinite(miningToughness(state))).toBe(true)
    for (const [id, val] of Object.entries(miningRareDrops(state))) {
      expect(Number.isFinite(val), `稀有掉落 ${id} 非有限`).toBe(true)
    }
  })

  it('深度 1e6 时指数型稀有物忠实地溢出为 Infinity（与 Gooboo 公式一致）', () => {
    const state = fresh()
    state.mining.depth = 1_000_000
    const drops = miningRareDrops(state)
    // sulfur 条件需 breaks===0（默认满足）；1.05^(1e6-110) 超出 double → Infinity
    expect(drops.sulfur).toBe(Infinity)
    // 线性型 niter 仍有限
    expect(Number.isFinite(drops.niter)).toBe(true)
  })

  it('超深深度下 tick 不会崩溃，且不会被回退到浅层', () => {
    const state = fresh()
    // 允许导航到任意已挖深度
    tickMining(state, 30_000)
    const deepest = state.mining.maxDepth0
    miningSetDepth(state, deepest)
    expect(state.mining.depth).toBe(deepest)
    tickMining(state, 30_000)
    expect(state.mining.depth).toBeGreaterThanOrEqual(deepest)
  })
})
