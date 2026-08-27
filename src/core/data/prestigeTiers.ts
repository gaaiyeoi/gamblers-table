import Decimal from 'break_infinity.js'

/**
 * 转生层级配置（4 层嵌套 prestige）。
 * MVP 仅 Tier1 启用 UI/逻辑，Tier2-4 配置占位供后续机制扩展。
 */
export interface PrestigeTierDef {
  tier: number
  nameKey: string
  /** 通货 id（如 'reputation' / 'infinityPoints' / 'eternityPoints' / 'realityMachines'）。 */
  currencyId: string
  /** 触发阈值（cash >= threshold）。 */
  threshold: Decimal
  /** 通货获得公式：(currentCash) -> gainedCurrency。 */
  formula: (cash: Decimal) => Decimal
}

export const PRESTIGE_TIERS: PrestigeTierDef[] = [
  {
    tier: 1,
    nameKey: 'prestige.tier1',
    currencyId: 'reputation',
    threshold: new Decimal(1e6),
    formula: (cash) => {
      if (cash.lt(1e6)) return new Decimal(0)
      // gain = floor((log10(cash) - 6)^2)，cash=1e6→0，1e7→1，1e9→9，1e16→100
      const logCash = cash.log10()
      const diff = Math.max(0, logCash - 6)
      return new Decimal(diff).pow(2).floor()
    },
  },
  {
    tier: 2,
    nameKey: 'prestige.tier2',
    currencyId: 'infinityPoints',
    threshold: new Decimal(1e15),
    formula: (cash) => {
      if (cash.lt(1e15)) return new Decimal(0)
      return Decimal.floor(new Decimal(cash.log10()).sub(13))
    },
  },
  {
    tier: 3,
    nameKey: 'prestige.tier3',
    currencyId: 'eternityPoints',
    threshold: new Decimal(1e30),
    formula: (cash) => {
      if (cash.lt(1e30)) return new Decimal(0)
      return Decimal.floor(new Decimal(cash.log10()).sub(28))
    },
  },
  {
    tier: 4,
    nameKey: 'prestige.tier4',
    currencyId: 'realityMachines',
    threshold: new Decimal(1e50),
    formula: (cash) => {
      if (cash.lt(1e50)) return new Decimal(0)
      return Decimal.floor(new Decimal(cash.log10()).sub(48))
    },
  },
]

export function tierOf(num: number): PrestigeTierDef {
  const def = PRESTIGE_TIERS[num - 1]
  if (def === undefined) throw new Error(`未知转生层级：${num}`)
  return def
}