import {
  MINING_CURRENCIES,
  MINING_ORES,
  type MiningBarId,
  type MiningOreId,
  type MiningRareEarthId,
  type SmelteryId,
} from '../data/mining'
import {
  MINING_GAS_UPGRADES,
  MINING_PRESTIGE_UPGRADES,
  MINING_UPGRADES,
} from '../data/miningUpgrades'
import type { GameState } from '../state/gameState'
import {
  addIngredient,
  addToSmeltery,
  buyPremiumUpgrade,
  buyUpgrade,
  canBuyUpgrade,
  craftPickaxe,
  enhance,
  enhancementBlock,
  isUpgradeVisible,
  isRelicUnlocked,
  miningPrestige,
  relicActiveReward,
  useRelicActive,
  placeBeacon,
  removeBeacon,
  removeIngredient,
  resetEnhancement,
  setEnhancementIngredient,
  toggleEnhancements,
  buyPremiumMax,
  buyUpgradeMax,
  premiumMaxCount,
  upgradeBlock,
  upgradeCapOf,
  upgradeLevelOf,
  upgradeMaxCount,
  type BuyBlock,
  type MiningPrestigeResult,
  type Rng,
} from './mining/actions'
import { activateCards, openPack, toggleCardSelected, unequipCards } from './mining/cards'
import {
  beaconOwned,
  currencyCap,
  currencyValue,
  currentDamage,
  currentDepthBeacon,
  currentDurability,
  currentOre,
  currentScrap,
  currentToughness,
  depthHitsNeeded,
  depthOre,
  depthToughness,
  dwellerGreenCrystal,
  dwellerYellowCrystal,
  dwellerLimit,
  dwellerStats,
  durabilityProgress,
  graniteBreaksMult,
  hitsNeeded,
  miningDamage as rawMiningDamage,
  rareDropFinal,
  rareDrops,
  smelteryTimeNeeded,
  timeUntilNext,
  pickaxeCanAfford,
  pickaxeStats,
  pickaxeUpgradeChance,
  craftingSlots,
  enhancementBarsNeeded,
  enhancementMax,
  currentBreaks,
  currentSubfeature,
  depthGasLimit,
  currentGas,
} from './mining/core'
import { rebuildMults, isUnlocked } from './mining/effects'
import { accumulateMining, setDepth } from './mining/tick'

/**
 * 采矿机制门面 —— 对外暴露 `GameState` 级别的 API，内部委托给
 * `core/mechanics/mining/*` 子模块（1:1 复刻 Gooboo）。
 */

export type MiningUpgradeId = string
export type MiningPrestigeId = string
export type GasUpgradeId = string

/** 单次 tick 允许推进的最大时长（毫秒），用于离线结算以防卡死。 */
export const MAX_MINING_TICK_MS = 60_000

export { MINING_UPGRADES, MINING_GAS_UPGRADES, MINING_PRESTIGE_UPGRADES }
export { MINING_ORES }
export type { BuyBlock, MiningPrestigeResult, Rng }

/* ── 状态初始化 ── */

/** 载入存档后重建派生数据（乘区表）。 */
export function initMining(state: GameState): void {
  rebuildMults(state.mining)
}

/** 兜底：层耐久为 0 时用满耐久填充（新档/迁移后调用一次）。 */
export function ensureDurability(state: GameState): void {
  const m = state.mining
  if (!(m.durability > 0)) {
    m.durability = currentDurability(m)
  }
}

/* ── 派生数值 ── */

export function miningDamage(state: GameState): number {
  return rawMiningDamage(state.mining)
}

export function miningToughness(state: GameState): number {
  return currentToughness(state.mining)
}

/** 有效伤害（已扣除硬度），为 0 表示当前层无法推进。 */
export function miningEffectiveDamage(state: GameState): number {
  return currentDamage(state.mining)
}

export function miningWallProgress(state: GameState): number {
  return durabilityProgress(state.mining)
}

export function miningHitsNeeded(state: GameState): number {
  return hitsNeeded(state.mining)
}

export function miningDepthHitsNeeded(state: GameState, depth: number): number {
  return depthHitsNeeded(state.mining, depth)
}

export function scrapCap(state: GameState): number {
  return currencyCap(state.mining, 'scrap')
}

export function oreCap(state: GameState, id: string): number {
  return currencyCap(state.mining, id)
}

export function heliumCap(state: GameState): number {
  return depthGasLimit(state.mining, state.mining.maxDepth1, 'helium')
}

export function currencyOf(state: GameState, id: string): number {
  return currencyValue(state.mining, id)
}

export function miningScrapPerSecond(state: GameState): number {
  return currentScrap(state.mining)
}

