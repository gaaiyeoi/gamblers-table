/**
 * 采矿卡牌（1:1 移植 `js/modules/mining/cardList.js` + `card.js`）。
 *
 * 说明：
 * - 视觉用的 `icons`（mdi 图标 + 坐标）对本项目无玩法影响，已省略。
 * - 卡包价格用 `gem_emerald`（Gooboo 中来自村庄/画廊系统，本项目无这些系统，
 *   故在转生时按深度居民产出 emerald，见 `miningPrestige`）。
 * - collection / feature 奖励中属于 village / horde / gallery 的部分已剔除（无对应系统）。
 */

import type { MiningEffectType } from './miningUpgrades'

/** 单张卡的效果：固定数值，装配 N 张时按 Gooboo 规则展开。 */
export interface MiningCardEffect {
  /** 乘区名（如 `miningDamage`）。 */
  name: string
  type: MiningEffectType
  /** 单张数值。mult 型：>=1 线性叠、<1 幂叠；base/bonus 型：× 张数。 */
  value: number
}

export type MiningCollectionId =
  | 'minersAndEquipment'
  | 'scrapLogistics'
  | 'caveLocations'
  | 'dangersInTheDark'
  | 'versatile'
  | 'forgottenPlants'
  | 'abstractShapes'
  | 'specialGadgets'

export interface MiningCardDef {
  id: number
  collection: MiningCollectionId
  power: number | 'adaptive'
  color: string
  reward?: MiningCardEffect[]
}

