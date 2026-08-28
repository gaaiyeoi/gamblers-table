/**
 * 采矿 Premium 升级（1:1 移植 `js/modules/mining/upgradePremium.js`，21 条）。
 *
 * 货币：`gem_ruby`（红宝石）。
 * Gooboo 中通过真实货币购得；本项目改为**转生时按绿水晶产量的 10% 产出 ruby**
 * （每次转生获得 crystalGreen 时同步产出 `floor(crystal * 0.1)`，最少 1）。
 *
 * Premium 升级**跨转生保留**，存储在 `MiningState.premiumUpgrades`。
 */

import { fallbackArray, getSequence } from '../math'

/** Premium 升级效果条目。 */
export interface PremiumEffect {
  name: string
  type: 'mult' | 'base'
  value: (lvl: number) => number
}

export interface MiningPremiumUpgradeDef {
  id: string
  cap?: number
  /** 是否属于 "premiumOre" 子类（矿石翻倍，cap 由 `miningPremiumOreCap` 控制）。 */
  premiumOre?: boolean
  price: (lvl: number) => Record<string, number>
  /** 可见条件：`{type:'depth', value}` 或 `{type:'unlock', key}`。 */
  requirement?: { type: 'depth'; value: number; subfeature?: 0 | 1 } | { type: 'unlock'; key: string }
  effect: PremiumEffect[]
}

/** ruby 价格辅助：Gooboo 的 `[2,3][lvl%2] * 2^(lvl/2) * base` 模式。 */
function rubyAlt(lvl: number, base: number): number {
  return [2, 3][lvl % 2] * Math.pow(2, Math.floor(lvl / 2)) * base
}

/** ruby 价格辅助（前两级固定值，之后走 rubyAlt）。 */
function rubyFixed2(lvl: number, v0: number, v1: number, base: number): number {
  return fallbackArray([v0, v1], rubyAlt(lvl, base), lvl)
}

/** 是否应读取 `maxDepth1` 的升级（气态子模式专属）。 */
function isGasSubUpgrade(id: string): boolean {
  return id === 'moreNeon' || id === 'moreArgon' || id === 'moreKrypton'
}

