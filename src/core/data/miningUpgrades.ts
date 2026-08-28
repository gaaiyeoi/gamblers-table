import { buildNum, getApproaching, getDiminishing, getSequence, splicedPow } from '../math'

/**
 * 采矿升级树 —— 1:1 直译自 Gooboo
 * `js/modules/mining/upgrade.js`（81 条）、
 * `js/modules/mining/upgrade2.js`（子模式 1，25 条）、
 * `js/modules/mining/upgradePrestige.js`（声望，54 条）。
 *
 * 升级不再直接暴露 `damage/scrapGain` 之类的字段，而是统一走 `effect` 列表
 * 写入乘区（见 `core/mechanics/mining/mults.ts`），与 Gooboo 的 `system/applyEffect` 一致。
 */

export type MiningEffectType = 'mult' | 'base' | 'unlock' | 'keepUpgrade' | 'uncapUpgrade'

export interface MiningUpgradeEffect {
  /** 乘区名 / 解锁键 / `feature_upgrade` 形式的升级键。 */
  name: string
  type: MiningEffectType
  /** `null` 表示该级不产生贡献。 */
  value: (lvl: number) => number | boolean | null
}

export type UpgradeRequirement =
  /** 历史最大深度门槛。 */
  | { type: 'depth'; subfeature: 0 | 1; value: number }
  /** 深度居民上限门槛。 */
  | { type: 'dwellerCap'; subfeature: 0 | 1; value: number }
  /** 需要某个解锁已启用。 */
  | { type: 'unlock'; key: string }
  /** 需要某个解锁已可见。 */
  | { type: 'unlockSeen'; key: string }
  /** 无条件可见。 */
  | { type: 'none' }

export interface MiningUpgradeDef {
  id: string
  kind: 'regular' | 'prestige'
  /** 子模式：0 = 普通矿，1 = 气态。 */
  subfeature: 0 | 1
  cap?: number
  /** 价格：`mining_xxx` → 数量。 */
  price: (lvl: number) => Record<string, number>
  /** 可见 / 解锁条件。 */
  requirement: UpgradeRequirement
  /** 分级解锁条件（逐级的额外门槛）。 */
  levelRequirement?: (ctx: MiningRequirementContext, lvl: number) => boolean
  effect: MiningUpgradeEffect[]
  /** 是否为跨转生保留的升级。 */
  persistent?: boolean
  /** 是否被 `crystalSafe` 等升级解除上限。 */
  capMult?: boolean
}

export interface MiningRequirementContext {
  maxDepth0: number
  maxDepth1: number
  dwellerCap0: number
  dwellerCap1: number
  unlocks: Record<string, { see: boolean; use: boolean }>
}

/** 判定某个升级在当前上下文下是否可见。 */
export function isUpgradeVisible(def: MiningUpgradeDef, ctx: MiningRequirementContext): boolean {
  switch (def.requirement.type) {
    case 'depth':
      return (def.requirement.subfeature === 0 ? ctx.maxDepth0 : ctx.maxDepth1) >= def.requirement.value
    case 'dwellerCap':
      return (
        (def.requirement.subfeature === 0 ? ctx.dwellerCap0 : ctx.dwellerCap1) >= def.requirement.value
      )
    case 'unlock':
      return ctx.unlocks[def.requirement.key]?.use === true
    case 'unlockSeen':
      return ctx.unlocks[def.requirement.key]?.see === true
    default:
      return true
  }
}

/** 判定某个升级在达到 `lvl` 级后是否还能继续购买（`levelRequirement` 门槛）。 */
export function isUpgradeLevelAllowed(
  def: MiningUpgradeDef,
  ctx: MiningRequirementContext,
  lvl: number,
): boolean {
  if (def.levelRequirement === undefined) {
    return true
  }
  return def.levelRequirement(ctx, lvl)
}

/** `oreSlots` 的分级价格（槽位 0..9）。 */
const ORE_SLOT_PRICES: Record<string, number>[] = [
  { mining_oreAluminium: 10 },
  { mining_oreAluminium: 30 },
  { mining_oreCopper: 20 },
  { mining_oreTin: 15 },
  { mining_oreIron: 12 },
  { mining_oreTitanium: 10 },
  { mining_orePlatinum: 8 },
  { mining_oreIridium: 6 },
  { mining_oreOsmium: 5 },
  { mining_oreLead: 4 },
]

/** `compressor` 的分级价格（等级 0..8）。 */
const COMPRESSOR_PRICES: Record<string, number>[] = [
  { mining_oreAluminium: 20 },
  { mining_oreAluminium: 80 },
  { mining_oreAluminium: 1e4 },
  { mining_oreAluminium: 3e4 },
  { mining_oreAluminium: 5e5 },
  { mining_oreAluminium: 1e7 },
  { mining_oreAluminium: 3e8 },
  { mining_oreAluminium: 1e10 },
  { mining_oreAluminium: 1e12 },
]

/* ══════════════ 子模式 0：普通矿（upgrade.js，81 条） ══════════════ */

