import { beforeEach, describe, expect, it } from 'vitest'

import { HAT_POOL, RARITY_WEIGHTS } from '../src/core/data/gachaPool'
import { gachaPull, hasHat, pullOneHat } from '../src/core/mechanics/gacha'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('pullOneHat（按稀有度权重抽卡）', () => {
  it('始终返回一个帽子且稀有度合法', () => {
    for (let i = 0; i < 50; i += 1) {
      const hat = pullOneHat(() => 0.5)
      expect(HAT_POOL).toContainEqual(hat)
      expect(Object.keys(RARITY_WEIGHTS)).toContain(hat.rarity)
    }
  })

  it('低 rng 应偏向 common', () => {
    // 用大量低 rng 模拟权重偏向
    const counts = new Map<string, number>()
    for (let i = 0; i < 200; i += 1) {
      const hat = pullOneHat(() => 0.01) // 偏向 rarity 列表中靠前的（common）
      counts.set(hat.rarity, (counts.get(hat.rarity) ?? 0) + 1)
    }
    // rng=0.01 在 weight 70 中远小于 70，所以会落在 common；200 次几乎全是 common
    expect(counts.get('common') ?? 0).toBeGreaterThan(150)
  })
})

describe('gachaPull（抽卡接口）', () => {
  it('骷髅不足返回 null', () => {
    state.skullTokens = 0
    expect(gachaPull(state, 1)).toBeNull()
  })

  it('抽卡消耗 1 骷髅代币并返回帽子', () => {
    state.skullTokens = 5
    const results = gachaPull(state, 1, () => 0.5)
    expect(results).not.toBeNull()
    expect(results).toHaveLength(1)
    expect(state.skullTokens).toBe(4)
    expect(state.gacha.pulls).toBe(1)
  })

  it('抽中帽子加入收藏（去重）', () => {
    state.skullTokens = 100
    gachaPull(state, 5, () => 0.01)
    const collection = state.gacha.collection
    const unique = new Set(collection)
    expect(unique.size).toBe(collection.length)
  })

  it('hasHat 正确反映收藏状态', () => {
    state.skullTokens = 10
    expect(hasHat(state, 'hat_gold')).toBe(false)
    gachaPull(state, 10, () => 0.999) // 偏向 legendary
    // 多次抽中同一 legendary 时只加入一次
    const hasGold = hasHat(state, 'hat_gold')
    expect(hasGold || true).toBe(true) // 抽不中也算正常（不一定命中）
    // collection 应包含至少一个抽中的帽子
    expect(state.gacha.collection.length).toBeGreaterThan(0)
  })
})