export function miningOrePerSecond(state: GameState, id: MiningOreId): number {
  const ore = currentOre(state.mining)[id]
  return ore === undefined ? 0 : ore.amount
}

export function miningRareEarthPerSecond(state: GameState, id: MiningRareEarthId): number {
  const drop = rareDrops(state.mining)[id]
  return drop === undefined ? 0 : drop
}

export function miningBreaksAtLayer(state: GameState): number {
  return currentBreaks(state.mining)
}

export function miningDwellerLimit(state: GameState): number {
  return dwellerLimit(state.mining)
}

export function miningDwellerStats(state: GameState): { cap: number; bonus: number } {
  return dwellerStats(state.mining, currentSubfeature(state.mining))
}

export function miningTimeUntilNext(state: GameState, amount: number): number | null {
  return timeUntilNext(state.mining, amount)
}

export function miningSmelteryTimeNeeded(state: GameState, id: SmelteryId): number {
  return smelteryTimeNeeded(state.mining, id)
}

export function miningActiveBeacon(state: GameState): string | null {
  return currentDepthBeacon(state.mining)
}

export function miningBeaconOwned(state: GameState, id: 'piercing' | 'rich' | 'wonder' | 'hope'): number {
  return beaconOwned(state.mining, id)
}

export function miningRareDropFinal(state: GameState, id: MiningRareEarthId): number {
  return rareDropFinal(state.mining, id)
}

export function miningGraniteBreaksMult(state: GameState): number {
  return graniteBreaksMult(state.mining)
}

export function miningDepthOre(state: GameState, depth: number): Record<string, { amount: number; baseAmount: number; natural: boolean }> {
  return depthOre(state.mining, depth)
}

export function miningOreCollectible(state: GameState, ore: (typeof MINING_ORES)[number]): boolean {
  return Object.keys(depthOre(state.mining, state.mining.depth)).includes(ore.id)
}

export function miningDepthToughness(state: GameState, depth: number): number {
  return depthToughness(state.mining, depth)
}

export function miningGasPreview(state: GameState): Record<string, number> {
  return currentGas(state.mining) as Record<string, number>
}

export function miningIsUnlocked(state: GameState, key: string, requireUse = false): boolean {
  return isUnlocked(state.mining, key, requireUse)
}

/** 当前镐子威力。 */
export function miningPickaxePower(state: GameState): number {
  return state.mining.pickaxePower
}

/** 当前层的稀有掉落表（id → 每秒/每击碎量）。 */
export function miningRareDrops(state: GameState): Partial<Record<MiningRareEarthId, number>> {
  return rareDrops(state.mining)
}

/** 某条熔炼产线的待产出数量。 */
export function miningSmelteryStored(state: GameState, id: SmelteryId): number {
  return state.mining.smeltery[id]?.stored ?? 0
}

/** 某条熔炼产线已完成的生产进度（0~1）。 */
export function miningSmelteryProgress(state: GameState, id: SmelteryId): number {
  return state.mining.smeltery[id]?.progress ?? 0
}

/** 某种锭的增强等级。 */
export function miningEnhancementLevel(state: GameState, id: string): number {
  return state.mining.enhancement[id] ?? 0
}

/** 完整的货币列表（供 UI 一览展示）。 */
export function miningCurrencyList(
  state: GameState,
): Array<{ id: string; value: number; cap: number }> {
  const ids = new Set<string>(Object.keys(state.mining.currency))
  for (const def of MINING_CURRENCIES) {
    ids.add(def.id)
  }
  return [...ids].map((id) => ({
    id,
    value: currencyValue(state.mining, id),
    cap: currencyCap(state.mining, id),
  }))
}

/* ── 升级 ── */

export function upgradeLevel(state: GameState, id: MiningUpgradeId): number {
  return upgradeLevelOf(state.mining, id)
}

export function prestigeLevel(state: GameState, id: MiningPrestigeId): number {
  return upgradeLevelOf(state.mining, id)
}

export function gasUpgradeLevel(state: GameState, id: GasUpgradeId): number {
  return upgradeLevelOf(state.mining, id)
}

export function miningUpgradeUnlocked(state: GameState, id: MiningUpgradeId): boolean {
  const def = [...MINING_UPGRADES, ...MINING_GAS_UPGRADES, ...MINING_PRESTIGE_UPGRADES].find(
    (u) => u.id === id,
  )
  if (def === undefined) {
    return false
  }
  return isUpgradeVisible(state.mining, def)
}

export function miningUpgradeCap(state: GameState, id: MiningUpgradeId): number {
  return upgradeCapOf(state.mining, id)
}

