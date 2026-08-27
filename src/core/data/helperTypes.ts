import Decimal from 'break_infinity.js'

/**
 * 助手配置（自动化生产源）。
 * 助手每秒自动抛硬币 flipsPerSec 次，每次与手动 click 等价（50% skull/dollar）。
 * 数据驱动：新增助手 = 追加一条配置。
 *
 * 解锁机制：除第一个新手助手外，每个助手都配置了 unlockGoal（基于累计统计）。
 * 达成累计统计目标后，由 checkHelperUnlocks() 自动把对应 unlockFlag 写入
 * state.unlockFlags，之后才可雇佣。解锁条件按助手档次递增，顺序自然推进。
 */
export type HelperUnlockGoal =
  | { kind: 'totalFlips'; target: number }
  | { kind: 'totalEarned'; target: number }
  | { kind: 'totalSkullTokensEarned'; target: number }

export interface HelperType {
  /** 唯一 id。 */
  id: string
  /** i18n 名称 key。 */
  nameKey: string
  /** 雇佣初始成本（也是第 1 只的成本）。 */
  baseCost: Decimal
  /** 每次雇佣成本增长倍率。 */
  costGrowth: Decimal
  /**
   * 后续每只固定成本（可选）。设置后该助手不再按 costGrowth 几何递增：
   * 第 1 只仍用 baseCost（可作为新手特价），从第 2 只起固定为 fixedCost。
   */
  fixedCost?: Decimal
  /** 单个助手每秒抛硬币次数。 */
  flipsPerSec: Decimal
  /** 每级升级的翻转速率提升倍率（0.25 = 每级 +25%）。 */
  levelBonus?: number
  /** 像素图标 id（UI 阶段映射）。 */
  icon: string
  /** 解锁后写入 state.unlockFlags 的机制级 flag（缺省表示无门控）。 */
  unlockFlag?: string
  /** 解锁所需的累计统计目标（达成后自动解锁；缺省表示无门控）。 */
  unlockGoal?: HelperUnlockGoal
}

/** 8 种助手，从新手到高级（参考截图 Helper 5$ 起步）。 */
export const HELPER_TYPES: HelperType[] = [
  // 新手助手：开局可用，无解锁条件。首只特价 5$（引导），之后每只固定 100$ 原价（不递增）。
  { id: 'novice', nameKey: 'helpers.novice', baseCost: new Decimal(5), fixedCost: new Decimal(100), costGrowth: new Decimal(1.2), flipsPerSec: new Decimal(0.5), icon: 'novice' },
  // 狐狸老手：累计 30 枚骷髅代币。
  { id: 'apprentice', nameKey: 'helpers.apprentice', baseCost: new Decimal(500), costGrowth: new Decimal(1.25), flipsPerSec: new Decimal(2), icon: 'apprentice', unlockFlag: 'apprentice', unlockGoal: { kind: 'totalSkullTokensEarned', target: 30 } },
  // 熊力壮汉：累计赚取 5 万。
  { id: 'journeyman', nameKey: 'helpers.journeyman', baseCost: new Decimal(5e3), costGrowth: new Decimal(1.3), flipsPerSec: new Decimal(8), icon: 'journeyman', unlockFlag: 'journeyman', unlockGoal: { kind: 'totalEarned', target: 50_000 } },
  // 魔法师傅：累计抛币 5 千。
  { id: 'expert', nameKey: 'helpers.expert', baseCost: new Decimal(5e4), costGrowth: new Decimal(1.3), flipsPerSec: new Decimal(30), icon: 'expert', unlockFlag: 'expert', unlockGoal: { kind: 'totalFlips', target: 5_000 } },
  // 冰霜大师：累计赚取 100 万。
  { id: 'master', nameKey: 'helpers.master', baseCost: new Decimal(1e6), costGrowth: new Decimal(1.35), flipsPerSec: new Decimal(100), icon: 'master', unlockFlag: 'master', unlockGoal: { kind: 'totalEarned', target: 1_000_000 } },
  // 炎炎宗师：累计抛币 5 万。
  { id: 'grandmaster', nameKey: 'helpers.grandmaster', baseCost: new Decimal(1e8), costGrowth: new Decimal(1.4), flipsPerSec: new Decimal(400), icon: 'grandmaster', unlockFlag: 'grandmaster', unlockGoal: { kind: 'totalFlips', target: 50_000 } },
  // 传奇英雄：累计赚取 1 亿。
  { id: 'legend', nameKey: 'helpers.legend', baseCost: new Decimal(1e10), costGrowth: new Decimal(1.5), flipsPerSec: new Decimal(1500), icon: 'legend', unlockFlag: 'legend', unlockGoal: { kind: 'totalEarned', target: 100_000_000 } },
  // 神话存在：累计抛币 50 万。
  { id: 'mythic', nameKey: 'helpers.mythic', baseCost: new Decimal(1e12), costGrowth: new Decimal(1.6), flipsPerSec: new Decimal(5000), icon: 'mythic', unlockFlag: 'mythic', unlockGoal: { kind: 'totalFlips', target: 500_000 } },
]

export function helperTypeOf(id: string): HelperType {
  const found = HELPER_TYPES.find((h) => h.id === id)
  if (found === undefined) throw new Error(`未知助手 id：${id}`)
  return found
}