export const MINING_UPGRADES: MiningUpgradeDef[] = [
  {
    id: 'damageUp',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.012 + 1.24, lvl) * 120 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.12, lvl) * Math.pow(lvl * 0.2 + 1, 2) },
    ],
  },
  {
    id: 'scrapGainUp',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 5 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.1 + 2.5, lvl) * 1250 }),
    effect: [{ name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) }],
  },
  {
    id: 'scrapCapacityUp',
    kind: 'regular',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'depth', subfeature: 0, value: 10 },
    price: (lvl) => ({ mining_scrap: Math.pow(3.3, lvl) * 3000 }),
    effect: [{ name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) }],
  },
  {
    id: 'aluminiumCache',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 15 },
    price: (lvl) => ({ mining_oreAluminium: Math.round(3 * (lvl + 1)) }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'currencyMiningOreAluminiumCap', type: 'base', value: (lvl) => 2 * lvl },
    ],
  },
  {
    id: 'aluminiumHardening',
    kind: 'regular',
    subfeature: 0,
    cap: 6,
    requirement: { type: 'depth', subfeature: 0, value: 15 },
    price: (lvl) => ({ mining_oreAluminium: 4 * lvl + 2 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => (lvl + 1) * Math.pow(1.5, Math.min(6, lvl)) },
    ],
  },
  {
    id: 'craftingStation',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    requirement: { type: 'depth', subfeature: 0, value: 20 },
    price: () => ({ mining_scrap: 1.8e6 }),
    effect: [{ name: 'miningPickaxeCrafting', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'forge',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'unlock', key: 'miningPickaxeCrafting' },
    price: (lvl) => ({ mining_scrap: Math.pow(1.35, lvl) * 2.5e6 }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) }],
  },
  {
    id: 'oreSlots',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 25 },
    levelRequirement: (ctx, lvl) => ctx.maxDepth0 >= [25, 25, 30, 50, 80, 120, 175, 260, 350, 450][lvl],
    price: (lvl) => ORE_SLOT_PRICES[lvl] ?? {},
    effect: [{ name: 'miningPickaxeCraftingSlots', type: 'base', value: (lvl) => lvl }],
  },
  {
    id: 'compressor',
    kind: 'regular',
    subfeature: 0,
    cap: 9,
    requirement: { type: 'depth', subfeature: 0, value: 25 },
    levelRequirement: (ctx, lvl) => ctx.maxDepth0 >= [25, 35, 60, 95, 140, 200, 280, 375, 480][lvl],
    price: (lvl) => COMPRESSOR_PRICES[lvl] ?? {},
    effect: [
      { name: 'miningCompressAluminium', type: 'unlock', value: (lvl) => lvl >= 1 },
      { name: 'miningCompressCopper', type: 'unlock', value: (lvl) => lvl >= 2 },
      { name: 'miningCompressTin', type: 'unlock', value: (lvl) => lvl >= 3 },
      { name: 'miningCompressIron', type: 'unlock', value: (lvl) => lvl >= 4 },
      { name: 'miningCompressTitanium', type: 'unlock', value: (lvl) => lvl >= 5 },
      { name: 'miningCompressPlatinum', type: 'unlock', value: (lvl) => lvl >= 6 },
      { name: 'miningCompressIridium', type: 'unlock', value: (lvl) => lvl >= 7 },
      { name: 'miningCompressOsmium', type: 'unlock', value: (lvl) => lvl >= 8 },
      { name: 'miningCompressLead', type: 'unlock', value: (lvl) => lvl >= 9 },
    ],
  },
  {
    id: 'copperCache',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    requirement: { type: 'depth', subfeature: 0, value: 30 },
    price: (lvl) => ({ mining_oreCopper: Math.round(lvl + 3) }),
    effect: [
      { name: 'currencyMiningOreAluminiumCap', type: 'base', value: (lvl) => 2 * lvl },
      { name: 'currencyMiningOreCopperCap', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'aluminiumTanks',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    requirement: { type: 'depth', subfeature: 0, value: 30 },
    price: (lvl) => ({ mining_scrap: Math.pow(4.75, lvl) * 4e7 }),
    effect: [
      {
        name: 'currencyMiningOreAluminiumCap',
        type: 'base',
        value: (lvl) => Math.round(Math.pow(lvl, 1.2) * Math.pow(1.1, lvl) * 5),
      },
    ],
  },
  {
    id: 'aluminiumAnvil',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 30 },
    price: (lvl) => ({ mining_oreAluminium: Math.ceil(Math.pow(1.1, lvl) * (lvl + 1) * 10) }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) }],
  },
  {
    id: 'hullbreaker',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 35 },
    price: (lvl) => ({ mining_scrap: Math.pow(1.8, lvl) * 5.5e8 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.3, lvl) },
    ],
  },
  {
    id: 'copperTanks',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    requirement: { type: 'depth', subfeature: 0, value: 40 },
    price: (lvl) => ({ mining_scrap: Math.pow(2.3, lvl) * 3.5e9 }),
    effect: [
      { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: (lvl) => Math.pow(1.4, lvl) },
      { name: 'currencyMiningOreCopperCap', type: 'base', value: (lvl) => 4 * lvl },
    ],
  },
  {
    id: 'depthDweller',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    requirement: { type: 'depth', subfeature: 0, value: 40 },
    price: () => ({ mining_oreCopper: 24 }),
    effect: [{ name: 'miningDepthDweller', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'aluminiumExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    requirement: { type: 'depth', subfeature: 0, value: 45 },
    price: (lvl) => ({ mining_oreAluminium: Math.pow(2.25, lvl) * 150 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) },
      { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
    ],
  },
  {
    id: 'refinery',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    requirement: { type: 'depth', subfeature: 0, value: 45 },
    price: (lvl) => ({ mining_oreCopper: 10 * lvl + 30 }),
    effect: [
      { name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'currencyMiningOreCopperCap', type: 'base', value: (lvl) => 12 * lvl },
    ],
  },
  {
    id: 'copperExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 3,
    requirement: { type: 'depth', subfeature: 0, value: 50 },
    price: (lvl) => ({ mining_scrap: Math.pow(4.2, lvl) * 9e10 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.25, lvl) },
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
    ],
  },
  {
    id: 'drillFuel',
    kind: 'regular',
    subfeature: 0,
    cap: 30,
    requirement: { type: 'depth', subfeature: 0, value: 50 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.1 + 2.4, lvl) * 3.5e10 }),
    effect: [
      {
        name: 'miningDepthDwellerSpeed',
        type: 'mult',
        value: (lvl) => Math.pow(1.02, lvl) * (lvl * 0.05 + 1),
      },
    ],
  },
  {
    id: 'graniteHardening',
    kind: 'regular',
    subfeature: 0,
    cap: 6,
    requirement: { type: 'depth', subfeature: 0, value: 55 },
    price: (lvl) => ({ mining_granite: Math.pow(2.5, lvl) * 1600, mining_oreTin: lvl + 2 }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.3, lvl) }],
  },
  {
    id: 'smeltery',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 60 },
    price: () => ({ mining_granite: 5e4 }),
    effect: [{ name: 'miningSmeltery', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'oreShelf',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 60 },
    price: (lvl) => ({ mining_barAluminium: 5 * Math.pow(2, Math.max(0, lvl - 3)) }),
    effect: [{ name: 'miningOreCap', type: 'base', value: (lvl) => lvl }],
  },
  {
    id: 'heatShield',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 62 },
    price: (lvl) => ({ mining_granite: Math.pow(1.55, lvl) * 2e4 }),
    effect: [{ name: 'miningSmelteryTemperature', type: 'base', value: (lvl) => lvl * 15 }],
  },
  {
    id: 'tinCache',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    requirement: { type: 'depth', subfeature: 0, value: 65 },
    price: (lvl) => ({ mining_scrap: Math.pow(5.75, lvl) * buildNum(25, 'T'), mining_oreTin: lvl * 2 + 1 }),
    effect: [
      { name: 'currencyMiningOreCopperCap', type: 'base', value: (lvl) => lvl * 24 },
      { name: 'currencyMiningOreTinCap', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'furnace',
    kind: 'regular',
    subfeature: 0,
    cap: 25,
    requirement: { type: 'depth', subfeature: 0, value: 70 },
    price: (lvl) => {
      const obj: Record<string, number> = {
        mining_scrap: Math.pow(1.3, lvl) * buildNum(70, 'T'),
        mining_oreTin: Math.floor(lvl * 0.2 * Math.pow(1.15, lvl) + 2),
      }
      if (lvl >= 5) {
        obj.mining_salt = Math.pow(1.45, lvl - 5) * 60
      }
      return obj
    },
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.04 + 1 },
    ],
  },
  {
    id: 'bronzeCache',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    requirement: { type: 'depth', subfeature: 0, value: 75 },
    price: (lvl) => ({
      mining_salt: Math.pow(4, lvl) * 175,
      mining_oreAluminium: Math.pow(2.25, lvl) * 3000,
    }),
    effect: [
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
      { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
    ],
  },
  {
    id: 'ironCache',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 80 },
    price: (lvl) => ({ mining_barAluminium: 12 * Math.pow(2, Math.max(0, lvl - 4)) }),
    effect: [
      { name: 'miningOreQuality', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl * 2 },
    ],
  },
  {
    id: 'oreWashing',
    kind: 'regular',
    subfeature: 0,
    cap: 15,
    requirement: { type: 'depth', subfeature: 0, value: 82 },
    price: (lvl) => ({ mining_scrap: Math.pow(1.35, lvl) * buildNum(16.5, 'Qa') }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) }],
  },
  {
    id: 'ironExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 3,
    requirement: { type: 'depth', subfeature: 0, value: 85 },
    price: (lvl) => ({ mining_oreIron: lvl * 3 + 2 }),
    effect: [
      { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'bronzeDrill',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 87 },
    price: (lvl) => ({ mining_barBronze: 5 * Math.pow(2, Math.max(0, lvl - 4)) }),
    effect: [{ name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.08 + 1 }],
  },
  {
    id: 'ironHardening',
    kind: 'regular',
    subfeature: 0,
    cap: 12,
    requirement: { type: 'depth', subfeature: 0, value: 90 },
    price: (lvl) => ({ mining_oreIron: Math.floor(Math.pow(1.35, lvl) + 1) }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) },
      { name: 'currencyMiningOreTinCap', type: 'base', value: (lvl) => lvl * 2 },
    ],
  },
  {
    id: 'ironFilter',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    requirement: { type: 'depth', subfeature: 0, value: 95 },
    price: (lvl) => ({ mining_oreIron: Math.floor(Math.pow(1.85, lvl) * 5) }),
    effect: [{ name: 'currencyMiningOreAluminiumCap', type: 'base', value: (lvl) => lvl * 36 }],
  },
  {
    id: 'masterForge',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 98 },
    price: (lvl) => ({ mining_coal: lvl * 20 + 80 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.12, lvl) },
      { name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.1, lvl) },
    ],
  },
  {
    id: 'starForge',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 98 },
    price: (lvl) => ({ mining_coal: lvl * 20 + 80 }),
    effect: [
      { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: (lvl) => Math.pow(1.06, lvl) },
    ],
  },
  {
    id: 'magnet',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 100 },
    price: (lvl) => ({
      mining_scrap: Math.pow(1.55, lvl) * buildNum(440, 'Qa'),
      mining_oreIron: lvl * 5 + 10,
    }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) },
      { name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
    ],
  },
  {
    id: 'bronzeFilter',
    kind: 'regular',
    subfeature: 0,
    cap: 6,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 102 },
    price: (lvl) => ({ mining_barBronze: 7 * Math.pow(2, Math.max(0, lvl - 5)) }),
    effect: [{ name: 'miningRareEarthGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'enhancingStation',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 105 },
    price: () => ({ mining_coal: 250 }),
    effect: [{ name: 'miningEnhancement', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'enhancingHammer',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'unlock', key: 'miningEnhancement' },
    price: (lvl) => ({ mining_barAluminium: Math.ceil(Math.pow(1.25, lvl) * 20) }),
    effect: [{ name: 'miningEnhancementMax', type: 'base', value: (lvl) => lvl }],
  },
  {
    id: 'warehouse',
    kind: 'regular',
    subfeature: 0,
    cap: 12,
    requirement: { type: 'depth', subfeature: 0, value: 110 },
    price: (lvl) => ({ mining_scrap: Math.pow(6, lvl) * buildNum(6.075, 'Qi') }),
    effect: [
      {
        name: 'currencyMiningOreAluminiumCap',
        type: 'mult',
        value: (lvl) => (lvl >= 1 ? Math.pow(2, Math.floor((lvl + 3) / 4)) : null),
      },
      {
        name: 'currencyMiningOreCopperCap',
        type: 'mult',
        value: (lvl) => (lvl >= 2 ? Math.pow(2, Math.floor((lvl + 2) / 4)) : null),
      },
      {
        name: 'currencyMiningOreTinCap',
        type: 'mult',
        value: (lvl) => (lvl >= 3 ? Math.pow(2, Math.floor((lvl + 1) / 4)) : null),
      },
      {
        name: 'currencyMiningOreIronCap',
        type: 'mult',
        value: (lvl) => (lvl >= 4 ? Math.pow(2, Math.floor(lvl / 4)) : null),
      },
    ],
  },
  {
    id: 'corrosiveFumes',
    kind: 'regular',
    subfeature: 0,
    cap: 15,
    requirement: { type: 'depth', subfeature: 0, value: 112 },
    price: (lvl) => ({ mining_sulfur: Math.pow(3.5, lvl) * 2000 }),
    effect: [
      { name: 'miningToughness', type: 'mult', value: (lvl) => splicedPow(1 / 1.2, 1 / 1.1, 15, lvl) },
    ],
  },
  {
    id: 'smeltingSalt',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 115 },
    price: (lvl) => ({ mining_salt: Math.pow(lvl * 0.01 + 1.4, lvl) * buildNum(10, 'K') }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.11, lvl) }],
  },
  {
    id: 'titaniumExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 3,
    requirement: { type: 'depth', subfeature: 0, value: 120 },
    price: (lvl) => ({
      mining_oreCopper: Math.pow(2.75, lvl) * 7.5e4,
      mining_oreTin: Math.pow(2.1, lvl) * 8000,
    }),
    effect: [
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl * 3 },
      { name: 'currencyMiningOreIronCap', type: 'mult', value: (lvl) => Math.pow(1.25, lvl) },
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'emberForge',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 125 },
    price: (lvl) => ({ mining_coal: lvl * 3 + 80 }),
    effect: [
      { name: 'currencyMiningEmberGain', type: 'base', value: (lvl) => getDiminishing(lvl) * 0.05 },
    ],
  },
  {
    id: 'bronzeForge',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 128 },
    price: (lvl) => ({ mining_barBronze: Math.ceil(Math.pow(1.28, lvl) * 12) }),
    effect: [{ name: 'currencyMiningEmberGain', type: 'base', value: (lvl) => lvl * 0.03 }],
  },
  {
    id: 'titaniumCache',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    requirement: { type: 'depth', subfeature: 0, value: 130 },
    price: (lvl) => ({
      mining_scrap: Math.pow(7, lvl) * buildNum(80, 'Sx'),
      mining_oreTitanium: Math.pow(2, lvl) * 4,
      mining_sulfur: Math.pow(2.2, lvl) * buildNum(45, 'K'),
    }),
    effect: [
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => lvl * 0.4 + 1 },
      { name: 'currencyMiningOreTinCap', type: 'base', value: (lvl) => lvl * 10 },
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl * 4 },
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl * 2 },
    ],
  },
  {
    id: 'smallBombs',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 131 },
    price: (lvl) => ({ mining_barSteel: 5 * Math.pow(2, Math.max(0, lvl - 4)) }),
    effect: [{ name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.075, lvl) }],
  },
  {
    id: 'giantForge',
    kind: 'regular',
    subfeature: 0,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 132 },
    price: (lvl) => ({ mining_coal: Math.round(Math.pow(1.25, lvl) * 1200) }),
    effect: [{ name: 'currencyMiningEmberCap', type: 'base', value: (lvl) => lvl * 50 }],
  },
  {
    id: 'gunpowder',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 135 },
    price: (lvl) => ({
      mining_coal: Math.round(Math.pow(1.1 + 0.01 * lvl, lvl) * (lvl * 10 + 100)),
      mining_sulfur: Math.pow(1.5 + 0.1 * lvl, lvl) * buildNum(120, 'K'),
      mining_niter: Math.round(Math.pow(1.1 + 0.02 * lvl, lvl) * (lvl * 100 + 500)),
    }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.25, lvl) },
    ],
  },
  {
    id: 'nitricAcid',
    kind: 'regular',
    subfeature: 0,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 138 },
    price: (lvl) => ({ mining_niter: Math.round(Math.pow(1.05, lvl) * (lvl * 200 + 1000)) }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'metalDetector',
    kind: 'regular',
    subfeature: 0,
    cap: 14,
    requirement: { type: 'depth', subfeature: 0, value: 140 },
    price: (lvl) => ({
      mining_scrap: Math.pow(3.5, lvl) * buildNum(15, 'Sp'),
      mining_oreIron: Math.pow(1.35, lvl) * 1650,
    }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.08, lvl) },
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.25, lvl) },
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl * 2 },
    ],
  },
  {
    id: 'nails',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 142 },
    price: (lvl) => ({ mining_barSteel: 7 * Math.pow(2, Math.max(0, lvl - 7)) }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.05 + 1 }],
  },
  {
    id: 'recycling',
    kind: 'regular',
    subfeature: 0,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 145 },
    price: (lvl) => ({ mining_ember: Math.round(Math.pow(1.15, lvl) * 50) }),
    effect: [
      {
        name: 'currencyMiningScrapGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.25 + 1),
      },
    ],
  },
  {
    id: 'stickyJar',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 150 },
    price: () => ({ mining_scrap: buildNum(4, 'O') }),
    effect: [{ name: 'miningResin', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'acidVial',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 152 },
    price: (lvl) => ({ mining_niter: Math.round(Math.pow(1.15, lvl) * (lvl * 750 + 1500)) }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'scanning',
    kind: 'regular',
    subfeature: 0,
    persistent: true,
    requirement: { type: 'depth', subfeature: 0, value: 155 },
    price: (lvl) => ({ mining_obsidian: Math.pow(2, lvl) * buildNum(10, 'K') }),
    effect: [{ name: 'miningRareEarthGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) }],
  },
  {
    id: 'largerSurface',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    requirement: { type: 'depth', subfeature: 0, value: 160 },
    price: (lvl) => ({ mining_scrap: Math.pow(4000, lvl) * buildNum(6, 'N') }),
    effect: [
      { name: 'miningResinMax', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl * 12 },
    ],
  },
  {
    id: 'qualityWorkbench',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'depth', subfeature: 0, value: 165 },
    price: (lvl) => ({
      mining_scrap: Math.pow(4.6, lvl) * buildNum(35, 'N'),
      mining_granite: Math.pow(3.85, lvl) * buildNum(300, 'B'),
    }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) }],
  },
  {
    id: 'titaniumForge',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 170 },
    price: (lvl) => ({ mining_barSteel: 12 * Math.pow(2, Math.max(0, lvl - 7)) }),
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 },
    ],
  },
  {
    id: 'dynamite',
    kind: 'regular',
    subfeature: 0,
    cap: 15,
    requirement: { type: 'depth', subfeature: 0, value: 175 },
    price: (lvl) => ({ mining_scrap: Math.pow(3.33, lvl) * buildNum(135, 'N') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) * (lvl * 0.1 + 1) },
    ],
  },
  {
    id: 'platinumExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    requirement: { type: 'depth', subfeature: 0, value: 180 },
    price: (lvl) => ({
      mining_oreCopper: Math.pow(1.75, lvl) * 1.5e6,
      mining_oreIron: Math.pow(2.25, lvl) * 2e4,
    }),
    effect: [
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => Math.pow(2, lvl) },
      { name: 'currencyMiningOrePlatinumCap', type: 'base', value: (lvl) => getSequence(3, lvl) },
    ],
  },
  {
    id: 'hiddenStash',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 185 },
    price: (lvl) => ({ mining_barTitanium: 5 * Math.pow(2, Math.max(0, lvl - 7)) }),
    effect: [{ name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => lvl * 0.075 + 1 }],
  },
  {
    id: 'platinumCache',
    kind: 'regular',
    subfeature: 0,
    cap: 6,
    requirement: { type: 'depth', subfeature: 0, value: 190 },
    price: (lvl) => ({
      mining_oreTitanium: Math.pow(2, lvl) * 450,
      mining_salt: Math.pow(1.85, lvl) * buildNum(60, 'M'),
      mining_sulfur: Math.pow(2.2, lvl) * buildNum(800, 'M'),
    }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => lvl * 0.4 + 1 },
      { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => lvl * 0.5 + 1 },
    ],
  },
  {
    id: 'colossalOreStorage',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    requirement: { type: 'depth', subfeature: 0, value: 200 },
    price: () => ({ mining_scrap: buildNum(10, 'D') }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOreIronCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
      { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => Math.pow(3, lvl) },
    ],
  },
  {
    id: 'smallOreStorage',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 210 },
    price: (lvl) => ({ mining_barTitanium: 8 * Math.pow(2, Math.max(0, lvl - 4)) }),
    effect: [{ name: 'miningOreCap', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'titaniumBombs',
    kind: 'regular',
    subfeature: 0,
    cap: 16,
    requirement: { type: 'depth', subfeature: 0, value: 220 },
    price: (lvl) => ({
      mining_scrap: Math.pow(3.1, lvl) * buildNum(440, 'UD'),
      mining_oreTitanium: Math.pow(1.3, lvl) * 1750,
    }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) }],
  },
  {
    id: 'titaniumPickaxe',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 230 },
    price: (lvl) => ({ mining_barTitanium: 14 * Math.pow(2, Math.max(0, lvl - 9)) }),
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => lvl * 0.05 + 1 },
      { name: 'miningPickaxeCraftingQuality', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'undergroundRadar',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 240 },
    price: (lvl) => ({ mining_barShiny: 10 * Math.pow(2, Math.max(0, lvl - 4)) }),
    effect: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: (lvl) => lvl * 0.05 + 1 }],
  },
  {
    id: 'scrapShelf',
    kind: 'regular',
    subfeature: 0,
    cap: 30,
    requirement: { type: 'depth', subfeature: 0, value: 250 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.05 + 2.1, lvl) * 2e39 }),
    effect: [{ name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) }],
  },
  {
    id: 'iridiumExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 10,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 260 },
    price: (lvl) => ({ mining_barShiny: 13 + Math.max(0, lvl - 9) }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => lvl * 0.05 + 1 },
      { name: 'currencyMiningOreIridiumCap', type: 'base', value: (lvl) => getSequence(1, lvl) },
    ],
  },
  {
    id: 'iridiumCache',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    requirement: { type: 'depth', subfeature: 0, value: 270 },
    price: (lvl) => ({
      mining_scrap: Math.pow(22.5, lvl) * 1e40,
      mining_sulfur: Math.pow(2.45, lvl) * 1.3e13,
    }),
    effect: [
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 },
      { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => lvl * 0.5 + 1 },
      { name: 'currencyMiningOreIridiumCap', type: 'mult', value: (lvl) => lvl + 1 },
    ],
  },
  {
    id: 'stonecutter',
    kind: 'regular',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'depth', subfeature: 0, value: 275 },
    price: (lvl) => ({
      mining_scrap: Math.pow(lvl * 0.04 + 2, lvl) * 3.5e41,
      mining_salt: Math.pow(1.225, lvl) * 1.45e15,
      mining_deeprock: Math.pow(1.375, lvl) * 1.1e9,
    }),
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.12, lvl) },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'iridiumTreetap',
    kind: 'regular',
    subfeature: 0,
    cap: 4,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 280 },
    price: (lvl) => ({
      mining_deeprock: Math.pow(7.5, lvl) * 5e8,
      mining_barIridium: 7 * Math.pow(2, Math.max(0, lvl - 3)),
    }),
    effect: [
      { name: 'currencyMiningResinCap', type: 'base', value: (lvl) => lvl * 10 },
      { name: 'miningResinMax', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'deepCuts',
    kind: 'regular',
    subfeature: 0,
    requirement: { type: 'depth', subfeature: 0, value: 290 },
    price: (lvl) => ({ mining_deeprock: Math.pow(lvl * 0.01 + 1.5, lvl) * buildNum(2.5, 'B') }),
    effect: [{ name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.25, lvl) }],
  },
  {
    id: 'iridiumBombs',
    kind: 'regular',
    subfeature: 0,
    cap: 7,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 310 },
    price: (lvl) => ({ mining_barIridium: 10 * Math.pow(2, Math.max(0, lvl - 6)) }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'oreBag',
    kind: 'regular',
    subfeature: 0,
    cap: 12,
    requirement: { type: 'depth', subfeature: 0, value: 330 },
    price: (lvl) => ({
      mining_deeprock: Math.pow(1.65, lvl) * buildNum(800, 'B'),
      mining_sulfur: Math.pow(1.9, lvl) * buildNum(450, 'T'),
    }),
    effect: [
      { name: 'currencyMiningOreTinCap', type: 'base', value: (lvl) => lvl * 12 },
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl * 10 },
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl * 4 },
      { name: 'currencyMiningOrePlatinumCap', type: 'base', value: (lvl) => lvl * 4 },
    ],
  },
  {
    id: 'osmiumExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 9,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 350 },
    price: (lvl) => ({
      mining_barShiny: 18 * Math.pow(2, Math.max(0, lvl - 8)),
      mining_barIridium: 12 * Math.pow(2, Math.max(0, lvl - 8)),
    }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
      { name: 'currencyMiningOreOsmiumCap', type: 'base', value: (lvl) => lvl * 4 },
    ],
  },
  {
    id: 'osmiumCache',
    kind: 'regular',
    subfeature: 0,
    cap: 7,
    requirement: { type: 'depth', subfeature: 0, value: 355 },
    price: (lvl) => ({
      mining_scrap: Math.pow(6.75, lvl) * buildNum(900, 'SxD'),
      mining_deeprock: Math.pow(2.1, lvl) * buildNum(42, 'T'),
    }),
    effect: [
      { name: 'currencyMiningOreOsmiumCap', type: 'base', value: (lvl) => lvl * 2 },
      { name: 'currencyMiningOreOsmiumCap', type: 'mult', value: (lvl) => lvl + 1 },
    ],
  },
  {
    id: 'darkBombs',
    kind: 'regular',
    subfeature: 0,
    cap: 5,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 375 },
    price: (lvl) => ({ mining_barDarkIron: 6 * Math.pow(2, Math.max(0, lvl - 9)) }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.05 + 1 },
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
    ],
  },
  {
    id: 'colossalScrapStorage',
    kind: 'regular',
    subfeature: 0,
    cap: 1,
    requirement: { type: 'depth', subfeature: 0, value: 400 },
    price: () => ({ mining_scrap: buildNum(1, 'V') }),
    effect: [
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => Math.pow(buildNum(1, 'M'), lvl),
      },
    ],
  },
  {
    id: 'stoneDissolver',
    kind: 'regular',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'depth', subfeature: 0, value: 425 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.02 + 1.8, lvl) * buildNum(1, 'UV') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) },
      { name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.3, lvl) },
    ],
  },
  {
    id: 'leadExpansion',
    kind: 'regular',
    subfeature: 0,
    cap: 8,
    capMult: true,
    requirement: { type: 'depth', subfeature: 0, value: 450 },
    price: (lvl) => ({ mining_barDarkIron: 7 * Math.pow(2, Math.max(0, lvl - 7)) }),
    effect: [
      { name: 'miningOreCap', type: 'mult', value: (lvl) => lvl * 0.05 + 1 },
      { name: 'currencyMiningOreLeadCap', type: 'base', value: (lvl) => lvl * 7 },
    ],
  },
]

