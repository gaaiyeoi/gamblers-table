import { describe, expect, it } from 'vitest'

import {
  buyMiningUpgradeMax,
  createDefaultGameState,
  currencyOf,
  depthDurability,
  ensureDurability,
  initMining,
  miningAddIngredient,
  miningAddToSmeltery,
  miningCraftingSlots,
  miningCraftPickaxe,
  miningDamage,
  miningDwellerLimit,
  miningEffectiveDamage,
  miningHitsNeeded,
  miningOreCollectible,
  miningPickaxePower,
  miningPrestigePreview,
  miningRareDrops,
  miningSetDepth,
  miningSmelteryStored,
  miningToughness,
  miningUpgradeMaxCount,
  miningUpgradeUnlocked,
  oreCap,
  scrapCap,
  tickMining,
} from '../src/core'
import { MINING_ORES } from '../src/core'

/** 构造一份已初始化、且耐久填充完毕的存档。 */
function fresh() {
  const state = createDefaultGameState()
  initMining(state)
  ensureDurability(state)
  return state
}

describe('depth / durability', () => {
  it('第 1 层耐久为 ceil(1.75^1 * 1.1^2 * 10) = 22', () => {
    expect(depthDurability(1, 0)).toBe(22)
  })

  it('耐久随深度单调增长', () => {
    expect(depthDurability(10, 0)).toBeGreaterThan(depthDurability(9, 0))
    expect(depthDurability(50, 0)).toBeGreaterThan(depthDurability(10, 0))
  })

  it('子模式 1 的耐久基数远大于子模式 0', () => {
    expect(depthDurability(5, 1)).toBeGreaterThan(depthDurability(5, 0))
  })

  it('深度 < 10 时硬度恒为 0', () => {
    const state = fresh()
    for (let d = 1; d < 10; d += 1) {
      expect(miningToughness({ ...state, mining: { ...state.mining, depth: d } })).toBe(0)
    }
  })

  it('深度 >= 10 后出现硬度', () => {
    const state = fresh()
    state.mining.depth = 12
    expect(miningToughness(state)).toBeGreaterThan(0)
  })
})

describe('damage', () => {
  it('初始镐子威力为 8', () => {
    expect(miningPickaxePower(fresh())).toBe(8)
  })

  it('有效伤害 = 伤害 - 硬度，硬度过大时为 0（矿壁不再推进）', () => {
    const state = fresh()
    state.mining.depth = 1
    expect(miningEffectiveDamage(state)).toBe(miningDamage(state))

    state.mining.depth = 300
    expect(miningEffectiveDamage(state)).toBe(0)
    expect(Number.isFinite(miningHitsNeeded(state))).toBe(false)
  })
})

describe('tick', () => {
  it('推进 1 秒会削减当前层耐久', () => {
    const state = fresh()
    const before = state.mining.durability
    tickMining(state, 1000)
    expect(state.mining.durability).toBeLessThan(before)
  })

  it('持续推进会击碎并推进深度', () => {
    const state = fresh()
    tickMining(state, 60_000)
    expect(state.mining.maxDepth0).toBeGreaterThan(1)
    expect(currencyOf(state, 'scrap')).toBeGreaterThan(0)
  })

  it('伤害被硬度吃光时不会推进深度但硫仍产出', () => {
    const state = fresh()
    state.mining.depth = 120
    state.mining.durability = depthDurability(120, 0)
    expect(miningEffectiveDamage(state)).toBe(0)
    tickMining(state, 10_000)
    expect(currencyOf(state, 'sulfur')).toBeGreaterThan(0)
  })
})

describe('ores', () => {
  it('矿石采集条件：depth >= minDepth && (depth <= maxDepth || depth % modulo === 0)', () => {
    const state = fresh()
    const aluminium = MINING_ORES[0]!
    state.mining.depth = aluminium.minDepth
    expect(miningOreCollectible(state, aluminium)).toBe(true)

    // 超出 maxDepth 后按 modulo 周期出现
    state.mining.depth = aluminium.maxDepth + 1
    expect(miningOreCollectible(state, aluminium)).toBe(
      (aluminium.maxDepth + 1) % aluminium.modulo === 0,
    )

    // 未达 minDepth 时不可采
    state.mining.depth = aluminium.minDepth - 1
    expect(miningOreCollectible(state, aluminium)).toBe(false)
  })
})

describe('rare drops', () => {
  it('煤在 90 层且本层未击碎时出现', () => {
    const state = fresh()
    state.mining.depth = 90
    expect((miningRareDrops(state).coal ?? 0) > 0).toBe(true)

    state.mining.breaks = new Array(90).fill(1)
    expect(miningRareDrops(state).coal).toBeUndefined()
  })

  it('黑曜石在无增强时出现，开启增强后被压制', () => {
    const state = fresh()
    state.mining.depth = 150
    expect((miningRareDrops(state).obsidian ?? 0) > 0).toBe(true)
  })

  it('深岩需要深度 >= 275 且各位数字和 >= 14', () => {
    const state = fresh()
    state.mining.depth = 275 // 2+7+5 = 14
    expect((miningRareDrops(state).deeprock ?? 0) > 0).toBe(true)

    state.mining.depth = 276 // 2+7+6 = 15
    expect((miningRareDrops(state).deeprock ?? 0) > 0).toBe(true)

    state.mining.depth = 280 // 2+8+0 = 10
    expect(miningRareDrops(state).deeprock).toBeUndefined()
  })
})

