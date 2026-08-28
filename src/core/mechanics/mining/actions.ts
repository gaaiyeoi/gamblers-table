import {
  MINING_BEACONS,
  MINING_CONSTANTS,
  MINING_ENHANCEMENTS,
  MINING_ORES,
  SECONDS_PER_HOUR,
  depthBaseScrap,
  smelteryOf,
  type MiningBeaconId,
  type MiningOreId,
  type SmelteryId,
} from '../../data/mining'
import { relicOf, relicUnlocked, type MiningRelicId } from '../../data/relics'
import {
  ALL_MINING_UPGRADES,
  miningUpgradeOf,
  type MiningRequirementContext,
  type MiningUpgradeDef,
} from '../../data/miningUpgrades'
import { miningPremiumOf, type MiningPremiumUpgradeDef } from '../../data/miningPremiumUpgrades'
import { logBase } from '../../math'
import type { MiningState } from '../../state/gameState'
import {
  canAfford,
  craftingSlots,
  currencyValue,
  currentDurability,
  depthGasLimit,
  dwellerGreenCrystal,
  dwellerLimit,
  dwellerYellowCrystal,
  enhancementLevel,
  enhancementMax,
  gainCurrency,
  enhancementBarsNeeded,
  pickaxeCanAfford,
  pickaxeCost,
  pickaxeStats,
  smelteryTimeNeeded,
  spendCurrency,
  spendPrice,
  type Price,
} from './core'
import { isUnlocked, rebuildMults } from './effects'
import { multGet } from './mults'
import { resetStatValues, statIncreaseTo, statTotal } from './stats'

/**
 * 采矿动作层 —— 购买升级、锻造镐子、熔炼、增强、信标、转生。
 * 对应 Gooboo `store/mining.js` 的 actions。
 */

const C = MINING_CONSTANTS

/** 随机源，默认 `Math.random`，测试可注入固定值。 */
export type Rng = () => number

function requirementContext(m: MiningState): MiningRequirementContext {
  return {
    maxDepth0: m.maxDepth0,
    maxDepth1: m.maxDepth1,
    dwellerCap0: m.depthDwellerCap0,
    dwellerCap1: m.depthDwellerCap1,
    unlocks: m.unlocks,
  }
}

/* ── 升级 ── */

export function upgradeLevelOf(m: MiningState, id: string): number {
  const def = miningUpgradeOf(id)
  return def.kind === 'prestige' ? (m.prestigeUpgrades[id] ?? 0) : (m.upgrades[id] ?? 0)
}

/* ── Premium 升级（gem_ruby，跨转生保留） ── */

/** Premium 升级等级。 */
export function premiumLevelOf(m: MiningState, id: string): number {
  return m.premiumUpgrades[id] ?? 0
}

/** Premium 升级是否可见（满足深度 / 解锁条件）。 */
export function isPremiumVisible(m: MiningState, def: MiningPremiumUpgradeDef): boolean {
  if (def.requirement === undefined) {
    return true
  }
  switch (def.requirement.type) {
    case 'depth': {
      const depth = def.requirement.subfeature === 1 ? m.maxDepth1 : m.maxDepth0
      return depth >= def.requirement.value
    }
    case 'unlock':
      return m.unlocks[def.requirement.key]?.see === true
    default:
      return false
  }
}

/** Premium 升级购买结果。 */
export type PremiumBlock =
  | { kind: 'hidden' }
  | { kind: 'capped'; cap: number }
  | { kind: 'resource'; id: string; need: number; have: number }

/** 判断某 Premium 升级能否购买；返回 null 表示可以。 */
export function premiumBlock(m: MiningState, id: string): PremiumBlock | null {
  const def = miningPremiumOf(id)
  if (!isPremiumVisible(m, def)) {
    return { kind: 'hidden' }
  }
  const lvl = premiumLevelOf(m, id)
  const cap = def.cap ?? Infinity
  if (lvl >= cap) {
    return { kind: 'capped', cap }
  }
  const price = def.price(lvl)
  for (const key in price) {
    const have = currencyValue(m, key)
    if (have < price[key]) {
      return { kind: 'resource', id: key, need: price[key], have }
    }
  }
  return null
}

