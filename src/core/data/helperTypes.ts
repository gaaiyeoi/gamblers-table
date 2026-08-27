import Decimal from 'break_infinity.js'

/**
 * 助手配置（自动化生产源）。
 * 助手每秒自动抛硬币 flipsPerSec 次，每次与手动 click 等价（50% skull/dollar）。
 * 数据驱动：新增助手 = 追加一条配置。
 */
export interface HelperType {
  /** 唯一 id。 */
  id: string
  /** i18n 名称 key。 */
  nameKey: string
  /** 雇佣初始成本。 */
  baseCost: Decimal
  /** 每次雇佣成本增长倍率。 */
  costGrowth: Decimal
  /** 单个助手每秒抛硬币次数。 */
  flipsPerSec: Decimal
  /** 像素图标 id（UI 阶段映射）。 */
  icon: string
}

/** 8 种助手，从新手到高级（参考截图 Helper 5$ 起步）。 */
export const HELPER_TYPES: HelperType[] = [
  { id: 'novice', nameKey: 'helpers.novice', baseCost: new Decimal(100), costGrowth: new Decimal(1.2), flipsPerSec: new Decimal(0.5), icon: 'novice' },
  { id: 'apprentice', nameKey: 'helpers.apprentice', baseCost: new Decimal(500), costGrowth: new Decimal(1.25), flipsPerSec: new Decimal(2), icon: 'apprentice' },
  { id: 'journeyman', nameKey: 'helpers.journeyman', baseCost: new Decimal(5e3), costGrowth: new Decimal(1.3), flipsPerSec: new Decimal(8), icon: 'journeyman' },
  { id: 'expert', nameKey: 'helpers.expert', baseCost: new Decimal(5e4), costGrowth: new Decimal(1.3), flipsPerSec: new Decimal(30), icon: 'expert' },
  { id: 'master', nameKey: 'helpers.master', baseCost: new Decimal(1e6), costGrowth: new Decimal(1.35), flipsPerSec: new Decimal(100), icon: 'master' },
  { id: 'grandmaster', nameKey: 'helpers.grandmaster', baseCost: new Decimal(1e8), costGrowth: new Decimal(1.4), flipsPerSec: new Decimal(400), icon: 'grandmaster' },
  { id: 'legend', nameKey: 'helpers.legend', baseCost: new Decimal(1e10), costGrowth: new Decimal(1.5), flipsPerSec: new Decimal(1500), icon: 'legend' },
  { id: 'mythic', nameKey: 'helpers.mythic', baseCost: new Decimal(1e12), costGrowth: new Decimal(1.6), flipsPerSec: new Decimal(5000), icon: 'mythic' },
]

export function helperTypeOf(id: string): HelperType {
  const found = HELPER_TYPES.find((h) => h.id === id)
  if (found === undefined) throw new Error(`未知助手 id：${id}`)
  return found
}