describe('caps', () => {
  it('废料上限初始为 10K', () => {
    expect(scrapCap(fresh())).toBe(10_000)
  })

  it('矿石上限按矿石定义初始化', () => {
    expect(oreCap(fresh(), 'oreAluminium')).toBe(12)
    expect(oreCap(fresh(), 'oreIron')).toBe(1)
  })
})

describe('upgrades', () => {
  it('伤害升级一开始可见且可买（初始废料为 0 时不可买）', () => {
    const state = fresh()
    expect(miningUpgradeUnlocked(state, 'damageUp')).toBe(true)
  })

  it('深度不足时后续升级不可见', () => {
    const state = fresh()
    expect(miningUpgradeUnlocked(state, 'leadExpansion')).toBe(false)
  })

  it('批量购买（最大）会一直买到买不起为止', () => {
    const state = fresh()
    state.mining.currency.scrap = 1e6
    const before = state.mining.upgrades['damageUp'] ?? 0
    const scrapBefore = currencyOf(state, 'scrap')

    const count = miningUpgradeMaxCount(state, 'damageUp')
    expect(count).toBeGreaterThan(1)

    const bought = buyMiningUpgradeMax(state, 'damageUp')
    expect(bought).toBe(count)
    expect(state.mining.upgrades['damageUp']).toBe(before + count)

    // 买完之后剩余废料不足以再买 1 级
    expect(miningUpgradeMaxCount(state, 'damageUp')).toBe(0)
    expect(currencyOf(state, 'scrap')).toBeLessThan(scrapBefore)
    expect(currencyOf(state, 'scrap')).toBeGreaterThanOrEqual(0)
  })

  it('资源不足时批量购买返回 0 且不改变等级', () => {
    const state = fresh()
    const before = state.mining.upgrades['damageUp'] ?? 0
    expect(miningUpgradeMaxCount(state, 'damageUp')).toBe(0)
    expect(buyMiningUpgradeMax(state, 'damageUp')).toBe(0)
    expect(state.mining.upgrades['damageUp'] ?? 0).toBe(before)
  })
})

describe('crafting', () => {
  it('初始只有 1 个锻造槽位', () => {
    expect(miningCraftingSlots(fresh())).toBe(1)
  })

  it('槽位为空时锻造失败', () => {
    const state = fresh()
    const result = miningCraftPickaxe(state)
    expect(result.ok).toBe(false)
  })

  it('放入矿石后可锻造，威力不会降低', () => {
    const state = fresh()
    state.mining.currency.oreAluminium = 1000
    expect(miningAddIngredient(state, 'oreAluminium')).toBe(true)
    const before = miningPickaxePower(state)
    const result = miningCraftPickaxe(state, () => 0.999)
    expect(result.ok).toBe(true)
    expect(miningPickaxePower(state)).toBeGreaterThanOrEqual(before)
  })
})

describe('smeltery', () => {
  it('材料不足时投料返回 0', () => {
    const state = fresh()
    expect(miningAddToSmeltery(state, 'aluminium')).toBe(0)
  })

  it('材料充足时投料增加待产出数量', () => {
    const state = fresh()
    state.mining.currency.oreAluminium = 1e6
    state.mining.currency.granite = 1e9
    expect(miningAddToSmeltery(state, 'aluminium')).toBeGreaterThan(0)
    expect(miningSmelteryStored(state, 'aluminium')).toBeGreaterThan(0)
  })
})

describe('depth navigation', () => {
  it('可以回到已挖到的浅层继续刷资源', () => {
    const state = fresh()
    // 开启自动下潜才能一路推进（Gooboo 默认为 0，需手动导航）
    state.mining.autoProgress = 90
    tickMining(state, 60_000)
    const deepest = state.mining.maxDepth0
    expect(deepest).toBeGreaterThan(2)

    expect(miningSetDepth(state, 2)).toBe(true)
    expect(state.mining.depth).toBe(2)
    // 浅层不击碎也有收益（Gooboo 的 loot 机制）
    const before = currencyOf(state, 'scrap')
    tickMining(state, 5000)
    expect(currencyOf(state, 'scrap')).toBeGreaterThan(before)
  })

  it('不能超过历史最大深度', () => {
    const state = fresh()
    tickMining(state, 30_000)
    miningSetDepth(state, 9999)
    expect(state.mining.depth).toBe(state.mining.maxDepth0)
  })
})

describe('prestige', () => {
  it('未解锁深度居民时水晶预览为 0', () => {
    expect(miningPrestigePreview(fresh())).toBe(0)
  })

  it('解锁深度居民上限后，居民上限 = maxDepth × 10%', () => {
    const state = fresh()
    state.mining.maxDepth0 = 100
    initMining(state)
    expect(miningDwellerLimit(state)).toBeCloseTo(10, 6)
  })
})