/** 59 张卡（id 升序；省略 icons）。 */
export const MINING_CARDS: readonly MiningCardDef[] = [
  { id: 1, collection: 'minersAndEquipment', power: 3, color: 'amber' },
  { id: 2, collection: 'minersAndEquipment', power: 2, color: 'brown', reward: [{ name: 'miningPickaxeCraftingQuality', type: 'mult', value: 1.5 }] },
  { id: 3, collection: 'minersAndEquipment', power: 2, color: 'pale-blue', reward: [{ name: 'miningPickaxeCraftingSlots', type: 'base', value: 1 }] },
  { id: 4, collection: 'minersAndEquipment', power: 2, color: 'orange-red', reward: [{ name: 'miningToughness', type: 'mult', value: 0.8 }] },
  { id: 5, collection: 'minersAndEquipment', power: 2, color: 'pale-green', reward: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.2 }] },
  { id: 6, collection: 'minersAndEquipment', power: 2, color: 'orange', reward: [{ name: 'miningOreGain', type: 'mult', value: 1.2 }] },
  { id: 7, collection: 'minersAndEquipment', power: 1, color: 'red', reward: [{ name: 'miningToughness', type: 'mult', value: 1 / 1.5 }] },
  { id: 8, collection: 'minersAndEquipment', power: 2, color: 'purple', reward: [{ name: 'miningDamage', type: 'mult', value: 1.15 }] },
  { id: 9, collection: 'minersAndEquipment', power: 1, color: 'teal', reward: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.35 }] },
  { id: 10, collection: 'minersAndEquipment', power: 2, color: 'pink', reward: [{ name: 'miningOreQuality', type: 'mult', value: 1.75 }] },
  { id: 11, collection: 'minersAndEquipment', power: 1, color: 'pale-red', reward: [{ name: 'miningDamage', type: 'mult', value: 1.1 }, { name: 'currencyMiningOreAluminiumGain', type: 'mult', value: 1.6 }] },
  { id: 12, collection: 'minersAndEquipment', power: 1, color: 'light-blue', reward: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.15 }, { name: 'currencyMiningOreCopperGain', type: 'mult', value: 1.6 }] },

  { id: 13, collection: 'scrapLogistics', power: 2, color: 'beige', reward: [{ name: 'currencyMiningScrapCap', type: 'mult', value: 1.4 }] },
  { id: 14, collection: 'scrapLogistics', power: 2, color: 'wooden', reward: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.12 }, { name: 'currencyMiningScrapCap', type: 'mult', value: 1.25 }] },
  { id: 15, collection: 'scrapLogistics', power: 2, color: 'green', reward: [{ name: 'currencyMiningOreAluminiumCap', type: 'base', value: 80 }, { name: 'currencyMiningOreCopperCap', type: 'base', value: 24 }] },
  { id: 16, collection: 'scrapLogistics', power: 1, color: 'pale-orange', reward: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.14 }, { name: 'currencyMiningOreAluminiumCap', type: 'mult', value: 2 }] },
  { id: 17, collection: 'scrapLogistics', power: 1, color: 'lime', reward: [{ name: 'currencyMiningScrapCap', type: 'mult', value: 1.3 }, { name: 'currencyMiningOreCopperCap', type: 'mult', value: 2 }] },
  { id: 18, collection: 'scrapLogistics', power: 2, color: 'skyblue', reward: [{ name: 'miningDamage', type: 'mult', value: 1.1 }, { name: 'currencyMiningScrapCap', type: 'mult', value: 1.2 }] },
  { id: 19, collection: 'scrapLogistics', power: 3, color: 'yellow', reward: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: 1.3 }] },
  { id: 20, collection: 'scrapLogistics', power: 3, color: 'grey', reward: [{ name: 'currencyMiningCrystalGreenGain', type: 'mult', value: 1.15 }] },
  { id: 21, collection: 'scrapLogistics', power: 2, color: 'red', reward: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: 1.2 }, { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: 1.2 }] },
  { id: 22, collection: 'scrapLogistics', power: 3, color: 'indigo', reward: [{ name: 'miningDamage', type: 'mult', value: 1.12 }] },

  { id: 23, collection: 'caveLocations', power: 3, color: 'light-blue', reward: [{ name: 'miningPickaxeCraftingQuality', type: 'mult', value: 1.25 }] },
  { id: 24, collection: 'caveLocations', power: 3, color: 'pale-green', reward: [{ name: 'miningPickaxeCraftingSlots', type: 'base', value: 1 }] },
  { id: 25, collection: 'caveLocations', power: 2, color: 'red', reward: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: 1.15 }, { name: 'currencyMiningOreTinCap', type: 'mult', value: 2 }] },
  { id: 26, collection: 'caveLocations', power: 2, color: 'yellow', reward: [{ name: 'miningPickaxeCraftingSlots', type: 'base', value: 1 }, { name: 'currencyMiningOreTinGain', type: 'mult', value: 1.6 }] },
  { id: 27, collection: 'caveLocations', power: 2, color: 'light-green', reward: [{ name: 'miningDamage', type: 'mult', value: 1.2 }, { name: 'currencyMiningScrapGain', type: 'mult', value: 1.1 }] },
  { id: 28, collection: 'caveLocations', power: 3, color: 'dark-grey', reward: [{ name: 'currencyMiningCrystalGreenGain', type: 'mult', value: 1.05 }, { name: 'currencyMiningOreIronCap', type: 'mult', value: 2 }] },
  { id: 29, collection: 'caveLocations', power: 3, color: 'light-grey', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.15 }, { name: 'currencyMiningOreIronGain', type: 'mult', value: 1.6 }] },
  { id: 30, collection: 'caveLocations', power: 3, color: 'cyan', reward: [{ name: 'miningOreGain', type: 'mult', value: 1.4 }] },
  { id: 31, collection: 'caveLocations', power: 5, color: 'dark-blue' },

  { id: 32, collection: 'dangersInTheDark', power: 4, color: 'orange', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.35 }] },
  { id: 33, collection: 'dangersInTheDark', power: 4, color: 'cherry', reward: [{ name: 'miningResinMax', type: 'base', value: 1 }, { name: 'currencyMiningOreTitaniumCap', type: 'mult', value: 2 }] },
  { id: 34, collection: 'dangersInTheDark', power: 4, color: 'pale-purple', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.1 }, { name: 'currencyMiningOreTitaniumGain', type: 'mult', value: 1.6 }] },
  { id: 35, collection: 'dangersInTheDark', power: 5, color: 'brown', reward: [{ name: 'miningResinMax', type: 'base', value: 1 }] },
  { id: 36, collection: 'dangersInTheDark', power: 4, color: 'blue-grey', reward: [{ name: 'miningDamage', type: 'mult', value: 1.25 }, { name: 'miningResinMax', type: 'base', value: 1 }] },
  { id: 37, collection: 'dangersInTheDark', power: 5, color: 'light-green', reward: [{ name: 'currencyMiningEmberGain', type: 'mult', value: 1.25 }] },
  { id: 38, collection: 'dangersInTheDark', power: 4, color: 'pale-pink', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.25 }, { name: 'currencyMiningEmberGain', type: 'base', value: 0.1 }, { name: 'miningResinMax', type: 'base', value: 1 }] },

  { id: 39, collection: 'abstractShapes', power: 5, color: 'brown', reward: [{ name: 'currencyMiningScrapCap', type: 'mult', value: 1.5 }] },
  { id: 40, collection: 'abstractShapes', power: 6, color: 'blue-grey', reward: [{ name: 'miningRareEarthGain', type: 'mult', value: 1.15 }, { name: 'currencyMiningOrePlatinumCap', type: 'mult', value: 2 }] },
  { id: 41, collection: 'abstractShapes', power: 6, color: 'lime', reward: [{ name: 'currencyMiningCrystalYellowGain', type: 'mult', value: 1.25 }] },
  { id: 42, collection: 'abstractShapes', power: 6, color: 'light-blue', reward: [{ name: 'currencyMiningHeliumGain', type: 'base', value: 0.01 }] },
  { id: 43, collection: 'abstractShapes', power: 5, color: 'deep-purple', reward: [{ name: 'miningOreCap', type: 'mult', value: 1.25 }] },
  { id: 44, collection: 'abstractShapes', power: 3, color: 'orange-red', reward: [{ name: 'currencyMiningEmberGain', type: 'base', value: 0.4 }, { name: 'currencyMiningEmberGain', type: 'mult', value: 1.2 }] },
  { id: 45, collection: 'abstractShapes', power: 6, color: 'green', reward: [{ name: 'currencyMiningLimestoneGain', type: 'mult', value: 1.6 }] },
  { id: 46, collection: 'abstractShapes', power: 6, color: 'babypink', reward: [{ name: 'currencyMiningNeonGain', type: 'base', value: 0.01 }] },

  { id: 47, collection: 'forgottenPlants', power: 7, color: 'pale-green', reward: [{ name: 'currencyMiningEmberGain', type: 'base', value: 0.2 }, { name: 'currencyMiningOreIridiumCap', type: 'mult', value: 2 }] },
  { id: 48, collection: 'forgottenPlants', power: 7, color: 'yellow', reward: [{ name: 'currencyMiningMoonshardGain', type: 'mult', value: 1.6 }] },
  { id: 49, collection: 'forgottenPlants', power: 6, color: 'wooden', reward: [{ name: 'miningRareEarthGain', type: 'mult', value: 1.4 }] },
  { id: 50, collection: 'forgottenPlants', power: 6, color: 'pale-pink', reward: [{ name: 'miningDepthDwellerSpeed', type: 'mult', value: 1.3 }] },
  { id: 51, collection: 'forgottenPlants', power: 8, color: 'beige', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.25 }, { name: 'currencyMiningOreOsmiumCap', type: 'mult', value: 2 }] },
  { id: 52, collection: 'forgottenPlants', power: 8, color: 'orange-red', reward: [{ name: 'currencyMiningPhosphorusGain', type: 'mult', value: 1.6 }] },
  { id: 53, collection: 'forgottenPlants', power: 8, color: 'indigo', reward: [{ name: 'currencyMiningArgonGain', type: 'base', value: 0.01 }] },
  { id: 54, collection: 'forgottenPlants', power: 10, color: 'green' },

  { id: 55, collection: 'versatile', power: 6, color: 'teal', reward: [{ name: 'miningOreGain', type: 'mult', value: 1.25 }, { name: 'miningRareEarthGain', type: 'mult', value: 1.25 }] },
  { id: 56, collection: 'versatile', power: 6, color: 'babypink', reward: [{ name: 'currencyMiningCrystalGreenGain', type: 'mult', value: 1.15 }, { name: 'currencyMiningEmberGain', type: 'mult', value: 1.15 }] },
  { id: 57, collection: 'versatile', power: 7, color: 'orange-red', reward: [{ name: 'miningSmelteryTime', type: 'mult', value: 1 / 1.3 }, { name: 'miningDepthDwellerSpeed', type: 'mult', value: 1.2 }] },
  { id: 58, collection: 'versatile', power: 5, color: 'grey', reward: [{ name: 'currencyMiningCrystalYellowGain', type: 'mult', value: 1.15 }, { name: 'miningGasGain', type: 'base', value: 0.004 }] },

  { id: 59, collection: 'specialGadgets', power: 'adaptive', color: 'cherry', reward: [{ name: 'miningToughness', type: 'mult', value: 1000 }] },
]