/** 购买 Premium 升级。 */
export function buyPremiumUpgrade(m: MiningState, id: string): boolean {
  const block = premiumBlock(m, id)
  if (block !== null) {
    return false
  }
  const def = miningPremiumOf(id)
  const lvl = premiumLevelOf(m, id)
  spendPrice(m, def.price(lvl))
  m.premiumUpgrades[id] = lvl + 1
  rebuildMults(m)
  return true
}

/** 计算某 Premium 升级当前最多还能连续购买多少级（0 表示一个也买不起或已满级）。 */
export function premiumMaxCount(m: MiningState, id: string): number {
  const def = miningPremiumOf(id)
  if (!isPremiumVisible(m, def)) {
    return 0
  }
  let lvl = premiumLevelOf(m, id)
  const cap = def.cap ?? Infinity
  if (lvl >= cap) {
    return 0
  }
  let cumulative: Price = {}
  let count = 0
  while (lvl + count < cap) {
    const next = def.price(lvl + count)
    const merged: Price = { ...cumulative }
    for (const key in next) {
      merged[key] = (merged[key] ?? 0) + next[key]
    }
    if (!canAfford(m, merged)) {
      break
    }
    cumulative = merged
    count += 1
  }
  return count
}

/** 连续购买某 Premium 升级直到买不起 / 满级；返回实际购买次数。 */
export function buyPremiumMax(m: MiningState, id: string): number {
  const count = premiumMaxCount(m, id)
  if (count <= 0) {
    return 0
  }
  const def = miningPremiumOf(id)
  const lvl = premiumLevelOf(m, id)
  for (let i = 0; i < count; i += 1) {
    spendPrice(m, def.price(lvl + i))
  }
  m.premiumUpgrades[id] = lvl + count
  rebuildMults(m)
  return count
}

/** 升级的等级上限（被 `uncapUpgrade` 解除后为 Infinity）。 */
export function upgradeCapOf(m: MiningState, id: string): number {
  const def = miningUpgradeOf(id)
  if (m.uncappedUpgrades[`mining_${id}`] === true) {
    return Infinity
  }
  return def.cap ?? Infinity
}

/** 升级当前是否可见（满足解锁条件）。 */
export function isUpgradeVisible(m: MiningState, def: MiningUpgradeDef): boolean {
  const ctx = requirementContext(m)
  switch (def.requirement.type) {
    case 'depth':
      return (
        (def.requirement.subfeature === 0 ? ctx.maxDepth0 : ctx.maxDepth1) >= def.requirement.value
      )
    case 'dwellerCap':
      return (
        (def.requirement.subfeature === 0 ? ctx.dwellerCap0 : ctx.dwellerCap1) >=
        def.requirement.value
      )
    case 'unlock':
      return m.unlocks[def.requirement.key]?.use === true
    case 'unlockSeen':
      return m.unlocks[def.requirement.key]?.see === true
    default:
      return true
  }
}

export type BuyBlock =
  | { kind: 'hidden' }
  | { kind: 'capped'; cap: number }
  | { kind: 'levelLocked'; depth: number }
  | { kind: 'resource'; id: string; need: number; have: number }

/** 判断某升级能否购买；返回 null 表示可以。 */
export function upgradeBlock(m: MiningState, id: string): BuyBlock | null {
  const def = miningUpgradeOf(id)
  if (!isUpgradeVisible(m, def)) {
    return { kind: 'hidden' }
  }
  const lvl = upgradeLevelOf(m, id)
  if (lvl >= upgradeCapOf(m, id)) {
    return { kind: 'capped', cap: upgradeCapOf(m, id) }
  }
  if (def.levelRequirement !== undefined && !def.levelRequirement(requirementContext(m), lvl)) {
    return { kind: 'levelLocked', depth: def.requirement.type === 'depth' ? def.requirement.value : 0 }
  }
  const price = def.price(lvl)
  for (const key in price) {
    const cur = key.startsWith('mining_') ? key.slice(7) : key
    const have = currencyValue(m, cur)
    if (have < price[key]) {
      return { kind: 'resource', id: cur, need: price[key], have }
    }
  }
  return null
}

export function canBuyUpgrade(m: MiningState, id: string): boolean {
  return upgradeBlock(m, id) === null
}

