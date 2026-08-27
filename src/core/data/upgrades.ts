import Decimal from 'break_infinity.js'

/**
 * 当局升级（run-scoped）数据配置。
 *
 * 与全局「天赋树」区分：当局升级用现金购买，转生后（prestigeReset）随 state.upgrades
 * 一并清空，只在当前这一局生效。参考截图里"快速翻转 / 点金大手 / 幸运四叶草"等
 * Cookie Clicker 风格的买断型/分级升级。
 *
 * 新增升级 = 在此追加一条配置（effect 决定 hook 到哪套机制），无需改逻辑。
 */
export type UpgradeEffect =
  /** 快速翻转：硬币翻转动画更快（视觉层读取）。 */
  | 'quickFlip'
  /** 脚步轻快：助手走路速度 +22px/s 每级（视觉层读取）。 */
  | 'lightFootsteps'
  /** 点金大手：一次点击翻动周围多枚硬币（视觉层读取）。 */
  | 'touchOfMidas'
  /** 银币滑行：鼠标悬停银币自动翻转（视觉层读取）。 */
  | 'silverGlide'
  /** 点金之手：鼠标悬停金币自动翻转（视觉层读取）。 */
  | 'handOfMidas'
  /** 幸运四叶草：$ 面概率 +3% 每级（core 生效：修改抛币概率）。 */
  | 'luckyClover'
  /** 优先高级币：助手优先把握更高档硬币（视觉层读取）。 */
  | 'preferHigherCoins'

export interface UpgradeDef {
  /** 唯一 id（lowerCamelCase），同时作为像素图标 sprite key。 */
  id: string
  /** i18n 名称 key。 */
  nameKey: string
  /** i18n 描述 key。 */
  descKey: string
  /** 像素图标 sprite key（对应 UPGRADE_SPRITES）。 */
  icon: string
  /** 第 1 级成本（现金）。 */
  baseCost: Decimal
  /** 每级成本成长系数：下一级成本 = 当前成本 × costGrowth（1 = 恒定）。 */
  costGrowth: number
  /** 最大等级：1 = 一次性买断；>1 = 可多级。 */
  maxLevel: number
  /** 效果类型，决定 hook 到哪套机制。 */
  effect: UpgradeEffect
}

/**
 * 当局升级列表（按成本升序，方便从便宜买到贵）。
 *
 * 成本阶级设计（对齐本局经济锚点，而非随意取值）：
 *   - 点击基础收益 1$，铜币 15$ / 银币 150$ / 金币 1.1e4$，转生阈值 1e6$
 *   - 开局便利类（快速翻转 10 / 点金大手 30）：约等于第 1~2 枚铜币
 *   - 银币阶（脚步轻快 50×1.5 / 银币滑行 300）：对应银币 150 档
 *   - 金币阶（幸运四叶草 1_000×2 / 点金之手 10_000）：对应金币 1.1e4 档
 *   - 转生前（优先高级币 100_000）：约为转生阈值 1e6 的 1/10
 * 多级升级采用成本递增（costGrowth > 1），使「核心收益升级」需后期经济才能点满。
 */
export const UPGRADES: UpgradeDef[] = [
  { id: 'quickFlip', nameKey: 'upgrades.quickFlip.name', descKey: 'upgrades.quickFlip.desc', icon: 'quickFlip', baseCost: new Decimal(10), costGrowth: 1, maxLevel: 1, effect: 'quickFlip' },
  { id: 'touchOfMidas', nameKey: 'upgrades.touchOfMidas.name', descKey: 'upgrades.touchOfMidas.desc', icon: 'touchOfMidas', baseCost: new Decimal(30), costGrowth: 1, maxLevel: 1, effect: 'touchOfMidas' },
  { id: 'lightFootsteps', nameKey: 'upgrades.lightFootsteps.name', descKey: 'upgrades.lightFootsteps.desc', icon: 'lightFootsteps', baseCost: new Decimal(50), costGrowth: 1.5, maxLevel: 10, effect: 'lightFootsteps' },
  { id: 'silverGlide', nameKey: 'upgrades.silverGlide.name', descKey: 'upgrades.silverGlide.desc', icon: 'silverGlide', baseCost: new Decimal(300), costGrowth: 1, maxLevel: 1, effect: 'silverGlide' },
  { id: 'luckyClover', nameKey: 'upgrades.luckyClover.name', descKey: 'upgrades.luckyClover.desc', icon: 'luckyClover', baseCost: new Decimal(1_000), costGrowth: 2, maxLevel: 10, effect: 'luckyClover' },
  { id: 'handOfMidas', nameKey: 'upgrades.handOfMidas.name', descKey: 'upgrades.handOfMidas.desc', icon: 'handOfMidas', baseCost: new Decimal(10_000), costGrowth: 1, maxLevel: 1, effect: 'handOfMidas' },
  { id: 'preferHigherCoins', nameKey: 'upgrades.preferHigherCoins.name', descKey: 'upgrades.preferHigherCoins.desc', icon: 'preferHigherCoins', baseCost: new Decimal(100_000), costGrowth: 1, maxLevel: 1, effect: 'preferHigherCoins' },
]

/** 获取某个当局升级配置。 */
export function upgradeOf(id: string): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id)
  if (def === undefined) throw new Error(`未知当局升级 id：${id}`)
  return def
}
