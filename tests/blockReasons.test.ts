import { describe, expect, it } from 'vitest'

import {
  createDefaultGameState,
  enhanceBlockReason,
  fillFurnaceBlockReason,
  gasUpgradeBlockReason,
  initMining,
  miningUpgradeBlockReason,
  prestigeBlockReason,
  prestigeUpgradeBlockReason,
} from '../src/core'

/** 初始化一份带完整乘区表的存档。 */
function fresh() {
  const state = createDefaultGameState()
  initMining(state)
  return state
}

describe('blockReasons.miningUpgrade', () => {
  it('废料不足时给出 scrap 原因', () => {
    const reason = miningUpgradeBlockReason(fresh(), 'damageUp')
    expect(reason?.kind).toBe('scrap')
    expect(reason?.need).toBe(120)
  })

  it('资源足够时没有原因', () => {
    const state = fresh()
    state.mining.currency.scrap = 1e6
    expect(miningUpgradeBlockReason(state, 'damageUp')).toBeNull()
  })

  it('深度不足时给出 locked 原因', () => {
    const state = fresh()
    state.mining.currency.scrap = 1e12
    const reason = miningUpgradeBlockReason(state, 'scrapGainUp')
    expect(reason?.kind).toBe('locked')
    expect(reason?.requiresId).toBe('scrapGainUp')
  })

  it('分级解锁未达标时给出 depth 原因（oreSlots 第 3 槽需 30 层）', () => {
    const state = fresh()
    state.mining.maxDepth0 = 25
    state.mining.currency.oreAluminium = 1e6
    state.mining.upgrades.oreSlots = 2
    initMining(state)
    const reason = miningUpgradeBlockReason(state, 'oreSlots')
    expect(reason?.kind).toBe('depth')
  })

  it('满级时给出 capped 原因', () => {
    const state = fresh()
    state.mining.currency.scrap = 1e30
    state.mining.maxDepth0 = 20
    state.mining.upgrades.scrapCapacityUp = 50
    initMining(state)
    const reason = miningUpgradeBlockReason(state, 'scrapCapacityUp')
    expect(reason?.kind).toBe('capped')
    expect(reason?.cap).toBe(50)
  })

  it('矿石不足时给出 ore 原因', () => {
    const state = fresh()
    state.mining.maxDepth0 = 15
    state.mining.currency.scrap = 1e12
    initMining(state)
    const reason = miningUpgradeBlockReason(state, 'aluminiumCache')
    expect(reason?.kind).toBe('ore')
    expect(reason?.resourceId).toBe('oreAluminium')
  })
})

describe('blockReasons.gasUpgrade', () => {
  it('气态子模式最大深度不足时不可见 → locked', () => {
    const state = fresh()
    state.mining.maxDepth1 = 10
    const reason = gasUpgradeBlockReason(state, 'minecart')
    expect(reason?.kind).toBe('locked')
  })

  it('气态子模式深度足够、资源不足时给出资源原因', () => {
    const state = fresh()
    state.mining.subfeature = 1
    state.mining.maxDepth1 = 100
    state.mining.currency.scrap = 1e30
    initMining(state)
    // minecart 需要石灰石
    expect(gasUpgradeBlockReason(state, 'minecart')?.kind).toBe('gas')

    state.mining.currency.limestone = 1e12
    expect(gasUpgradeBlockReason(state, 'minecart')).toBeNull()
  })
})

describe('blockReasons.others', () => {
  it('声望升级绿水晶不足时给出 crystal 原因', () => {
    const reason = prestigeUpgradeBlockReason(fresh(), 'crystalBasics')
    expect(reason?.kind).toBe('crystal')
    expect(reason?.need).toBe(5)
  })

  it('熔炼产线未投料时给出 furnace 原因', () => {
    const reason = fillFurnaceBlockReason(fresh(), 'barAluminium')
    expect(reason?.kind).toBe('furnace')
  })

  it('增强：未选锭 → ingredient，锭不足 → bars', () => {
    const state = fresh()
    expect(enhanceBlockReason(state)?.kind).toBe('ingredient')

    state.mining.enhancementIngredient = 'barAluminium'
    expect(enhanceBlockReason(state)?.kind).toBe('bars')

    state.mining.currency.barAluminium = 100
    expect(enhanceBlockReason(state)).toBeNull()
  })

  it('转生：未解锁深度居民 → locked，居民不足 → threshold', () => {
    const state = fresh()
    expect(prestigeBlockReason(state, 1)?.kind).toBe('locked')

    state.mining.unlocks.miningDepthDweller = { see: true, use: true }
    initMining(state)
    expect(prestigeBlockReason(state, 1)?.kind).toBe('threshold')
  })
})