/* ══════════════ 子模式 1：气态（upgrade2.js，25 条） ══════════════ */

export const MINING_GAS_UPGRADES: MiningUpgradeDef[] = [
  {
    id: 'fumes',
    kind: 'regular',
    subfeature: 1,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.012 + 1.24, lvl) * buildNum(750, 'K') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.12, lvl) * Math.pow(lvl * 0.2 + 1, 2) },
    ],
  },
  {
    id: 'smallCrate',
    kind: 'regular',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'depth', subfeature: 1, value: 3 },
    price: (lvl) => ({ mining_limestone: Math.pow(lvl * 0.025 + 1.35, lvl) * 1000 }),
    effect: [{ name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) }],
  },
  {
    id: 'giantCrate',
    kind: 'regular',
    subfeature: 1,
    requirement: { type: 'depth', subfeature: 1, value: 5 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 2 + 8, lvl) * buildNum(2.5, 'M') }),
    effect: [{ name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(6, lvl) }],
  },
  {
    id: 'morePressure',
    kind: 'regular',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'depth', subfeature: 1, value: 10 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.025 + 1.75, lvl) * buildNum(400, 'M') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.25, lvl) },
    ],
  },
  {
    id: 'gasDweller',
    kind: 'regular',
    subfeature: 1,
    cap: 1,
    persistent: true,
    requirement: { type: 'depth', subfeature: 1, value: 15 },
    price: () => ({ mining_helium: 250 }),
    effect: [
      { name: 'miningDepthDweller', type: 'unlock', value: (lvl) => lvl >= 1 },
      { name: 'miningDepthDwellerMax', type: 'mult', value: (lvl) => Math.pow(1 / 1.25, lvl) },
    ],
  },
  {
    id: 'piston',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 20 },
    price: (lvl) => ({ mining_helium: Math.round(Math.pow(1.35, lvl) * 50) }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.05, lvl) * (lvl * 0.2 + 1) },
    ],
  },
  {
    id: 'pollution',
    kind: 'regular',
    subfeature: 1,
    cap: 1,
    persistent: true,
    requirement: { type: 'depth', subfeature: 1, value: 25 },
    price: () => ({ mining_helium: 1000 }),
    effect: [{ name: 'miningSmoke', type: 'unlock', value: (lvl) => lvl >= 1 }],
  },
  {
    id: 'particleFilter',
    kind: 'regular',
    subfeature: 1,
    requirement: { type: 'unlock', key: 'miningSmoke' },
    price: (lvl) => ({ mining_scrap: Math.pow(1.4, lvl) * buildNum(1, 'T') }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) }],
  },
  {
    id: 'hotAirBalloon',
    kind: 'regular',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'depth', subfeature: 1, value: 30 },
    price: (lvl) => ({ mining_scrap: Math.pow(3.75, lvl) * buildNum(2.2, 'T') }),
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) },
      { name: 'currencyMiningSmokeCap', type: 'mult', value: (lvl) => lvl * 0.5 + 1 },
    ],
  },
  {
    id: 'conductor',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 35 },
    price: (lvl) => ({
      mining_scrap: Math.pow(40, lvl) * buildNum(10, 'T'),
      mining_limestone: Math.pow(4.5, lvl) * buildNum(200, 'K'),
    }),
    effect: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'vent',
    kind: 'regular',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'depth', subfeature: 1, value: 40 },
    price: (lvl) => ({ mining_scrap: Math.pow(1.85, lvl) * buildNum(40, 'T') }),
    effect: [{ name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.3, lvl) }],
  },
  {
    id: 'urn',
    kind: 'regular',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'depth', subfeature: 1, value: 45 },
    price: (lvl) => ({ mining_limestone: Math.pow(2.8, lvl) * buildNum(850, 'K') }),
    effect: [
      { name: 'currencyMiningSmokeCap', type: 'mult', value: (lvl) => getSequence(5, lvl) * 0.05 + 1 },
    ],
  },
  {
    id: 'lunarBlessing',
    kind: 'regular',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'depth', subfeature: 1, value: 50 },
    price: (lvl) => ({ mining_moonshard: Math.pow(2, lvl) * 10 }),
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.05, lvl) },
    ],
  },
  {
    id: 'harvester',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 60 },
    price: (lvl) => ({ mining_neon: Math.round(Math.pow(1.35, lvl) * 50) }),
    effect: [
      {
        name: 'currencyMiningScrapGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.05, lvl) * (lvl * 0.3 + 1),
      },
    ],
  },
  {
    id: 'chalkboard',
    kind: 'regular',
    subfeature: 1,
    cap: 15,
    requirement: { type: 'depth', subfeature: 1, value: 70 },
    price: (lvl) => ({ mining_moonshard: Math.pow(2.25, lvl) * buildNum(30, 'K') }),
    effect: [
      { name: 'currencyMiningLimestoneGain', type: 'mult', value: (lvl) => Math.pow(1.35, lvl) },
    ],
  },
  {
    id: 'graphiteRod',
    kind: 'regular',
    subfeature: 1,
    cap: 40,
    requirement: { type: 'depth', subfeature: 1, value: 80 },
    price: (lvl) => ({ mining_scrap: Math.pow(1.85, lvl) * buildNum(2, 'Qi') }),
    effect: [
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.12, lvl) },
      { name: 'currencyMiningSmokeCap', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'minecart',
    kind: 'regular',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'depth', subfeature: 1, value: 90 },
    price: (lvl) => ({ mining_limestone: Math.pow(lvl * 0.03 + 2.15, lvl) * buildNum(5, 'B') }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) },
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'moonstone',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 100 },
    price: (lvl) => ({ mining_moonshard: Math.pow(10, lvl) * buildNum(1, 'M') }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.5, lvl) }],
  },
  {
    id: 'nightVisionDevice',
    kind: 'regular',
    subfeature: 1,
    cap: 40,
    requirement: { type: 'depth', subfeature: 1, value: 115 },
    price: (lvl) => ({ mining_scrap: Math.pow(1.85, lvl) * buildNum(75, 'O') }),
    effect: [
      {
        name: 'miningRareEarthGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.1 + 1),
      },
    ],
  },
  {
    id: 'enrichedCrystal',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 130 },
    price: (lvl) => ({ mining_argon: Math.round(Math.pow(1.35, lvl) * 50) }),
    effect: [
      { name: 'currencyMiningCrystalYellowGain', type: 'mult', value: (lvl) => lvl * 0.05 + 1 },
    ],
  },
  {
    id: 'matches',
    kind: 'regular',
    subfeature: 1,
    requirement: { type: 'depth', subfeature: 1, value: 150 },
    price: (lvl) => ({ mining_phosphorus: Math.pow(lvl * 0.05 + 2.25, lvl) * 8 }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) }],
  },
  {
    id: 'smokeStabilizer',
    kind: 'regular',
    subfeature: 1,
    cap: 50,
    requirement: { type: 'depth', subfeature: 1, value: 170 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.01 + 1.7, lvl) * buildNum(1.25, 'UD') }),
    effect: [{ name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.14, lvl) }],
  },
  {
    id: 'elevator',
    kind: 'regular',
    subfeature: 1,
    cap: 30,
    requirement: { type: 'depth', subfeature: 1, value: 190 },
    price: (lvl) => ({
      mining_limestone: Math.pow(lvl * 0.05 + 2.25, lvl) * buildNum(80, 'T'),
      mining_moonshard: Math.pow(lvl * 0.06 + 2.5, lvl) * buildNum(3.5, 'T'),
      mining_phosphorus: Math.pow(lvl * 0.03 + 1.75, lvl) * 6600,
    }),
    effect: [{ name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.3, lvl) }],
  },
  {
    id: 'shovel',
    kind: 'regular',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'depth', subfeature: 1, value: 210 },
    price: (lvl) => ({ mining_scrap: Math.pow(lvl * 0.08 + 2.16, lvl) * buildNum(860, 'TD') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'miningPickaxeCraftingPower', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'smoker',
    kind: 'regular',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'depth', subfeature: 1, value: 230 },
    price: (lvl) => ({ mining_krypton: Math.round(Math.pow(1.35, lvl) * 50) }),
    effect: [
      {
        name: 'currencyMiningSmokeGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.05, lvl) * (lvl * 0.2 + 1),
      },
    ],
  },
]