export function buyUpgrade(m: MiningState, id: string): boolean {
  const block = upgradeBlock(m, id)
  if (block !== null) {
    return false
  }
  const def = miningUpgradeOf(id)
  const lvl = upgradeLevelOf(m, id)
  spendPrice(m, def.price(lvl))
  if (def.kind === 'prestige') {
    m.prestigeUpgrades[id] = lvl + 1
  } else {
    m.upgrades[id] = lvl + 1
  }
  rebuildMults(m)
  return true
}

/** 计算某升级当前最多还能连续购买多少级（0 表示一个也买不起或已满级）。 */
export function upgradeMaxCount(m: MiningState, id: string): number {
  const def = miningUpgradeOf(id)
  if (!isUpgradeVisible(m, def)) {
    return 0
  }
  let lvl = upgradeLevelOf(m, id)
  const cap = upgradeCapOf(m, id)
  if (lvl >= cap) {
    return 0
  }
  let cumulative: Price = {}
  let count = 0
  while (lvl + count < cap) {
    if (
      def.levelRequirement !== undefined &&
      !def.levelRequirement(requirementContext(m), lvl + count)
    ) {
      break
    }
    const next = def.price(lvl + count)
    const merged: Price = { ...cumulative }
    for (const key in next) {
      merged[key] = (merged[key] ?? 0) + next[key]
    }
    if (!canAfford(m, merged)) {
      break
    }
    cumulative = merged
    count += 1
  }
  return count
}

/** 连续购买某升级直到买不起 / 满级；返回实际购买次数。 */
export function buyUpgradeMax(m: MiningState, id: string): number {
  const count = upgradeMaxCount(m, id)
  if (count <= 0) {
    return 0
  }
  const def = miningUpgradeOf(id)
  const lvl = upgradeLevelOf(m, id)
  for (let i = 0; i < count; i += 1) {
    spendPrice(m, def.price(lvl + i))
  }
  if (def.kind === 'prestige') {
    m.prestigeUpgrades[id] = lvl + count
  } else {
    m.upgrades[id] = lvl + count
  }
  rebuildMults(m)
  return count
}

/**
 * 自动购买升级（**本项目扩展，Gooboo 无此功能**）。
 *
 * 策略：按「本次付款中金额最高的那一项资源」从便宜到昂贵排序，能买就买，
 * 每项每次最多升 `maxRounds` 级。便宜优先可以避免单一升级吃光资源，
 * 导致扩容类升级永远买不起。
 *
 * @returns 成功购买的次数。
 */
export function autoBuyUpgrades(m: MiningState, maxRounds = 1): number {
  let bought = 0
  for (let round = 0; round < maxRounds; round += 1) {
    const candidates: Array<{ id: string; cost: number }> = []
    for (const def of ALL_MINING_UPGRADES) {
      if (!isUpgradeVisible(m, def)) continue
      const block = upgradeBlock(m, def.id)
      if (block !== null) continue
      const price = def.price(upgradeLevelOf(m, def.id))
      let cost = 0
      for (const key in price) {
        cost = Math.max(cost, price[key])
      }
      candidates.push({ id: def.id, cost })
    }
    if (candidates.length === 0) break

    candidates.sort((a, b) => a.cost - b.cost)
    for (const candidate of candidates) {
      if (buyUpgrade(m, candidate.id)) {
        bought += 1
      }
    }
  }
  return bought
}

/* ── 镐子锻造 ── */

/** 往槽位里加一份矿石（自动按持有量选择压缩等级）。 */
export function addIngredient(m: MiningState, name: MiningOreId): boolean {
  if (m.ingredientList.length >= craftingSlots(m)) {
    return false
  }
  const def = MINING_ORES.find((o) => o.id === name)
  if (def === undefined) {
    return false
  }
  // 至少要有 1 份未压缩的量才能入槽
  if (currencyValue(m, name) * multGet(m.mults, 'miningOreQuality') < 1) {
    return false
  }
  let compress = 0
  const compressKey = `miningCompress${name.slice(3)}`
  if (isUnlocked(m, compressKey, true)) {
    const value = currencyValue(m, name)
    const quality = multGet(m.mults, 'miningOreQuality')
    let limit = Math.pow(C.CRAFTING_COMPRESSION, compress + 1)
    while (value >= limit / quality && currencyCapSafe(m, name) >= limit) {
      compress += 1
      limit *= C.CRAFTING_COMPRESSION
    }
  }
  m.ingredientList.push({ name, compress })
  return true
}