const CARD_MAP: Record<number, MiningCardDef> = {}
for (const c of MINING_CARDS) {
  CARD_MAP[c.id] = c
}
export function miningCardOf(id: number): MiningCardDef {
  const c = CARD_MAP[id]
  if (c === undefined) {
    throw new Error(`unknown mining card id: ${id}`)
  }
  return c
}

/** 收藏集：只保留 mining 相关奖励。 */
export const MINING_CARD_COLLECTIONS: Record<string, { reward: MiningCardEffect[] }> = {
  minersAndEquipment: { reward: [{ name: 'miningDamage', type: 'mult', value: 1.35 }] },
  scrapLogistics: { reward: [{ name: 'miningCardCap', type: 'base', value: 1 }, { name: 'currencyMiningScrapCap', type: 'mult', value: 2 }] },
  caveLocations: { reward: [] },
  dangersInTheDark: { reward: [{ name: 'miningCardCap', type: 'base', value: 1 }] },
  versatile: { reward: [{ name: 'miningResinMax', type: 'base', value: 1 }] },
  forgottenPlants: { reward: [] },
  abstractShapes: { reward: [] },
  specialGadgets: { reward: [] },
}

/** 卡包：`MI-00xx` 为卡的权重（加权随机）。价格用 emerald。 */
export interface MiningCardPack {
  amount: number
  price: number
  unlock?: string
  /** 卡 id → 权重。 */
  content: Record<number, number>
}