export const MINING_PREMIUM_UPGRADES: readonly MiningPremiumUpgradeDef[] = [
  // ── 通用强化 ────────────────────────────────────────────────────────────
  {
    id: 'moreDamage',
    price: (lvl) => ({ gem_ruby: rubyFixed2(lvl, 15, 80, 75) }),
    effect: [
      {
        name: 'miningDamage',
        type: 'mult',
        value: (lvl) => fallbackArray([1, 1.25, 1.5], getSequence(3, lvl - 2) * 0.25 + 1, lvl),
      },
    ],
  },
  {
    id: 'moreScrap',
    price: (lvl) => ({ gem_ruby: rubyFixed2(lvl, 10, 40, 75) }),
    effect: [
      {
        name: 'currencyMiningScrapGain',
        type: 'mult',
        value: (lvl) => fallbackArray([1, 1.25, 1.5], getSequence(1, lvl - 2) + 1, lvl),
      },
      {
        name: 'currencyMiningScrapCap',
        type: 'mult',
        value: (lvl) => fallbackArray([1, 1.25, 1.5], getSequence(1, lvl - 2) + 1, lvl),
      },
    ],
  },
  {
    id: 'moreGreenCrystal',
    requirement: { type: 'unlock', key: 'miningDepthDweller' },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 75) }),
    effect: [
      { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: (lvl) => lvl * 0.25 + 1 },
    ],
  },
  {
    id: 'moreRareEarth',
    requirement: { type: 'depth', value: 50 },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 120) }),
    effect: [
      { name: 'miningRareEarthGain', type: 'mult', value: (lvl) => getSequence(3, lvl) * 0.05 + 1 },
    ],
  },
  {
    id: 'fasterSmeltery',
    requirement: { type: 'unlock', key: 'miningSmeltery' },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 100) }),
    effect: [{ name: 'miningSmelteryTime', type: 'mult', value: (lvl) => 1 / (lvl + 1) }],
  },
  {
    id: 'moreResin',
    requirement: { type: 'unlock', key: 'miningResin' },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 150) }),
    effect: [
      { name: 'currencyMiningResinGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'currencyMiningResinCap', type: 'base', value: (lvl) => lvl },
    ],
  },
  {
    id: 'premiumCraftingSlots',
    requirement: { type: 'unlock', key: 'miningPickaxeCrafting' },
    price: (lvl) => ({ gem_ruby: Math.pow(2, lvl) * 30 }),
    effect: [
      { name: 'miningPickaxePremiumCraftingSlots', type: 'base', value: (lvl) => lvl },
    ],
  },

  // ── 矿石翻倍（cap 1，受 miningPremiumOreCap 解锁后 cap 提升）────────────
  { id: 'moreAluminium', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 15 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 300 }), effect: [{ name: 'currencyMiningOreAluminiumGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreCopper', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 30 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 450 }), effect: [{ name: 'currencyMiningOreCopperGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreCopperCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreTin', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 50 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 600 }), effect: [{ name: 'currencyMiningOreTinGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreTinCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreIron', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 80 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 900 }), effect: [{ name: 'currencyMiningOreIronGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreIronCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreTitanium', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 120 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 1200 }), effect: [{ name: 'currencyMiningOreTitaniumGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'morePlatinum', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 175 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 1800 }), effect: [{ name: 'currencyMiningOrePlatinumGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreIridium', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 260 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 2500 }), effect: [{ name: 'currencyMiningOreIridiumGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreIridiumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreOsmium', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 350 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 3500 }), effect: [{ name: 'currencyMiningOreOsmiumGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreOsmiumCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },
  { id: 'moreLead', cap: 1, premiumOre: true, requirement: { type: 'depth', value: 450 }, price: (lvl) => ({ gem_ruby: Math.pow(10, lvl) * 5000 }), effect: [{ name: 'currencyMiningOreLeadGain', type: 'mult', value: (lvl) => Math.pow(2, lvl) }, { name: 'currencyMiningOreLeadCap', type: 'mult', value: (lvl) => lvl * 0.25 + 1 }] },

  // ── 气态子模式 ───────────────────────────────────────────────────────────
  {
    id: 'moreHelium',
    cap: 5,
    requirement: { type: 'unlock', key: 'miningGasSubfeature' },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 300) }),
    effect: [
      { name: 'currencyMiningHeliumLimit', type: 'base', value: (lvl) => lvl * 30 },
      { name: 'currencyMiningHeliumGain', type: 'base', value: (lvl) => lvl * 0.002 },
    ],
  },
  {
    id: 'moreSmoke',
    requirement: { type: 'unlock', key: 'miningSmoke' },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 325) }),
    effect: [
      { name: 'currencyMiningSmokeGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'currencyMiningSmokeCap', type: 'mult', value: (lvl) => getSequence(1, lvl) + 1 },
    ],
  },
  {
    id: 'moreNeon',
    cap: 5,
    requirement: { type: 'depth', value: 50, subfeature: 1 },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 525) }),
    effect: [
      { name: 'currencyMiningNeonLimit', type: 'base', value: (lvl) => lvl * 30 },
      { name: 'currencyMiningNeonGain', type: 'base', value: (lvl) => lvl * 0.002 },
    ],
  },
  {
    id: 'moreArgon',
    cap: 5,
    requirement: { type: 'depth', value: 120, subfeature: 1 },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 800) }),
    effect: [
      { name: 'currencyMiningArgonLimit', type: 'base', value: (lvl) => lvl * 30 },
      { name: 'currencyMiningArgonGain', type: 'base', value: (lvl) => lvl * 0.002 },
    ],
  },
  {
    id: 'moreKrypton',
    cap: 5,
    requirement: { type: 'depth', value: 220, subfeature: 1 },
    price: (lvl) => ({ gem_ruby: rubyAlt(lvl, 1250) }),
    effect: [
      { name: 'currencyMiningKryptonLimit', type: 'base', value: (lvl) => lvl * 30 },
      { name: 'currencyMiningKryptonGain', type: 'base', value: (lvl) => lvl * 0.002 },
    ],
  },
]

const PREMIUM_MAP: Record<string, MiningPremiumUpgradeDef> = {}
for (const def of MINING_PREMIUM_UPGRADES) {
  PREMIUM_MAP[def.id] = def
}

export function miningPremiumOf(id: string): MiningPremiumUpgradeDef {
  const def = PREMIUM_MAP[id]
  if (def === undefined) {
    throw new Error(`unknown mining premium upgrade: ${id}`)
  }
  return def
}

export { isGasSubUpgrade }
