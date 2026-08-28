import { describe, expect, it } from 'vitest'

import {
  createDefaultGameState,
  currencyOf,
  ensureDurability,
  initMining,
  miningAddIngredient,
  miningCraftPickaxe,
  miningDepthHitsNeeded,
  miningSetDepth,
  miningUpgradeUnlocked,
  tickMining,
  upgradeLevel,
} from '../src/core'
import { MINING_ORES, depthBaseScrap } from '../src/core/data/mining'
import { MINING_GAS_UPGRADES, MINING_PRESTIGE_UPGRADES, MINING_UPGRADES } from '../src/core/data/miningUpgrades'
import { buyUpgrade, canBuyUpgrade } from '../src/core/mechanics/mining/actions'

/**
 * 冒烟：用贪心策略推演矿场长周期。
 *
 * 策略：
 * - 每秒把所有买得起的升级各升 1 级
 * - 每 5 秒塞一块最好的矿石并锻造
 * - 每 30 秒挑「废料/秒」最高的层待着（Gooboo 的核心操作：在旧层刷资源）
 */
function simulate(seconds: number) {
  const state = createDefaultGameState()
  initMining(state)
  ensureDurability(state)
  // 模拟玩家在设置里打开了「自动下潜：90 秒内可击碎则前进」
  state.mining.autoProgress = 90

  const all = [...MINING_UPGRADES, ...MINING_GAS_UPGRADES, ...MINING_PRESTIGE_UPGRADES]

  for (let t = 1; t <= seconds; t += 1) {
    tickMining(state, 1000)

    if (t % 5 === 0) {
      state.mining.ingredientList = []
      for (const ore of MINING_ORES) {
        if (miningAddIngredient(state, ore.id)) break
      }
      if (state.mining.ingredientList.length > 0) {
        miningCraftPickaxe(state)
      }
      state.mining.ingredientList = []
    }

    for (const def of all) {
      if (!miningUpgradeUnlocked(state, def.id)) continue
      if (canBuyUpgrade(state.mining, def.id)) {
        buyUpgrade(state.mining, def.id)
      }
    }

    if (t % 30 === 0) {
      const max = state.mining.maxDepth0
      let best = state.mining.depth
      let bestValue = -1
      for (let d = 1; d <= max; d += 1) {
        const hits = miningDepthHitsNeeded(state, d)
        if (!Number.isFinite(hits)) continue
        const value = depthBaseScrap(d, 0) * (4 / Math.max(1, hits) + 1)
        if (value > bestValue) {
          bestValue = value
          best = d
        }
      }
      if (best !== state.mining.depth) {
        miningSetDepth(state, best)
      }
    }
  }
  return state
}

describe('mining 长周期推演（贪心策略）', () => {
  it('60 秒内应能击碎第 1 层并产出废料', () => {
    const state = simulate(60)
    expect(state.mining.maxDepth0).toBeGreaterThan(1)
    expect(currencyOf(state, 'scrap')).toBeGreaterThan(0)
  })

  it('10 分钟内应能推进到 10 层以上（升级树解锁链可用）', () => {
    const state = simulate(600)
    expect(state.mining.maxDepth0).toBeGreaterThanOrEqual(10)
    expect(upgradeLevel(state, 'damageUp')).toBeGreaterThan(3)
  })

  it('1 小时内应能推进到 14 层以上（硬度墙可用伤害突破）', () => {
    const state = simulate(3600)
    expect(state.mining.maxDepth0).toBeGreaterThanOrEqual(14)
  })

  it('自动升级开启后能自行推进（本项目扩展，Gooboo 无此功能）', () => {
    const state = createDefaultGameState()
    initMining(state)
    ensureDurability(state)
    state.mining.autoProgress = 90
    state.mining.autoBuyUpgrades = true

    for (let t = 1; t <= 3600; t += 1) {
      tickMining(state, 1000)
      if (state.mining.depth < state.mining.maxDepth0) {
        miningSetDepth(state, state.mining.maxDepth0)
      }
    }

    // 自动购买确实发生了
    expect(upgradeLevel(state, 'damageUp')).toBeGreaterThan(5)
    expect(state.mining.maxDepth0).toBeGreaterThan(5)
  })

  it('自动升级默认关闭（与 Gooboo 行为一致，不自行购买）', () => {
    const state = createDefaultGameState()
    expect(state.mining.autoBuyUpgrades).toBe(false)

    initMining(state)
    ensureDurability(state)
    state.mining.currency.scrap = 1e12
    tickMining(state, 60_000)
    expect(upgradeLevel(state, 'damageUp')).toBe(0)
  })

  it('长时间推演不应产生 NaN / Infinity / 负数', () => {
    const state = simulate(7200)
    for (const key in state.mining.currency) {
      const v = state.mining.currency[key]
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
    expect(Number.isFinite(state.mining.depth)).toBe(true)
    expect(Number.isFinite(state.mining.durability)).toBe(true)
    expect(Number.isFinite(state.mining.pickaxePower)).toBe(true)
    expect(state.mining.depth).toBeGreaterThanOrEqual(1)
    expect(state.mining.depth).toBeLessThanOrEqual(state.mining.maxDepth0)
  })
})