function currencyCapSafe(m: MiningState, id: string): number {
  const key = `currencyMining${id.charAt(0).toUpperCase()}${id.slice(1)}Cap`
  if (m.mults[key] === undefined) {
    return Infinity
  }
  return multGet(m.mults, key)
}

export function removeIngredient(m: MiningState, index: number): boolean {
  if (index < 0 || index >= m.ingredientList.length) {
    return false
  }
  m.ingredientList.splice(index, 1)
  return true
}

export function clearIngredients(m: MiningState): void {
  m.ingredientList = []
}

export interface CraftResult {
  ok: boolean
  /** 本次锻造出的新威力（未超过旧值时为旧值）。 */
  power: number
  /** 是否真正提升了威力。 */
  improved: boolean
}

/** 执行一次锻造：消耗槽内矿石，roll 一次 RNG 决定是否提升镐子威力。 */
export function craftPickaxe(m: MiningState, rng: Rng = Math.random): CraftResult {
  const stats = pickaxeStats(m)
  if (m.subfeature === 0) {
    if (m.ingredientList.length === 0 || !pickaxeCanAfford(m)) {
      return { ok: false, power: m.pickaxePower, improved: false }
    }
    if (stats.quality < m.pickaxePower) {
      m.craftingWasted = 1
      statIncreaseTo(m, 'craftingWasted', 1)
    }
    const rval = 1 - rng()
    const span = 1 / stats.purity + 1
    const rolled = rval * (span - 1) + 1
    const normalized =
      1 - logBase(rolled, 2) / logBase(span, 2)
    const newPick = (normalized * (1 - stats.purity) + stats.purity) * stats.quality
    const improved = newPick > m.pickaxePower
    if (improved) {
      m.pickaxePower = newPick
    }
    spendPrice(m, pickaxeCost(m))
    m.craftingCount += 1
    m.craftingLuck = Math.max(m.craftingLuck, rval === 0 ? m.craftingLuck : 1 / rval)
    statIncreaseTo(m, 'craftingLuck', rval === 0 ? 0 : 1 / rval)
    rebuildMults(m)
    return { ok: true, power: m.pickaxePower, improved }
  }

  const power = multGet(m.mults, 'miningPickaxeCraftingPower', currencyValue(m, 'smoke'))
  const improved = power > m.pickaxePower
  if (improved) {
    m.pickaxePower = power
    m.currency.smoke = 0
  }
  m.craftingCount += 1
  rebuildMults(m)
  return { ok: true, power: m.pickaxePower, improved }
}

/* ── 圣遗物 · 主动技能 ── */

/** 遗物主动技能的一次性收益量（供 UI 预览）。 */
export function relicActiveReward(m: MiningState, id: string): number {
  const relic = relicOf(id as MiningRelicId)
  if (relic.active === undefined) {
    return 0
  }
  switch (relic.active.currency) {
    case 'scrap':
      // friendlyBat：历史废料平方根 + 当前层每秒废料 × 1200
      return Math.sqrt(statTotal(m, 'scrap')) + depthBaseScrap(m.depth, m.subfeature) * 1200
    case 'resin':
      // honeyPot：树脂上限
      return Math.round(multGet(m.mults, 'currencyMiningResinCap'))
    default:
      return 0
  }
}

/** 使用遗物主动技能：消耗 relic_power，获得一次性收益。 */
export function useRelicActive(m: MiningState, id: string): { ok: boolean; gain: number } {
  const relic = relicOf(id as MiningRelicId)
  if (relic.active === undefined || !isRelicUnlocked(m, relic.id)) {
    return { ok: false, gain: 0 }
  }
  const cost = relic.active.cost
  if (m.relicPower < cost) {
    return { ok: false, gain: 0 }
  }
  const gain = relicActiveReward(m, id)
  if (gain <= 0) {
    return { ok: false, gain: 0 }
  }
  m.relicPower -= cost
  gainCurrency(m, relic.active.currency, gain)
  rebuildMults(m)
  return { ok: true, gain }
}

/** 遗物是否已解锁（读写 MiningState 自身）。 */
export function isRelicUnlocked(m: MiningState, id: MiningRelicId): boolean {
  return relicUnlocked(relicOf(id), { mining: m })
}

/* ── 熔炼 ── */