export function miningUpgradeBlock(state: GameState, id: MiningUpgradeId): BuyBlock | null {
  return upgradeBlock(state.mining, id)
}

export function canBuyMiningUpgrade(state: GameState, id: MiningUpgradeId): boolean {
  return canBuyUpgrade(state.mining, id)
}

export function buyMiningUpgrade(state: GameState, id: MiningUpgradeId): boolean {
  return buyUpgrade(state.mining, id)
}

export function canBuyGasUpgrade(state: GameState, id: GasUpgradeId): boolean {
  return canBuyUpgrade(state.mining, id)
}

export function buyGasUpgrade(state: GameState, id: GasUpgradeId): boolean {
  return buyUpgrade(state.mining, id)
}

export function canBuyMiningPrestige(state: GameState, id: MiningPrestigeId): boolean {
  return canBuyUpgrade(state.mining, id)
}

export function buyMiningPrestige(state: GameState, id: MiningPrestigeId): boolean {
  return buyUpgrade(state.mining, id)
}

/** 某升级当前最多还能连续购买多少级（普通/气态/声望通用）。 */
export function miningUpgradeMaxCount(state: GameState, id: MiningUpgradeId): number {
  return upgradeMaxCount(state.mining, id)
}

/** 连续购买某升级直到买不起 / 满级；返回实际购买次数。 */
export function buyMiningUpgradeMax(state: GameState, id: MiningUpgradeId): number {
  return buyUpgradeMax(state.mining, id)
}

/** 连续购买某气态升级直到买不起 / 满级；返回实际购买次数。 */
export function buyGasUpgradeMax(state: GameState, id: GasUpgradeId): number {
  return buyUpgradeMax(state.mining, id)
}

/** 连续购买某声望升级直到买不起 / 满级；返回实际购买次数。 */
export function buyMiningPrestigeMax(state: GameState, id: MiningPrestigeId): number {
  return buyUpgradeMax(state.mining, id)
}

/* ── 镐子锻造 ── */

export function miningCraftingSlots(state: GameState): number {
  return craftingSlots(state.mining)
}

export function miningPickaxeStats(state: GameState) {
  return pickaxeStats(state.mining)
}

export function miningPickaxeChance(state: GameState): number {
  return pickaxeUpgradeChance(state.mining)
}

export function miningPickaxeCanAfford(state: GameState): boolean {
  return pickaxeCanAfford(state.mining)
}

export function miningAddIngredient(state: GameState, ore: MiningOreId): boolean {
  return addIngredient(state.mining, ore)
}

export function miningRemoveIngredient(state: GameState, index: number): boolean {
  return removeIngredient(state.mining, index)
}

export function miningClearIngredients(state: GameState): void {
  state.mining.ingredientList = []
}

export function miningCraftPickaxe(state: GameState, rng?: Rng) {
  return craftPickaxe(state.mining, rng)
}

/* ── 熔炼 ── */

export function fillFurnace(state: GameState, barId: MiningBarId): boolean {
  const line = Object.keys(state.mining.smeltery).find(
    (key) => MINING_SMELTERY_OUTPUT[key] === barId,
  )
  if (line === undefined) {
    return false
  }
  return addToSmeltery(state.mining, line as SmelteryId, true) > 0
}

export function miningAddToSmeltery(state: GameState, id: SmelteryId, max = false): number {
  return addToSmeltery(state.mining, id, max)
}

const MINING_SMELTERY_OUTPUT: Record<string, string> = {
  aluminium: 'barAluminium',
  bronze: 'barBronze',
  steel: 'barSteel',
  titanium: 'barTitanium',
  shiny: 'barShiny',
  iridium: 'barIridium',
  darkIron: 'barDarkIron',
}

/* ── 锭增强 ── */

export function canEnhancePickaxe(state: GameState): boolean {
  return enhancementBlock(state.mining) === 'none'
}

export function enhancePickaxe(state: GameState): boolean {
  return enhance(state.mining)
}

export function miningEnhanceBlock(state: GameState): string {
  return enhancementBlock(state.mining)
}

export function miningSetEnhancementIngredient(state: GameState, id: string | null): void {
  setEnhancementIngredient(state.mining, id)
}

export function miningToggleEnhancements(state: GameState): void {
  toggleEnhancements(state.mining)
}

export function miningResetEnhancement(state: GameState, id: string): void {
  resetEnhancement(state.mining, id)
}

export function miningEnhancementBarsNeeded(state: GameState): number {
  return enhancementBarsNeeded(state.mining)
}

export function miningEnhancementMax(state: GameState): number {
  return enhancementMax(state.mining)
}