export const MINING_CARD_PACKS: Record<string, MiningCardPack> = {
  intoDarkness: {
    amount: 3, price: 15,
    content: { 1: 2.75, 2: 0.3, 3: 0.58, 4: 1.1, 5: 1.22, 6: 0.9, 7: 0.65, 8: 1.11, 9: 1.56, 10: 0.28, 11: 0.73, 12: 0.86, 13: 1.05, 14: 1.45, 15: 0.49, 16: 0.55, 17: 0.52, 18: 1.16, 23: 0.18, 24: 0.05 },
  },
  drillsAndDepths: {
    amount: 4, price: 35, unlock: 'miningDepthDweller',
    content: { 1: 1.8, 2: 0.4, 3: 0.65, 4: 1.1, 5: 1.22, 6: 0.9, 13: 1.05, 14: 1.45, 15: 0.69, 16: 0.55, 17: 0.52, 18: 1.16, 19: 1.55, 20: 2.3, 21: 1.91, 22: 2.12, 23: 0.36, 24: 0.12, 25: 0.46, 26: 0.62, 27: 1.35 },
  },
  hotStuff: {
    amount: 5, price: 70, unlock: 'miningSmeltery',
    content: { 7: 1.3, 8: 1.77, 9: 1.56, 10: 0.28, 11: 0.58, 12: 0.51, 23: 0.72, 24: 0.24, 25: 0.46, 26: 0.62, 27: 1.35, 28: 0.8, 29: 0.66, 30: 2.8, 31: 1.35, 32: 0.5 },
  },
  dangerZone: {
    amount: 4, price: 105, unlock: 'miningResin',
    content: { 32: 1.6, 33: 1.45, 34: 1.35, 35: 2.1, 36: 1.95, 37: 3.35, 38: 2.1 },
  },
  cloudsAndSmoke: {
    amount: 6, price: 280, unlock: 'miningGasSubfeature',
    content: { 35: 1.6, 36: 2.1, 37: 1.45, 39: 1.8, 40: 0.9, 41: 1.65, 42: 1.3, 43: 1.95, 44: 1.5, 55: 1.35, 56: 1.1 },
  },
  deepHole: {
    amount: 5, price: 360, unlock: 'miningAdvancedCardPack',
    content: { 39: 1.75, 41: 1.9, 45: 1.5, 46: 1.45, 47: 1.25, 48: 1.6, 49: 1.7, 55: 0.8, 56: 0.75, 57: 1.4, 58: 1.35 },
  },
  blackDust: {
    amount: 4, price: 450, unlock: 'miningLuxuryCardPack',
    content: { 47: 0.8, 48: 1.05, 49: 1.15, 50: 1.7, 51: 1.45, 52: 2.1, 53: 1.8, 54: 0.25, 57: 0.6, 58: 0.55 },
  },
}

/** 卡组（feature）奖励：随收集数与卡力量缩放。 */
export const MINING_CARD_FEATURE = {
  reward: { name: 'miningDamage', type: 'mult', value: (lvl: number) => lvl * 0.05 + 1 },
  shinyReward: { name: 'miningPrestigeIncome', type: 'mult', value: (lvl: number) => lvl * 0.05 + 1 },
  powerReward: [
    { name: 'miningDamage', type: 'mult', value: (lvl: number) => Math.pow(1.08, lvl) },
    { name: 'miningPrestigeIncome', type: 'mult', value: (lvl: number) => Math.pow(1.02, lvl) },
  ],
}