/* ══════════════ 声望升级（upgradePrestige.js，54 条） ══════════════ */

export const MINING_PRESTIGE_UPGRADES: MiningUpgradeDef[] = [
  {
    id: 'crystalBasics',
    kind: 'prestige',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(2, lvl) * 5 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.4, lvl) },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) },
    ],
  },
  {
    id: 'crystalTips',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.15, lvl) * 10 }),
    effect: [{ name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }],
  },
  {
    id: 'crystalStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.15, lvl) * 5 }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalLens',
    kind: 'prestige',
    subfeature: 0,
    cap: 25,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.25, lvl) * 8 }),
    effect: [{ name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.15 + 1 }],
  },
  {
    id: 'crystalAluminiumStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 10 }),
    effect: [
      { name: 'currencyMiningOreAluminiumCap', type: 'base', value: (lvl) => lvl * 12 },
      { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalCopperStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'none' },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 15 }),
    effect: [
      { name: 'currencyMiningOreCopperCap', type: 'base', value: (lvl) => lvl * 4 },
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalTinStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 50 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 60 }),
    effect: [
      { name: 'currencyMiningOreTinCap', type: 'base', value: (lvl) => lvl * 2 },
      { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalIronStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 80 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 450 }),
    effect: [
      { name: 'currencyMiningOreIronCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreIronCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalTitaniumStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 120 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(12, 'K') }),
    effect: [
      { name: 'currencyMiningOreTitaniumCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalPlatinumStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 175 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(5, 'M') }),
    effect: [
      { name: 'currencyMiningOrePlatinumCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalIridiumStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 260 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(2.6, 'T') }),
    effect: [
      { name: 'currencyMiningOreIridiumCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreIridiumCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalOsmiumStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 350 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(2.6, 'T') }),
    effect: [
      { name: 'currencyMiningOreOsmiumCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreOsmiumCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalLeadStorage',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'depth', subfeature: 0, value: 450 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(2.6, 'T') }),
    effect: [
      { name: 'currencyMiningOreLeadCap', type: 'base', value: (lvl) => lvl },
      { name: 'currencyMiningOreLeadCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalDrill',
    kind: 'prestige',
    subfeature: 0,
    cap: 53,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 5 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(lvl * 0.01 + 1.5, lvl) * 30 }),
    effect: [
      {
        name: 'miningDepthDwellerMax',
        type: 'base',
        value: (lvl) => Math.min(getApproaching(0.01, 0.9, lvl), 0.4),
      },
    ],
  },
  {
    id: 'crystalDetector',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 10 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 40 }),
    effect: [{ name: 'miningRareEarthGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'crystalReplicator',
    kind: 'prestige',
    subfeature: 0,
    cap: 100,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 12 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.7 + lvl * 0.008, lvl) * 90 }),
    effect: [
      { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'crystalPreservarium',
    kind: 'prestige',
    subfeature: 0,
    cap: 3,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 15 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(4, lvl) * 250 }),
    effect: [
      { name: 'mining_scrapCapacityUp', type: 'keepUpgrade', value: (lvl) => lvl >= 1 },
      { name: 'mining_scrapGainUp', type: 'keepUpgrade', value: (lvl) => lvl >= 2 },
      { name: 'mining_damageUp', type: 'keepUpgrade', value: (lvl) => lvl >= 3 },
    ],
  },
  {
    id: 'crystalTools',
    kind: 'prestige',
    subfeature: 0,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 16 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(lvl * 0.02 + 1.4, lvl) * 120 }),
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.11, lvl) },
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.08, lvl) },
    ],
  },
  {
    id: 'crystalExplosives',
    kind: 'prestige',
    subfeature: 0,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 20 },
    price: (lvl) => ({
      mining_crystalGreen: Math.pow(Math.max((lvl - 100) * 0.0005, 0) + 1.15, lvl) * 200,
    }),
    effect: [{ name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.2, lvl) }],
  },
  {
    id: 'crystalRefinery',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 25 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 650 }),
    effect: [
      { name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.04 + 1 },
      { name: 'miningRareEarthGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) },
    ],
  },
  {
    id: 'crystalSmeltery',
    kind: 'prestige',
    subfeature: 0,
    cap: 100,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 30 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * 3300 }),
    effect: [
      { name: 'miningSmelteryTemperature', type: 'base', value: (lvl) => 10 * lvl },
      {
        name: 'miningSmelteryTime',
        type: 'mult',
        value: (lvl) => 1 / (Math.pow(1.02, lvl) * (lvl * 0.08 + 1)),
      },
    ],
  },
  {
    id: 'crystalEnhancer',
    kind: 'prestige',
    subfeature: 0,
    cap: 7,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 35 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(100, lvl) * 2e5 }),
    effect: [{ name: 'miningEnhancementMax', type: 'base', value: (lvl) => lvl }],
  },
  {
    id: 'crystalTreetap',
    kind: 'prestige',
    subfeature: 0,
    cap: 40,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 40 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(75, 'K') }),
    effect: [{ name: 'currencyMiningResinGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 }],
  },
  {
    id: 'crystalSalt',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 50 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(1.1, 'M') }),
    effect: [
      {
        name: 'currencyMiningSaltGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.2 + 1),
      },
    ],
  },
  {
    id: 'crystalBottle',
    kind: 'prestige',
    subfeature: 0,
    cap: 25,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 60 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(lvl * 0.1 + 2, lvl) * buildNum(12.5, 'M') }),
    effect: [{ name: 'currencyMiningResinCap', type: 'base', value: (lvl) => lvl }],
  },
  {
    id: 'crystalSafe',
    kind: 'prestige',
    subfeature: 0,
    cap: 17,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 65 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(10, lvl) * 1e8 }),
    effect: [
      { name: 'mining_oreShelf', type: 'keepUpgrade', value: (lvl) => lvl >= 1 },
      { name: 'mining_oreShelf', type: 'uncapUpgrade', value: (lvl) => lvl >= 1 },
      { name: 'mining_ironCache', type: 'keepUpgrade', value: (lvl) => lvl >= 2 },
      { name: 'mining_ironCache', type: 'uncapUpgrade', value: (lvl) => lvl >= 2 },
      { name: 'mining_bronzeDrill', type: 'keepUpgrade', value: (lvl) => lvl >= 3 },
      { name: 'mining_bronzeDrill', type: 'uncapUpgrade', value: (lvl) => lvl >= 3 },
      { name: 'mining_bronzeFilter', type: 'keepUpgrade', value: (lvl) => lvl >= 4 },
      { name: 'mining_bronzeFilter', type: 'uncapUpgrade', value: (lvl) => lvl >= 4 },
      { name: 'mining_smallBombs', type: 'keepUpgrade', value: (lvl) => lvl >= 5 },
      { name: 'mining_smallBombs', type: 'uncapUpgrade', value: (lvl) => lvl >= 5 },
      { name: 'mining_nails', type: 'keepUpgrade', value: (lvl) => lvl >= 6 },
      { name: 'mining_nails', type: 'uncapUpgrade', value: (lvl) => lvl >= 6 },
      { name: 'mining_titaniumForge', type: 'keepUpgrade', value: (lvl) => lvl >= 7 },
      { name: 'mining_titaniumForge', type: 'uncapUpgrade', value: (lvl) => lvl >= 7 },
      { name: 'mining_hiddenStash', type: 'keepUpgrade', value: (lvl) => lvl >= 8 },
      { name: 'mining_hiddenStash', type: 'uncapUpgrade', value: (lvl) => lvl >= 8 },
      { name: 'mining_smallOreStorage', type: 'keepUpgrade', value: (lvl) => lvl >= 9 },
      { name: 'mining_smallOreStorage', type: 'uncapUpgrade', value: (lvl) => lvl >= 9 },
      { name: 'mining_titaniumPickaxe', type: 'keepUpgrade', value: (lvl) => lvl >= 10 },
      { name: 'mining_titaniumPickaxe', type: 'uncapUpgrade', value: (lvl) => lvl >= 10 },
      { name: 'mining_undergroundRadar', type: 'keepUpgrade', value: (lvl) => lvl >= 11 },
      { name: 'mining_undergroundRadar', type: 'uncapUpgrade', value: (lvl) => lvl >= 11 },
      { name: 'mining_iridiumExpansion', type: 'keepUpgrade', value: (lvl) => lvl >= 12 },
      { name: 'mining_iridiumExpansion', type: 'uncapUpgrade', value: (lvl) => lvl >= 12 },
      { name: 'mining_iridiumTreetap', type: 'keepUpgrade', value: (lvl) => lvl >= 13 },
      { name: 'mining_iridiumTreetap', type: 'uncapUpgrade', value: (lvl) => lvl >= 13 },
      { name: 'mining_iridiumBombs', type: 'keepUpgrade', value: (lvl) => lvl >= 14 },
      { name: 'mining_iridiumBombs', type: 'uncapUpgrade', value: (lvl) => lvl >= 14 },
      { name: 'mining_osmiumExpansion', type: 'keepUpgrade', value: (lvl) => lvl >= 15 },
      { name: 'mining_osmiumExpansion', type: 'uncapUpgrade', value: (lvl) => lvl >= 15 },
      { name: 'mining_darkBombs', type: 'keepUpgrade', value: (lvl) => lvl >= 16 },
      { name: 'mining_darkBombs', type: 'uncapUpgrade', value: (lvl) => lvl >= 16 },
      { name: 'mining_leadExpansion', type: 'keepUpgrade', value: (lvl) => lvl >= 17 },
      { name: 'mining_leadExpansion', type: 'uncapUpgrade', value: (lvl) => lvl >= 17 },
    ],
  },
  {
    id: 'crystalEngine',
    kind: 'prestige',
    subfeature: 0,
    cap: 50,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 75 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.4, lvl) * buildNum(230, 'M') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.25 + 1) },
    ],
  },
  {
    id: 'crystalCoal',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 90 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(lvl * 0.05 + 1.75, lvl) * buildNum(27, 'B') }),
    effect: [{ name: 'currencyMiningCoalGain', type: 'mult', value: (lvl) => lvl * 0.05 + 1 }],
  },
  {
    id: 'crystalTruck',
    kind: 'prestige',
    subfeature: 0,
    cap: 10,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 105 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(10, lvl) * buildNum(1, 'T') }),
    effect: [
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => Math.pow(1.5, lvl) * (lvl * 0.5 + 1),
      },
    ],
  },
  {
    id: 'crystalExpansion',
    kind: 'prestige',
    subfeature: 0,
    cap: 9,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 120 },
    price: (lvl) => ({
      mining_crystalGreen:
        Math.pow(10, lvl) * Math.pow(1000, Math.max(0, lvl - 6)) * buildNum(25, 'T'),
    }),
    effect: [
      {
        name: 'currencyMiningOreAluminiumCap',
        type: 'mult',
        value: (lvl) => (lvl >= 1 ? 10 : null),
      },
      { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => (lvl >= 2 ? 10 : null) },
      { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => (lvl >= 3 ? 10 : null) },
      { name: 'currencyMiningOreIronCap', type: 'mult', value: (lvl) => (lvl >= 4 ? 10 : null) },
      { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => (lvl >= 5 ? 10 : null) },
      { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => (lvl >= 6 ? 10 : null) },
      { name: 'currencyMiningOreIridiumCap', type: 'mult', value: (lvl) => (lvl >= 7 ? 10 : null) },
      { name: 'currencyMiningOreOsmiumCap', type: 'mult', value: (lvl) => (lvl >= 8 ? 10 : null) },
      { name: 'currencyMiningOreLeadCap', type: 'mult', value: (lvl) => (lvl >= 9 ? 10 : null) },
    ],
  },
  {
    id: 'crystalTnt',
    kind: 'prestige',
    subfeature: 0,
    cap: 25,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 135 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(10, lvl) * buildNum(6, 'Qa') }),
    effect: [{ name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(0.5, lvl) }],
  },
  {
    id: 'crystalBeacon',
    kind: 'prestige',
    subfeature: 0,
    cap: 4,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 150 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(buildNum(1, 'M'), lvl) * buildNum(1, 'Sx') }),
    effect: [
      { name: 'miningBeaconPiercing', type: 'base', value: (lvl) => (lvl >= 1 ? 1 : null) },
      { name: 'miningBeaconRich', type: 'base', value: (lvl) => (lvl >= 2 ? 1 : null) },
      { name: 'miningBeaconWonder', type: 'base', value: (lvl) => (lvl >= 3 ? 1 : null) },
      { name: 'miningBeaconHope', type: 'base', value: (lvl) => (lvl >= 4 ? 1 : null) },
    ],
  },
  {
    id: 'crystalNiter',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 165 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(lvl * 0.02 + 1.4, lvl) * buildNum(3, 'Sx') }),
    effect: [{ name: 'currencyMiningNiterGain', type: 'mult', value: (lvl) => lvl * 0.05 + 1 }],
  },
  {
    id: 'crystalBunker',
    kind: 'prestige',
    subfeature: 0,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 180 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(4.5, lvl) * buildNum(65, 'Sx') }),
    effect: [
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => Math.pow(1.2, lvl) * (lvl * 0.4 + 1),
      },
      { name: 'miningOreCap', type: 'mult', value: (lvl) => lvl * 0.2 + 1 },
    ],
  },
  {
    id: 'crystalOreBag',
    kind: 'prestige',
    subfeature: 0,
    cap: 40,
    requirement: { type: 'dwellerCap', subfeature: 0, value: 200 },
    price: (lvl) => ({ mining_crystalGreen: Math.pow(1.2, lvl) * buildNum(1, 'Sp') }),
    effect: [{ name: 'miningOreCap', type: 'base', value: (lvl) => lvl }],
  },

  /* ── 黄水晶线（子模式 1） ── */

  {
    id: 'crystalSpikes',
    kind: 'prestige',
    subfeature: 1,
    requirement: { type: 'unlockSeen', key: 'miningGasSubfeature' },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.025 + 1.3, lvl) * 5 }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.05, lvl) * (lvl * 0.15 + 1) },
    ],
  },
  {
    id: 'crystalBooster',
    kind: 'prestige',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'unlockSeen', key: 'miningGasSubfeature' },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.75, lvl) * 8 }),
    effect: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: (lvl) => lvl * 0.125 + 1 }],
  },
  {
    id: 'heliumReserves',
    kind: 'prestige',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 4 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.5 + 2, lvl) * 100 }),
    effect: [
      { name: 'currencyMiningHeliumIncrement', type: 'base', value: (lvl) => lvl * 0.01 },
    ],
  },
  {
    id: 'crystalSmoke',
    kind: 'prestige',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 8 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.65, lvl) * 250 }),
    effect: [
      { name: 'currencyMiningSmokeGain', type: 'mult', value: (lvl) => Math.pow(1.2, lvl) },
      { name: 'currencyMiningSmokeCap', type: 'mult', value: (lvl) => Math.pow(1.3, lvl) },
    ],
  },
  {
    id: 'crystalConductor',
    kind: 'prestige',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 12 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.02 + 1.5, lvl) * 1000 }),
    effect: [{ name: 'miningDepthDwellerMax', type: 'base', value: (lvl) => lvl * 0.005 }],
  },
  {
    id: 'crystalFusion',
    kind: 'prestige',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 16 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.75, lvl) * 2300 }),
    effect: [
      { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) },
      { name: 'currencyMiningCrystalYellowGain', type: 'mult', value: (lvl) => Math.pow(1.3, lvl) },
    ],
  },
  {
    id: 'neonReserves',
    kind: 'prestige',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 20 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.5 + 2, lvl) * 7000 }),
    effect: [{ name: 'currencyMiningNeonIncrement', type: 'base', value: (lvl) => lvl * 0.005 }],
  },
  {
    id: 'crystalRefuge',
    kind: 'prestige',
    subfeature: 1,
    cap: 2,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 24 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(20, lvl) * buildNum(25, 'K') }),
    effect: [
      { name: 'mining_piston', type: 'keepUpgrade', value: (lvl) => lvl >= 1 },
      { name: 'mining_harvester', type: 'keepUpgrade', value: (lvl) => lvl >= 2 },
    ],
  },
  {
    id: 'crystalCave',
    kind: 'prestige',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 28 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.65, lvl) * buildNum(75, 'K') }),
    effect: [
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.15 + 1),
      },
      { name: 'miningOreCap', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
    ],
  },
  {
    id: 'crystalFilter',
    kind: 'prestige',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 32 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.5, lvl) * buildNum(450, 'K') }),
    effect: [{ name: 'miningRareEarthGain', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) }],
  },
  {
    id: 'heliumWarehouse',
    kind: 'prestige',
    subfeature: 1,
    cap: 5,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 40 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(10 * Math.pow(2, lvl), lvl) * buildNum(1.8, 'M') }),
    effect: [{ name: 'currencyMiningHeliumLimit', type: 'mult', value: (lvl) => Math.pow(2, lvl) }],
  },
  {
    id: 'crystalTunnel',
    kind: 'prestige',
    subfeature: 1,
    cap: 25,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 48 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.05 + 1.5, lvl) * buildNum(8, 'M') }),
    effect: [
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => Math.pow(1.2, lvl) * (lvl * 0.3 + 1),
      },
    ],
  },
  {
    id: 'argonReserves',
    kind: 'prestige',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 56 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.5 + 2, lvl) * buildNum(30, 'M') }),
    effect: [{ name: 'currencyMiningArgonIncrement', type: 'base', value: (lvl) => lvl * 0.003 }],
  },
  {
    id: 'crystalDust',
    kind: 'prestige',
    subfeature: 1,
    cap: 10,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 64 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.65, lvl) * buildNum(120, 'M') }),
    effect: [
      {
        name: 'currencyMiningSmokeGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.15, lvl) * (lvl * 0.35 + 1),
      },
    ],
  },
  {
    id: 'neonWarehouse',
    kind: 'prestige',
    subfeature: 1,
    cap: 5,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 72 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(10 * Math.pow(2, lvl), lvl) * buildNum(750, 'M') }),
    effect: [
      { name: 'currencyMiningNeonLimit', type: 'mult', value: (lvl) => getSequence(1, lvl) + 1 },
      { name: 'currencyMiningNeonIncrement', type: 'base', value: (lvl) => lvl * 0.002 },
    ],
  },
  {
    id: 'crystalBombs',
    kind: 'prestige',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 80 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.65, lvl) * buildNum(3.3, 'B') }),
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => Math.pow(1.05, lvl) * (lvl * 0.1 + 1) },
    ],
  },
  {
    id: 'crystalCollector',
    kind: 'prestige',
    subfeature: 1,
    cap: 20,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 96 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(1.65, lvl) * buildNum(66, 'B') }),
    effect: [
      {
        name: 'currencyMiningScrapGain',
        type: 'mult',
        value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.1 + 1),
      },
    ],
  },
  {
    id: 'kryptonReserves',
    kind: 'prestige',
    subfeature: 1,
    cap: 8,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 112 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(lvl * 0.5 + 2, lvl) * buildNum(1.3, 'T') }),
    effect: [{ name: 'currencyMiningKryptonIncrement', type: 'base', value: (lvl) => lvl * 0.002 }],
  },
  {
    id: 'crystalResort',
    kind: 'prestige',
    subfeature: 1,
    cap: 2,
    requirement: { type: 'dwellerCap', subfeature: 1, value: 120 },
    price: (lvl) => ({ mining_crystalYellow: Math.pow(4000, lvl) * buildNum(6, 'T') }),
    effect: [
      { name: 'mining_enrichedCrystal', type: 'keepUpgrade', value: (lvl) => lvl >= 1 },
      { name: 'mining_smoker', type: 'keepUpgrade', value: (lvl) => lvl >= 2 },
    ],
  },
]

/* ── 汇总索引 ── */

export const ALL_MINING_UPGRADES: MiningUpgradeDef[] = [
  ...MINING_UPGRADES,
  ...MINING_GAS_UPGRADES,
  ...MINING_PRESTIGE_UPGRADES,
]

const UPGRADE_BY_ID = new Map(ALL_MINING_UPGRADES.map((u) => [u.id, u]))

export function miningUpgradeOf(id: string): MiningUpgradeDef {
  const def = UPGRADE_BY_ID.get(id)
  if (def === undefined) throw new Error(`未知采矿升级：${id}`)
  return def
}