/** 向产线投料（尽可能多地投，`max` 为 true 时投到不能投为止）。 */
export function addToSmeltery(m: MiningState, id: SmelteryId, max = false): number {
  const line = m.smeltery[id]
  if (line === undefined) {
    return 0
  }
  let amount = 0
  let price: Record<string, number> = {}
  let finalPrice: Record<string, number> = {}
  let guard = 0
  while ((max || amount < 1) && guard < 10_000) {
    guard += 1
    const next = smelteryPrice(m, id, amount)
    const merged: Record<string, number> = { ...price }
    for (const key in next) {
      merged[key] = (merged[key] ?? 0) + next[key]
    }
    if (!canAfford(m, merged)) {
      break
    }
    price = merged
    finalPrice = { ...merged }
    amount += 1
  }
  if (amount <= 0) {
    return 0
  }
  for (const key in finalPrice) {
    const cur = key.startsWith('mining_') ? key.slice(7) : key
    // 氦与氖只作为门槛，不消耗
    if (cur === 'helium' || cur === 'neon') {
      continue
    }
    m.currency[cur] = currencyValue(m, cur) - finalPrice[key]
  }
  line.stored += amount
  line.total += amount
  return amount
}

export function smelteryPrice(m: MiningState, id: SmelteryId, add = 0): Record<string, number> {
  const line = m.smeltery[id]
  if (line === undefined) {
    return {}
  }
  return smelteryOf(id).price(line.total + add)
}

/* ── 锭增强 ── */

export function setEnhancementIngredient(m: MiningState, id: string | null): void {
  m.enhancementIngredient = id
}

export function enhancementBlock(m: MiningState): 'none' | 'noIngredient' | 'maxed' | 'bars' {
  if (m.enhancementIngredient === null) {
    return 'noIngredient'
  }
  const lvl = m.enhancement[m.enhancementIngredient] ?? 0
  if (lvl >= enhancementMax(m)) {
    return 'maxed'
  }
  if (currencyValue(m, m.enhancementIngredient) < enhancementBarsNeeded(m)) {
    return 'bars'
  }
  return 'none'
}

export function enhance(m: MiningState): boolean {
  if (enhancementBlock(m) !== 'none' || m.enhancementIngredient === null) {
    return false
  }
  const id = m.enhancementIngredient
  spendCurrency(m, id, enhancementBarsNeeded(m))
  m.enhancement[id] = (m.enhancement[id] ?? 0) + 1
  m.enhancementHighest = Math.max(m.enhancementHighest, m.enhancement[id] ?? 0)
  statIncreaseTo(m, 'enhancementHighest', m.enhancement[id] ?? 0)
  rebuildMults(m)
  return true
}

export function toggleEnhancements(m: MiningState): void {
  m.enhancementsActive = !m.enhancementsActive
  rebuildMults(m)
}

export function resetEnhancement(m: MiningState, id: string): void {
  m.enhancement[id] = 0
  rebuildMults(m)
}

/* ── 信标 ── */

export function placeBeacon(m: MiningState, depth: number, beacon: MiningBeaconId): boolean {
  if (m.beaconPlaced[depth] !== undefined) {
    return false
  }
  if (beaconOwnedSafe(m, beacon) < 1) {
    return false
  }
  m.beaconPlaced[depth] = beacon
  rebuildMults(m)
  return true
}

function beaconOwnedSafe(m: MiningState, id: MiningBeaconId): number {
  const def = MINING_BEACONS.find((b) => b.id === id)
  if (def === undefined) {
    return 0
  }
  let amount = Math.round(multGet(m.mults, def.ownedMult))
  for (const key in m.beaconPlaced) {
    if (m.beaconPlaced[key] === id) {
      amount -= 1
    }
  }
  return amount
}

export function removeBeacon(m: MiningState, depth: number): boolean {
  if (m.beaconCooldown > 0 || m.beaconPlaced[depth] === undefined) {
    return false
  }
  delete m.beaconPlaced[depth]
  m.beaconCooldown = SECONDS_PER_HOUR * 20
  rebuildMults(m)
  return true
}

/* ── 转生 ── */

export interface MiningPrestigeResult {
  crystal: number
  ember: number
}

/**
 * 执行采矿转生：把深度居民兑换成水晶（+余烬），并清空当局进度。
 * 保留：水晶、余烬、气态资源、声望升级、被 keepUpgrade 标记的常规升级。
 */
