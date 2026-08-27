import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { flipCoin } from '../src/core/mechanics/coins'
import { prestigeReset } from '../src/core/mechanics/prestige'
import {
  buyUpgrade,
  canAffordUpgrade,
  costOfUpgrade,
  dollarChance,
  isUpgradeMaxed,
  skullChance,
  upgradeLevel,
} from '../src/core/mechanics/upgrades'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

describe('当局升级购买（buyUpgrade）', () => {
  it('初始等级为 0，可购买且未满级', () => {
    expect(upgradeLevel(state, 'quickFlip')).toBe(0)
    expect(isUpgradeMaxed(state, 'quickFlip')).toBe(false)
    expect(canAffordUpgrade(state, 'quickFlip')).toBe(false)
  })

  it('现金足够时购买成功并扣钱', () => {
    state.cash = new Decimal(100)
    const cost = costOfUpgrade(state, 'quickFlip')
    expect(buyUpgrade(state, 'quickFlip')).toBe(true)
    expect(upgradeLevel(state, 'quickFlip')).toBe(1)
    expect(isUpgradeMaxed(state, 'quickFlip')).toBe(true)
    expect(state.cash.toNumber()).toBe(100 - cost.toNumber())
  })

  it('现金不足时购买失败，等级不变', () => {
    expect(buyUpgrade(state, 'quickFlip')).toBe(false)
    expect(upgradeLevel(state, 'quickFlip')).toBe(0)
  })

  it('一次性升级购买后满级，不可重复购买', () => {
    state.cash = new Decimal(100)
    expect(buyUpgrade(state, 'quickFlip')).toBe(true)
    expect(buyUpgrade(state, 'quickFlip')).toBe(false)
    expect(upgradeLevel(state, 'quickFlip')).toBe(1)
  })

  it('分级升级（幸运四叶草）成本递增，可购买多级至 maxLevel', () => {
    // 满级总成本 = 1000 × (2^10 - 1) = 102.3 万，costGrowth=2 每级翻倍
    state.cash = new Decimal(1_100_000)
    for (let i = 0; i < 10; i += 1) {
      const cost = costOfUpgrade(state, 'luckyClover')
      expect(buyUpgrade(state, 'luckyClover')).toBe(true)
      // 未满级时，下一级成本应为当前成本 ×2（阶级递增）
      if (i < 9) {
        expect(costOfUpgrade(state, 'luckyClover').toNumber()).toBe(cost.toNumber() * 2)
      }
    }
    expect(upgradeLevel(state, 'luckyClover')).toBe(10)
    expect(isUpgradeMaxed(state, 'luckyClover')).toBe(true)
    expect(buyUpgrade(state, 'luckyClover')).toBe(false)
  })
})

describe('幸运四叶草：$ 面概率（dollarChance / skullChance）', () => {
  it('无升级时基础概率 50%', () => {
    expect(dollarChance(state)).toBe(0.5)
    expect(skullChance(state)).toBe(0.5)
  })

  it('每级 $ 面概率 +3%，封顶 95%', () => {
    state.upgrades.luckyClover = 1
    expect(dollarChance(state)).toBe(0.53)
    state.upgrades.luckyClover = 10
    expect(dollarChance(state)).toBe(0.8)
    // 超过 15 级也封顶 95%
    state.upgrades.luckyClover = 100
    expect(dollarChance(state)).toBeCloseTo(0.95, 10)
    expect(skullChance(state)).toBeCloseTo(0.05, 10)
  })

  it('幸运四叶草提升 $ 面的实际翻转命中', () => {
    // 注入恒等 rng=0.49：无升级时骷髅概率 0.5 → 0.49<0.5 为骷髅面；
    // 升 1 级后骷髅概率降到 0.47 → 0.49>=0.47 为 $ 面（赢钱）。
    const rng = (): number => 0.49
    state.upgrades.luckyClover = 0
    expect(flipCoin(state, rng).skull).toBe(true)
    state.upgrades.luckyClover = 1
    expect(flipCoin(state, rng).skull).toBe(false)
  })
})

describe('转生清空当局升级', () => {
  it('prestigeReset 后升级等级归零，重新生效基础概率', () => {
    state.cash = new Decimal(1e7)
    state.upgrades.luckyClover = 3
    state.upgrades.quickFlip = 1
    expect(dollarChance(state)).toBe(0.59)

    // 直接调用 prestigeReset（达到阈值）。
    prestigeReset(state, 1)

    expect(upgradeLevel(state, 'luckyClover')).toBe(0)
    expect(upgradeLevel(state, 'quickFlip')).toBe(0)
    expect(dollarChance(state)).toBe(0.5)
  })
})
