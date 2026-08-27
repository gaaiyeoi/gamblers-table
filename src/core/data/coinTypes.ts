import Decimal from 'break_infinity.js'

/**
 * 硬币类型配置（导数级联生产链的维度定义）。
 * 数据驱动：新增硬币 = 在此追加一条配置，无需改逻辑。
 * 参考截图：Helper 5$ / Copper Coin 24$ 4/90 / Silver Coin 44$ 1/80 / Gold Coin 10,000$ 0/30。
 *
 * 解锁机制：除铜币（开局可用）外，每个硬币都配置了 unlockGoal（基于累计统计）。
 * 达成累计统计目标后，由 checkCoinUnlocks() 自动把对应 unlockFlag 写入
 * state.unlockFlags，之后才可购买。解锁条件按硬币档次递增，顺序自然推进。
 */
export type CoinUnlockGoal =
  | { kind: 'totalFlips'; target: number }
  | { kind: 'totalEarned'; target: number }
  | { kind: 'totalSkullTokensEarned'; target: number }

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
  /** 每级强化的产出提升倍率（0.25 = 每级 +25%）。 */
  enhanceBonus?: number
  /** 像素图标 id（UI 阶段映射贴图）。 */
  icon: string
  /** 解锁后写入 state.unlockFlags 的机制级 flag（缺省表示无门控）。 */
  unlockFlag?: string
  /** 解锁所需的累计统计目标（达成后自动解锁；缺省表示无门控）。 */
  unlockGoal?: CoinUnlockGoal
}

/** 8 层硬币维度 D1..D8，成本与产出指数递增。 */
export const COIN_TYPES: CoinType[] = [
  // 铜币：开局可用，无解锁条件。
  { id: 'copperCoin', nameKey: 'coins.copper', baseCost: new Decimal(15), costGrowth: new Decimal(1.15), baseRate: new Decimal(0.5), doublingEvery: 25, icon: 'copper' },
  // 银币：累计赚取 50 万。
  { id: 'silverCoin', nameKey: 'coins.silver', baseCost: new Decimal(150), costGrowth: new Decimal(1.15), baseRate: new Decimal(3), doublingEvery: 25, icon: 'silver', unlockFlag: 'coin.silver', unlockGoal: { kind: 'totalEarned', target: 500_000 } },
  // 金币：累计赚取 1000 万。
  { id: 'goldCoin', nameKey: 'coins.gold', baseCost: new Decimal(1.1e4), costGrowth: new Decimal(1.15), baseRate: new Decimal(25), doublingEvery: 25, icon: 'gold', unlockFlag: 'coin.gold', unlockGoal: { kind: 'totalEarned', target: 10_000_000 } },
  // 铂金币：累计抛币 1 千。
  { id: 'platinumCoin', nameKey: 'coins.platinum', baseCost: new Decimal(1.2e6), costGrowth: new Decimal(1.15), baseRate: new Decimal(250), doublingEvery: 25, icon: 'platinum', unlockFlag: 'coin.platinum', unlockGoal: { kind: 'totalFlips', target: 1_000 } },
  // 钻石币：累计赚取 10 亿。
  { id: 'diamondCoin', nameKey: 'coins.diamond', baseCost: new Decimal(1.5e9), costGrowth: new Decimal(1.15), baseRate: new Decimal(3e3), doublingEvery: 25, icon: 'diamond', unlockFlag: 'coin.diamond', unlockGoal: { kind: 'totalEarned', target: 1_000_000_000 } },
  // 红宝石币：累计获得骷髅 100 枚。
  { id: 'rubyCoin', nameKey: 'coins.ruby', baseCost: new Decimal(2e12), costGrowth: new Decimal(1.15), baseRate: new Decimal(5e4), doublingEvery: 25, icon: 'ruby', unlockFlag: 'coin.ruby', unlockGoal: { kind: 'totalSkullTokensEarned', target: 100 } },
  // 祖母绿币：累计抛币 5 万。
  { id: 'emeraldCoin', nameKey: 'coins.emerald', baseCost: new Decimal(3e15), costGrowth: new Decimal(1.15), baseRate: new Decimal(1e6), doublingEvery: 25, icon: 'emerald', unlockFlag: 'coin.emerald', unlockGoal: { kind: 'totalFlips', target: 50_000 } },
  // 黑曜石币：累计赚取 1 万亿。
  { id: 'obsidianCoin', nameKey: 'coins.obsidian', baseCost: new Decimal(5e18), costGrowth: new Decimal(1.15), baseRate: new Decimal(2.5e7), doublingEvery: 25, icon: 'obsidian', unlockFlag: 'coin.obsidian', unlockGoal: { kind: 'totalEarned', target: 1_000_000_000_000 } },
]

/** 获取某阶硬币配置（tier 从 1 开始）。 */
export function coinTypeOf(tier: number): CoinType {
  const coin = COIN_TYPES[tier - 1]
  if (coin === undefined) {
    throw new Error(`非法硬币阶数：${tier}`)
  }
  return coin
}
