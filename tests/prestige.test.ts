import { beforeEach, describe, expect, it } from 'vitest'

import {
  canPrestige,
  createDefaultGameState,
  doMiningPrestige,
  initMining,
  miningDwellerLimit,
  miningPrestigePreview,
  prestigeReset,
  previewPrestigeReward,
  type GameState,
} from '../src/core'

let state: GameState

/** 造一份「深度居民已解锁、居民已堆到上限」的存档。 */
function withDweller(depth: number): GameState {
  const s = createDefaultGameState()
  s.mining.maxDepth0 = depth
  s.mining.unlocks.miningDepthDweller = { see: true, use: true }
  initMining(s)
  s.mining.depthDweller0 = miningDwellerLimit(s)
  s.mining.depthDwellerCap0 = miningDwellerLimit(s)
  return s
}

beforeEach(() => {
  state = createDefaultGameState()
})

describe('canPrestige（采矿转生，基于深度居民）', () => {
  it('未解锁深度居民时不可转生', () => {
    state.mining.maxDepth0 = 100
    expect(canPrestige(state, 1)).toBe(false)
  })

  it('居民为 0 时不可转生', () => {
    const s = withDweller(100)
    s.mining.depthDweller0 = 0
    s.mining.depthDwellerCap0 = 0
    expect(canPrestige(s, 1)).toBe(false)
  })

  it('居民堆满后可转生', () => {
    expect(canPrestige(withDweller(100), 1)).toBe(true)
  })

  it('转生后居民清零，无法立即再次转生', () => {
    const s = withDweller(100)
    doMiningPrestige(s, 0)
    expect(s.mining.depthDweller0).toBe(0)
    expect(canPrestige(s, 1)).toBe(false)
  })
})

describe('previewPrestigeReward（奖励预览，绿水晶）', () => {
  it('未解锁时预览为 0', () => {
    state.mining.maxDepth0 = 500
    expect(previewPrestigeReward(state, 1).eq(0)).toBe(true)
  })

  it('深度越深、居民越多，水晶越多', () => {
    const shallow = miningPrestigePreview(withDweller(50))
    const deep = miningPrestigePreview(withDweller(400))
    expect(deep).toBeGreaterThan(shallow)
  })

  it('无居民时返回 0', () => {
    const s = withDweller(100)
    s.mining.depthDweller0 = 0
    s.mining.depthDwellerCap0 = 0
    expect(previewPrestigeReward(s, 1).eq(0)).toBe(true)
  })
})

describe('prestigeReset（执行转生）', () => {
  it('成功：绿水晶进入 prestige 通货', () => {
    const s = withDweller(200)
    const before = previewPrestigeReward(s, 1)
    const reward = prestigeReset(s, 1)
    expect(reward.eq(before)).toBe(true)
    expect(s.prestige.currency.crystalGreen?.eq(before)).toBe(true)
    expect(s.prestige.tier).toBe(1)
  })

  it('不满足条件返回 0 且不发放通货', () => {
    const reward = prestigeReset(state, 1)
    expect(reward.eq(0)).toBe(true)
    expect(state.prestige.currency.crystalGreen).toBeUndefined()
  })
})

describe('doMiningPrestige（采矿当局重置）', () => {
  it('清空深度/镐子/槽位/击碎记录/增强/熔炼，保留水晶与声望升级', () => {
    const s = withDweller(300)
    s.mining.depth = 250
    s.mining.pickaxePower = 1e6
    s.mining.ingredientList = [{ name: 'oreAluminium', compress: 0 }]
    s.mining.breaks = new Array(250).fill(3)
    s.mining.enhancement.barAluminium = 2
    s.mining.smeltery.aluminium.stored = 5
    s.mining.upgrades.damageUp = 40
    s.mining.prestigeUpgrades.crystalBasics = 3

    const result = doMiningPrestige(s, 0)

    expect(result.crystal).toBeGreaterThan(0)
    expect(s.mining.depth).toBe(1)
    expect(s.mining.pickaxePower).toBe(8)
    expect(s.mining.ingredientList.length).toBe(0)
    expect(s.mining.breaks.length).toBe(0)
    expect(s.mining.enhancement.barAluminium).toBe(0)
    expect(s.mining.smeltery.aluminium.stored).toBe(0)
    // 常规升级被清空，声望升级保留
    expect(s.mining.upgrades.damageUp).toBe(0)
    expect(s.mining.prestigeUpgrades.crystalBasics).toBe(3)
    // 水晶保留
    expect(s.mining.currency.crystalGreen).toBeGreaterThan(0)
  })
})
