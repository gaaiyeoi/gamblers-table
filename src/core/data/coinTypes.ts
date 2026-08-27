import Decimal from 'break_infinity.js'

/**
 * 硬币类型配置（导数级联生产链的维度定义）。
 * 数据驱动：新增硬币 = 在此追加一条配置，无需改逻辑。
 * 参考截图：Helper 5$ / Copper Coin 24$ 4/90 / Silver Coin 44$ 1/80 / Gold Coin 10,000$ 0/30。
 */
export interface CoinType {
  /** 唯一 id（lowerCamelCase）。 */
  id: string
  /** i18n 名称 key。 */
  nameKey: string
  /** 初始成本。 */
  baseCost: Decimal
  /** 每次购买成本增长倍率。 */
  costGrowth: Decimal
  /** 每单位每秒基础产出。 */
  baseRate: Decimal
  /** 每购买 k 个，该维度基础产出翻倍（×2）。 */
  doublingEvery: number
  /** 像素图标 id（UI 阶段映射贴图）。 */
  icon: string
}

/** 8 层硬币维度 D1..D8，成本与产出指数递增。 */
export const COIN_TYPES: CoinType[] = [
  { id: 'copperCoin', nameKey: 'coins.copper', baseCost: new Decimal(15), costGrowth: new Decimal(1.15), baseRate: new Decimal(0.5), doublingEvery: 25, icon: 'copper' },
  { id: 'silverCoin', nameKey: 'coins.silver', baseCost: new Decimal(150), costGrowth: new Decimal(1.15), baseRate: new Decimal(3), doublingEvery: 25, icon: 'silver' },
  { id: 'goldCoin', nameKey: 'coins.gold', baseCost: new Decimal(1.1e4), costGrowth: new Decimal(1.15), baseRate: new Decimal(25), doublingEvery: 25, icon: 'gold' },
  { id: 'platinumCoin', nameKey: 'coins.platinum', baseCost: new Decimal(1.2e6), costGrowth: new Decimal(1.15), baseRate: new Decimal(250), doublingEvery: 25, icon: 'platinum' },
  { id: 'diamondCoin', nameKey: 'coins.diamond', baseCost: new Decimal(1.5e9), costGrowth: new Decimal(1.15), baseRate: new Decimal(3e3), doublingEvery: 25, icon: 'diamond' },
  { id: 'rubyCoin', nameKey: 'coins.ruby', baseCost: new Decimal(2e12), costGrowth: new Decimal(1.15), baseRate: new Decimal(5e4), doublingEvery: 25, icon: 'ruby' },
  { id: 'emeraldCoin', nameKey: 'coins.emerald', baseCost: new Decimal(3e15), costGrowth: new Decimal(1.15), baseRate: new Decimal(1e6), doublingEvery: 25, icon: 'emerald' },
  { id: 'obsidianCoin', nameKey: 'coins.obsidian', baseCost: new Decimal(5e18), costGrowth: new Decimal(1.15), baseRate: new Decimal(2.5e7), doublingEvery: 25, icon: 'obsidian' },
]

/** 获取某阶硬币配置（tier 从 1 开始）。 */
export function coinTypeOf(tier: number): CoinType {
  const coin = COIN_TYPES[tier - 1]
  if (coin === undefined) {
    throw new Error(`非法硬币阶数：${tier}`)
  }
  return coin
}
