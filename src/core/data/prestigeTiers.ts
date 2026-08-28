import Decimal from 'break_infinity.js'

import type { GameState } from '../state/gameState'
import { miningPrestigePreview } from '../mechanics/mining'

/**
 * 转生层级配置（4 层嵌套 prestige）。
 * Tier1 为采矿转生：奖励绿水晶（crystalGreen），基于历史最高深度。
 * Tier2-4 配置占位供后续机制扩展。
 */
export interface PrestigeTierDef {
  tier: number
  nameKey: string
  /** 通货 id（tier1 为 'crystalGreen'）。 */
  currencyId: string
  /** 触发阈值（tier1 为深度，其余为 cash）。 */
  threshold: Decimal
  /** 通货获得公式：(state) -> gainedCurrency。 */
  formula: (state: GameState) => Decimal
}

/** 采矿转生所需的最小绿水晶产量（低于此值不值得转生）。 */
export const PRESTIGE_MIN_CRYSTAL = 1

export const PRESTIGE_TIERS: PrestigeTierDef[] = [
  {
    tier: 1,
    nameKey: 'prestige.tier1',
    currencyId: 'crystalGreen',
    threshold: new Decimal(PRESTIGE_MIN_CRYSTAL),
    formula: (state) => {
      // 深度居民 → 绿水晶：1.15^(steps/2) * steps * 7 * (dweller/cap)
      const crystal = miningPrestigePreview(state)
      if (crystal < PRESTIGE_MIN_CRYSTAL) return new Decimal(0)
      return new Decimal(Math.floor(crystal))
    },
  },
  {
    tier: 2,
    nameKey: 'prestige.tier2',
    currencyId: 'infinityPoints',
    threshold: new Decimal(1e16),
    formula: (state) => {
      if (state.cash.lt(1e16)) return new Decimal(0)
      return Decimal.floor(new Decimal(state.cash.log10()).sub(14))
    },
  },
  {
    tier: 3,
    nameKey: 'prestige.tier3',
    currencyId: 'eternityPoints',
    threshold: new Decimal(1e32),
    formula: (state) => {
      if (state.cash.lt(1e32)) return new Decimal(0)
      return Decimal.floor(new Decimal(state.cash.log10()).sub(30))
    },
  },
  {
    tier: 4,
    nameKey: 'prestige.tier4',
    currencyId: 'realityMachines',
    threshold: new Decimal(1e64),
    formula: (state) => {
      if (state.cash.lt(1e64)) return new Decimal(0)
      return Decimal.floor(new Decimal(state.cash.log10()).sub(62))
    },
  },
]

export function tierOf(num: number): PrestigeTierDef {
  const def = PRESTIGE_TIERS[num - 1]
  if (def === undefined) throw new Error(`未知转生层级：${num}`)
  return def
}