export function miningPrestige(m: MiningState, subfeature: 0 | 1): MiningPrestigeResult {
  const current = m.subfeature
  const crystal = current === 0 ? dwellerGreenCrystal(m) : dwellerYellowCrystal(m)
  const ember = Math.floor(
    multGet(m.mults, 'currencyMiningEmberGain') *
      (current === 0 ? m.depthDweller0 : m.depthDweller1),
  )

  const result: MiningPrestigeResult = { crystal: 0, ember: 0 }

  // 转生前记录本轮的历史峰值（成就 `depthDwellerCap0/1` 读它）
  const dwellerLimitNow = dwellerLimit(m)
  statIncreaseTo(
    m,
    `depthDwellerCap${current}`,
    Math.min(current === 0 ? m.depthDwellerCap0 : m.depthDwellerCap1, dwellerLimitNow),
  )
  statIncreaseTo(m, 'prestigeCount', 1)

  if (crystal > 0) {
    gainCurrency(m, current === 0 ? 'crystalGreen' : 'crystalYellow', crystal)
    if (current === 0) {
      m.bestPrestige0 = Math.max(m.bestPrestige0, crystal)
    } else {
      m.bestPrestige1 = Math.max(m.bestPrestige1, crystal)
    }
    m.prestigeCount += 1
    result.crystal = crystal
    // emerald：卡包通货（Gooboo 来自村庄系统，本项目无村庄，改为按居民峰值产出）
    gainCurrency(
      m,
      'gem_emerald',
      Math.max(1, Math.floor((current === 0 ? m.depthDwellerCap0 : m.depthDwellerCap1) * 0.5)),
    )
    // ruby：Premium 升级通货（Gooboo 真钱购买，本项目改为按绿水晶产量 10% 产出，最少 1）
    gainCurrency(m, 'gem_ruby', Math.max(1, Math.floor(crystal * 0.1)))
  }
  if (ember > 0) {
    gainCurrency(m, 'ember', ember)
    result.ember = ember
  }

  // 清空当局
  for (const key in m.smeltery) {
    m.smeltery[key].progress = 0
    m.smeltery[key].stored = 0
    m.smeltery[key].total = 0
  }
  for (const def of MINING_ENHANCEMENTS) {
    m.enhancement[def.id] = 0
  }
  m.pickaxePower = C.PICKAXE_POWER_BASE
  m.ingredientList = []
  m.depthDweller0 = 0
  m.depthDweller1 = 0
  m.depthDwellerCap0 = 0
  m.depthDwellerCap1 = 0
  m.depth = 1
  m.breaks = []
  m.enhancementIngredient = null
  m.enhancementsActive = true
  m.torchDepths = []
  m.glowshardLimit = 0

  // 常规升级：非 persistent 或不属于新子模式的清空（keepUpgrade 的除外）
  for (const def of ALL_MINING_UPGRADES) {
    if (def.kind !== 'regular') {
      continue
    }
    const keep = m.keepUpgrades[`mining_${def.id}`] === true
    const survives = def.persistent === true && def.subfeature === subfeature
    if (!keep && !survives) {
      m.upgrades[def.id] = 0
    }
  }

  m.subfeature = subfeature
  m.durability = currentDurability(m)
  m.timeSpent = 0
  // 当前值类统计清零，total（成就 / 全局等级依据）保留
  resetStatValues(m)

  // 树脂保留到上限
  const resinMax = Math.round(multGet(m.mults, 'miningResinMax'))
  if ((m.currency.resin ?? 0) > resinMax) {
    m.currency.resin = resinMax
  }

  rebuildMults(m)
  return result
}

/** 当前转生可得的水晶（预览）。 */
export function prestigePreview(m: MiningState): number {
  return m.subfeature === 0 ? dwellerGreenCrystal(m) : dwellerYellowCrystal(m)
}

/** 熔炼产线剩余时间（秒）。 */
export function smelteryRemaining(m: MiningState, id: SmelteryId): number {
  const line = m.smeltery[id]
  if (line === undefined || line.stored <= 0) {
    return 0
  }
  return smelteryTimeNeeded(m, id) * (1 - line.progress)
}

export { enhancementLevel, depthGasLimit }