/* ── 信标 ── */

export function miningPlaceBeacon(
  state: GameState,
  depth: number,
  beacon: 'piercing' | 'rich' | 'wonder' | 'hope',
): boolean {
  return placeBeacon(state.mining, depth, beacon)
}

export function miningRemoveBeacon(state: GameState, depth: number): boolean {
  return removeBeacon(state.mining, depth)
}

/* ── 深度导航 ── */

export function miningSetDepth(state: GameState, depth: number): boolean {
  return setDepth(state.mining, depth)
}

/** 购买 Premium 升级（消耗 ruby）。 */
export function miningBuyPremium(state: GameState, id: string): boolean {
  return buyPremiumUpgrade(state.mining, id)
}

/** 某 Premium 升级当前最多还能连续购买多少级。 */
export function miningPremiumMaxCount(state: GameState, id: string): number {
  return premiumMaxCount(state.mining, id)
}

/** 连续购买某 Premium 升级直到买不起 / 满级；返回实际购买次数。 */
export function miningBuyPremiumMax(state: GameState, id: string): number {
  return buyPremiumMax(state.mining, id)
}

/** 使用遗物主动技能（消耗 relic_power）。 */
export function miningUseRelicActive(
  state: GameState,
  id: string,
): { ok: boolean; gain: number } {
  return useRelicActive(state.mining, id)
}

/** 遗物主动技能收益预览。 */
export function miningRelicReward(state: GameState, id: string): number {
  return relicActiveReward(state.mining, id)
}

/** 遗物是否已解锁。 */
export function miningRelicUnlocked(state: GameState, id: string): boolean {
  return isRelicUnlocked(state.mining, id as never)
}

/** 开卡包（消耗 emerald）。 */
export function miningOpenPack(state: GameState, packId: string): { ok: boolean; cards: number[] } {
  return openPack(state.mining, packId)
}

/** 切换某卡是否装备。 */
export function miningToggleCard(state: GameState, id: number): void {
  toggleCardSelected(state.mining, id)
}

/** 提交卡组装备。 */
export function miningActivateCards(state: GameState): void {
  activateCards(state.mining)
}

/** 卸下全部装备卡。 */
export function miningUnequipCards(state: GameState): void {
  unequipCards(state.mining)
}

/** 设置自动下潜阈值（秒）；0 表示关闭，需手动导航。 */
export function miningSetAutoProgress(state: GameState, seconds: number): void {
  state.mining.autoProgress = Math.max(0, Math.floor(seconds))
}

/** 开启/关闭自动升级（本项目扩展，Gooboo 无此功能）。 */
export function miningSetAutoBuyUpgrades(state: GameState, on: boolean): void {
  state.mining.autoBuyUpgrades = on
  state.mining.autoBuyAccumulator = 0
}

/* ── 主循环 ── */

/**
 * 推进采矿 `dtMs` 毫秒。离线补算时由调用方按 `MAX_MINING_TICK_MS` 分片传入。
 * `now` 参数保留仅为兼容调用点，本实现不使用。
 */
export function tickMining(state: GameState, dtMs: number, _now = 0): void {
  void _now
  ensureDurability(state)
  accumulateMining(state.mining, dtMs)
}

/* ── 转生 ── */

/** 当前可领取的水晶数量（深度居民兑换量）。 */
export function miningPrestigePreview(state: GameState): number {
  return currentSubfeature(state.mining) === 0
    ? dwellerGreenCrystal(state.mining)
    : dwellerYellowCrystal(state.mining)
}

/** 执行采矿转生，返回所得水晶与余烬。 */
export function doMiningPrestige(state: GameState, subfeature: 0 | 1 = 0): MiningPrestigeResult {
  return miningPrestige(state.mining, subfeature)
}

/** 兼容旧调用：整体重置采矿进度（不发放水晶）。 */
export function resetMiningOnPrestige(state: GameState): void {
  miningPrestige(state.mining, state.mining.subfeature)
}

/* ── 子包直出（按需从 `core/mechanics/mining/*` 直接引用，此处只少量再导出） ── */

export { accumulateMining, setDepth, tickMiningSeconds } from './mining/tick'
export { rebuildMults, isUnlocked, setUnlock, applyCurrencyMults } from './mining/effects'
export {
  isPremiumVisible,
  premiumBlock,
  premiumLevelOf,
  type PremiumBlock,
} from './mining/actions'
export {
  activateCards,
  cardCap,
  cardPower,
  cardsCollected,
  openPack,
  toggleCardSelected,
  unequipCards,
} from './mining/cards'
export { createMults, multGet, multSet, type MultMap, type MultItem } from './mining/mults'
