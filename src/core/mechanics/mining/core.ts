import {
  capitalizeId,
  depthBaseScrap,
  depthBaseSmoke,
  depthBaseToughness,
  depthDurability,
  isOreAtDepth,
  MINING_BEACONS,
  MINING_CONSTANTS,
  MINING_GASES,
  MINING_GAS_MIN_DEPTH,
  MINING_ORES,
  MINING_RARE_EARTHS,
  miningCurrencyOf,
  oreBaseAmount,
  rareDropBase,
  type MiningBeaconId,
  type MiningGasId,
  type MiningOreId,
  type MiningRareEarthId,
  type SmelteryId,
} from '../../data/mining'
import { digitSum, getSequence, isPrime, logBase } from '../../math'
import type { MiningState } from '../../state/gameState'
import { multGet, type MultMap } from './mults'
import { statAdd, statIncreaseTo } from './stats'

/**
 * 采矿派生数值层 —— 对应 Gooboo `store/mining.js` 的 getters。
 * 全部为纯函数（只读 state），不含副作用。
 */

const C = MINING_CONSTANTS

/* ── 深度 / 伤害 ── */

export function currentSubfeature(m: MiningState): 0 | 1 {
  return m.subfeature
}

/** 全局伤害（含镐子威力与全部 `miningDamage` 乘区）。 */
export function miningDamage(m: MiningState): number {
  return multGet(m.mults, 'miningDamage', m.pickaxePower)
}

/** 指定层的硬度（含 `miningToughness` 乘区）。 */
export function depthToughness(m: MiningState, depth: number): number {
  return multGet(m.mults, 'miningToughness', depthBaseToughness(depth, m.subfeature))
}

export function currentToughness(m: MiningState): number {
  return depthToughness(m, m.depth)
}

export function currentDurability(m: MiningState): number {
  return depthDurability(m.depth, m.subfeature)
}

/** 有效伤害：伤害减去硬度，最低为 0（为 0 时矿壁不再推进）。 */
export function currentDamage(m: MiningState): number {
  return Math.max(0, miningDamage(m) - currentToughness(m))
}

/** 击碎当前层剩余耐久所需的次数；无法击碎时为 Infinity。 */
export function currentHitsNeeded(m: MiningState): number {
  const dmg = currentDamage(m)
  return dmg > 0 ? Math.ceil(m.durability / dmg) : Infinity
}

/** 击碎一整层所需的次数（从满耐久开始）。 */
export function hitsNeeded(m: MiningState): number {
  const dmg = currentDamage(m)
  return dmg > 0 ? Math.ceil(currentDurability(m) / dmg) : Infinity
}

/** 指定层从满耐久击碎所需的次数。 */
export function depthHitsNeeded(m: MiningState, depth: number): number {
  const dmg = miningDamage(m) - depthToughness(m, depth)
  return dmg > 0 ? Math.ceil(depthDurability(depth, m.subfeature) / dmg) : Infinity
}

/** 当前层剩余耐久进度（0~1，1 表示刚进入该层）。 */
export function durabilityProgress(m: MiningState): number {
  const full = currentDurability(m)
  if (full <= 0) return 0
  return Math.min(1, Math.max(0, m.durability / full))
}

/* ── 废料 / 烟 ── */

export function currentScrap(m: MiningState): number {
  return multGet(m.mults, 'currencyMiningScrapGain', depthBaseScrap(m.depth, m.subfeature))
}

export function currentSmoke(m: MiningState): number {
  if (!(m.unlocks.miningSmoke?.use === true) || m.depth < 25 || m.subfeature !== 1) {
    return 0
  }
  return multGet(m.mults, 'currencyMiningSmokeGain', depthBaseSmoke(m.depth))
}

/* ── 矿石 ── */

export interface DepthOreEntry {
  amount: number
  baseAmount: number
  /** 是否为本层的自然产出（false = 仅因火把而半价产出）。 */
  natural: boolean
}

/**
 * 当前层的可采矿石集合。
 * 条件：`depth >= minDepth && (depth <= maxDepth || depth % modulo === 0)`，
 * 火把层可强制出现（产量减半）。
 */
export function depthOre(m: MiningState, depth: number, ignoreTorch = false): Record<string, DepthOreEntry> {
  if (m.subfeature !== 0) {
    return {}
  }
  const hasTorch = m.torchDepths.includes(depth) && !ignoreTorch
  const ore: Record<string, DepthOreEntry> = {}
  for (const def of MINING_ORES) {
    const natural = isOreAtDepth(def, depth)
    if (!(depth >= def.minDepth && (natural || hasTorch))) {
      continue
    }
    const base = oreBaseAmount(def, depth)
    const amount = multGet(
      m.mults,
      `currencyMining${capitalizeId(def.id)}Gain`,
      base * (natural ? 1 : 0.5),
    )
    ore[def.id] = { amount, baseAmount: base, natural }
  }
  return ore
}

export function currentOre(m: MiningState): Record<string, DepthOreEntry> {
  return depthOre(m, m.depth)
}

/* ── 稀有掉落 ── */

export function rareDropFinal(m: MiningState, name: MiningRareEarthId): number {
  return multGet(m.mults, `currencyMining${capitalizeId(name)}Gain`, rareDropBase(name, m.depth))
}

/** 花岗岩的击碎对数倍率：`2^(log10(breaks+1) - 3)`。 */
export function graniteBreaksMult(m: MiningState): number {
  return Math.pow(2, Math.max(0, Math.floor(logBase(currentBreaks(m) + 1, 10)) - 3))
}

/** 当前层已击碎次数。 */
export function currentBreaks(m: MiningState): number {
  return m.breaks.length >= m.depth ? (m.breaks[m.depth - 1] ?? 0) : 0
}

export function enhancementLevel(m: MiningState): number {
  let level = 0
  for (const key in m.enhancement) {
    level += m.enhancement[key] ?? 0
  }
  return level
}

/**
 * 当前层"预览"的稀有掉落表（用于 UI 展示每秒可得哪些稀有物）。
 * 与 `awardLoot` 的判定条件保持一致。
 */
export function rareDrops(m: MiningState): Partial<Record<MiningRareEarthId, number>> {
  const obj: Partial<Record<MiningRareEarthId, number>> = {}
  const depth = m.depth
  if (m.subfeature === 0) {
    const breaks = currentBreaks(m)
    if (depth >= C.GRANITE_DEPTH && breaks >= 1000) {
      obj.granite = rareDropFinal(m, 'granite') * graniteBreaksMult(m)
    }
    const depthOres = Object.keys(depthOre(m, depth, true)).length
    if (depth >= C.SALT_DEPTH && (depthOres === 1 || m.torchDepths.includes(depth))) {
      obj.salt = rareDropFinal(m, 'salt') * (depthOres === 1 ? 1 : 0.5)
    }
    if (depth >= C.COAL_DEPTH && breaks === 0) {
      obj.coal = rareDropFinal(m, 'coal')
    }
    if (depth >= C.SULFUR_DEPTH && breaks === 0) {
      obj.sulfur = rareDropFinal(m, 'sulfur')
    }
    if (depth >= C.NITER_DEPTH) {
      const breaksLog = logBase(breaks + 1, 10)
      if (Math.round(breaksLog) === breaksLog) {
        obj.niter = rareDropFinal(m, 'niter')
      }
    }
    if (depth >= C.OBSIDIAN_DEPTH && (enhancementLevel(m) <= 0 || !m.enhancementsActive)) {
      obj.obsidian = rareDropFinal(m, 'obsidian')
    }
    if (depth >= C.DEEPROCK_DEPTH && digitSum(depth) >= 14) {
      obj.deeprock = rareDropFinal(m, 'deeprock')
    }
    if (depth >= C.GLOWSHARD_DEPTH + m.glowshardLimit) {
      obj.glowshard = rareDropFinal(m, 'glowshard')
    }
  }
  if (m.subfeature === 1) {
    if (isPrime(depth)) {
      obj.limestone = rareDropFinal(m, 'limestone')
    }
    if (depth >= C.MOONSHARD_DEPTH && m.depthDwellerCap1 >= depth) {
      obj.moonshard = rareDropFinal(m, 'moonshard')
    }
    if (depth >= C.PHOSPHORUS_DEPTH && depth % 25 === 0) {
      obj.phosphorus = rareDropFinal(m, 'phosphorus')
    }
  }
  return obj
}

export const ALL_RARE_EARTH_IDS: MiningRareEarthId[] = MINING_RARE_EARTHS

/* ── 气体 ── */

/** 指定深度某气体的持有上限。 */
export function depthGasLimit(m: MiningState, depth: number, gas: MiningGasId): number {
  const min = MINING_GAS_MIN_DEPTH[gas]
  return Math.round(
    (depth + 1 - min) *
      multGet(m.mults, `currencyMining${capitalizeId(gas)}Limit`, 1) *
      Math.pow(multGet(m.mults, `currencyMining${capitalizeId(gas)}Increment`, 1), depth - min),
  )
}

/** 当前层击碎时可得的气体（补齐到上限）。 */
export function currentGas(m: MiningState): Partial<Record<MiningGasId, number>> {
  if (m.subfeature !== 1) {
    return {}
  }
  const gasses: Partial<Record<MiningGasId, number>> = {}
  for (const gas of MINING_GASES) {
    if (m.depth < MINING_GAS_MIN_DEPTH[gas]) {
      continue
    }
    const amount = Math.ceil(
      Math.max(0, depthGasLimit(m, m.depth, gas) - currencyValue(m, gas)) *
        multGet(m.mults, `currencyMining${capitalizeId(gas)}Gain`, 1),
    )
    if (amount > 0) {
      gasses[gas] = amount
    }
  }
  return gasses
}

/* ── 货币 ── */

export function currencyValue(m: MiningState, id: string): number {
  return m.currency[id] ?? 0
}

/** 某货币的存储上限；无上限定义时返回 Infinity。 */
export function currencyCap(m: MiningState, id: string): number {
  const key = `currencyMining${capitalizeId(id)}Cap`
  if (m.mults[key] === undefined) {
    return Infinity
  }
  return multGet(m.mults, key)
}

/**
 * 增加货币（受上限约束），返回实际增加量。
 *
 * 对齐 Gooboo `store/currency.js → gain`：
 * - 无上限货币（cap=null）直接累加；
 * - 有上限货币按段（stage）计算 overcap——第 0 段满额，之后每段按
 *   `overcapMult * overcapScaling^(stage-1)` 衰减，可超过 cap 无限累积。
 *   默认 `overcapMult=0.25`、`overcapScaling=0.5`（Gooboo 缺省值）。
 */
export function gainCurrency(m: MiningState, id: string, amount: number): number {
  if (!(amount > 0)) {
    return 0
  }
  const before = currencyValue(m, id)
  const cap = currencyCap(m, id)
  if (cap === Infinity) {
    const after = before + amount
    m.currency[id] = after
    statAdd(m, id, amount)
    statIncreaseTo(m, `${id}Max`, after)
    return amount
  }

  const def = miningCurrencyOf(id)
  const overcapMult = def.overcapMult ?? 0.25
  const overcapScaling = def.overcapScaling ?? 0.5

  let gained = 0
  let amt = amount
  let stage = Math.floor(before / cap)
  while (amt > 0) {
    const left = cap * (stage + 1) - before - gained
    const stageMult = stage > 0 ? overcapMult * Math.pow(overcapScaling, stage - 1) : 1
    const given = Math.min(left, amt * stageMult)
    if (!(given > 0)) {
      break
    }
    gained += given
    amt -= given / stageMult
    stage += 1
  }

  if (gained < 0) {
    gained = 0
  }
  const after = before + gained
  m.currency[id] = after

  // 统计埋点（成就 / 全局等级只认 total）
  statAdd(m, id, gained)
  statIncreaseTo(m, `${id}Max`, after)

  return gained
}

export function spendCurrency(m: MiningState, id: string, amount: number): boolean {
  if (currencyValue(m, id) < amount) {
    return false
  }
  m.currency[id] = currencyValue(m, id) - amount
  return true
}

/** 价格：`mining_xxx` → 数量。 */
export type Price = Record<string, number>

export function canAfford(m: MiningState, price: Price): boolean {
  for (const key in price) {
    const id = key.startsWith('mining_') ? key.slice(7) : key
    if (currencyValue(m, id) < price[key]) {
      return false
    }
  }
  return true
}

export function spendPrice(m: MiningState, price: Price): void {
  for (const key in price) {
    const id = key.startsWith('mining_') ? key.slice(7) : key
    m.currency[id] = currencyValue(m, id) - price[key]
  }
}

/* ── 深度居民（转生资源） ── */

export function dwellerLimit(m: MiningState): number {
  const maxDepth = m.subfeature === 0 ? m.maxDepth0 : m.maxDepth1
  return maxDepth * multGet(m.mults, 'miningDepthDwellerMax')
}

export interface DwellerStats {
  cap: number
  bonus: number
}

export function dwellerStats(m: MiningState, subfeature: 0 | 1): DwellerStats {
  const base = subfeature === 0 ? m.depthDweller0 : m.depthDweller1
  const capValue = subfeature === 0 ? m.depthDwellerCap0 : m.depthDwellerCap1
  const cap = Math.floor(capValue * 2)
  return { cap, bonus: cap > 0 ? Math.floor(base * 2) / cap : 1 }
}

/** 转生收益基础公式：`1.15^(steps/2) * steps * 7`。 */
export function dwellerBaseGain(steps: number): number {
  return Math.pow(1.15, steps / 2) * steps * 7
}

export function dwellerGreenCrystal(m: MiningState): number {
  const stats = dwellerStats(m, 0)
  return multGet(m.mults, 'currencyMiningCrystalGreenGain', dwellerBaseGain(stats.cap)) * stats.bonus
}

export function dwellerYellowCrystal(m: MiningState): number {
  const stats = dwellerStats(m, 1)
  return multGet(m.mults, 'currencyMiningCrystalYellowGain', dwellerBaseGain(stats.cap)) * stats.bonus
}

/** 距深度居民达到 `amount` 还需多少秒；已超过上限时返回 null。 */
export function timeUntilNext(m: MiningState, amount: number): number | null {
  const limit = dwellerLimit(m)
  if (amount > limit || limit <= 0) {
    return null
  }
  const speed = multGet(m.mults, 'miningDepthDwellerSpeed') / limit
  const current = m.subfeature === 0 ? m.depthDwellerCap0 : m.depthDwellerCap1
  return logBase((amount - C.DWELLER_OVERFLOW - limit) / -(C.DWELLER_OVERFLOW + limit - current), 1 - speed)
}

/* ── 熔炼 ── */

export function smelteryTimeNeeded(m: MiningState, id: SmelteryId): number {
  const line = m.smeltery[id]
  if (line === undefined) {
    return Infinity
  }
  return (
    (multGet(m.mults, 'miningSmelteryTime', line.timeNeeded) *
      Math.pow(C.SMELTERY_TIME_INCREMENT, line.total - line.stored)) /
    Math.max(
      1,
      (multGet(m.mults, 'miningSmelteryTemperature') - line.minTemperature) *
        C.SMELTERY_TEMPERATURE_SPEED +
        1,
    )
  )
}

/* ── 镐子锻造 ── */

export interface PickaxeStats {
  baseQuality: number
  alloying: number
  impurity: number
  cleanse: number
  quality: number
  purity: number
}

export function pickaxeStats(m: MiningState): PickaxeStats {
  let quality = 0
  let impurity = 1
  let compress = 0
  let unique = 0
  const uniqueObj: Record<string, boolean> = {}
  const premiumSlots = Math.round(multGet(m.mults, 'miningPickaxePremiumCraftingSlots'))

  m.ingredientList.forEach((elem, key) => {
    const def = MINING_ORES.find((o) => o.id === elem.name)
    if (def === undefined) {
      return
    }
    const isPremium = key < premiumSlots
    quality += def.power
    const impurityBase = Math.max(1, def.impurity * Math.pow(0.95, elem.compress) - elem.compress * 0.05)
    impurity *= isPremium ? (impurityBase - 1) / 2 + 1 : impurityBase
    compress += elem.compress * (isPremium ? 2 : 1)
    if (uniqueObj[elem.name] !== true) {
      unique += 1
      uniqueObj[elem.name] = true
    }
  })

  const alloying = unique * 0.5 + 0.5
  const cleanseBase = compress * 0.25 + 1
  const cleanse = multGet(m.mults, 'miningPickaxeCraftingQuality', cleanseBase, m.resin * 0.25 + 1)
  const purity = impurity / cleanse > 1 ? Math.pow(0.5, impurity / cleanse) : 1 - impurity / cleanse / 2

  return {
    baseQuality: quality,
    alloying,
    impurity,
    cleanse: cleanseBase,
    quality: multGet(m.mults, 'miningPickaxeCraftingPower', quality * (m.resin * 0.3 + 1) * alloying),
    purity,
  }
}

export function pickaxeCost(m: MiningState): Price {
  const price: Price = {}
  const oreQuality = multGet(m.mults, 'miningOreQuality')
  for (const elem of m.ingredientList) {
    if (price[elem.name] === undefined) {
      price[elem.name] = 0
    }
    price[elem.name] += Math.pow(C.CRAFTING_COMPRESSION, elem.compress) / oreQuality
  }
  if (m.resin > 0) {
    price.resin = m.resin
  }
  return price
}

export function pickaxeCanAfford(m: MiningState): boolean {
  return canAfford(m, pickaxeCost(m))
}

/** 本次锻造能提升镐子威力的概率（0~1）。 */
export function pickaxeUpgradeChance(m: MiningState): number {
  const stats = pickaxeStats(m)
  if (stats.quality <= m.pickaxePower) {
    return 0
  }
  if (stats.quality * stats.purity >= m.pickaxePower) {
    return 1
  }
  const rngNeeded = (m.pickaxePower / stats.quality - stats.purity) / (1 - stats.purity)
  return (Math.pow(2, (1 - rngNeeded) * logBase(1 / stats.purity + 1, 2)) - 1) * stats.purity
}

/** 当前可用的锻造槽位数。 */
export function craftingSlots(m: MiningState): number {
  return Math.round(multGet(m.mults, 'miningPickaxeCraftingSlots'))
}

/* ── 增强 ── */

export function enhancementBarsNeeded(m: MiningState): number {
  if (m.enhancementIngredient === null) {
    return 0
  }
  return C.ENHANCEMENT_BARS + C.ENHANCEMENT_INCREMENT * (m.enhancement[m.enhancementIngredient] ?? 0)
}

export function enhancementMax(m: MiningState): number {
  return Math.round(multGet(m.mults, 'miningEnhancementMax'))
}

/* ── 信标 ── */

/** 覆盖 `depth` 层的信标（取放置深度最大的那个）。 */
export function depthBeacon(m: MiningState, depth: number): MiningBeaconId | null {
  if (m.subfeature !== 0) {
    return null
  }
  let beacon: MiningBeaconId | null = null
  let beaconLevel = 0
  for (const key in m.beaconPlaced) {
    const level = parseInt(key, 10)
    const name = m.beaconPlaced[key]
    const def = MINING_BEACONS.find((b) => b.id === name)
    if (def === undefined) {
      continue
    }
    if (depth >= level && depth <= level + def.range - 1 && level > beaconLevel) {
      beacon = def.id
      beaconLevel = level
    }
  }
  return beacon
}

export function currentDepthBeacon(m: MiningState): MiningBeaconId | null {
  return depthBeacon(m, m.depth)
}

export function beaconOwned(m: MiningState, id: MiningBeaconId): number {
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

/* ── 杂项 ── */

/** 序列和，用于 UI 展示部分升级的档位效果。 */
export function sequenceOf(base: number, pos: number): number {
  return getSequence(base, pos)
}

export function oreDefs(): typeof MINING_ORES {
  return MINING_ORES
}

export function oreDef(id: MiningOreId) {
  const def = MINING_ORES.find((o) => o.id === id)
  if (def === undefined) throw new Error(`未知矿石：${id}`)
  return def
}

export function hasMult(mults: MultMap, name: string): boolean {
  return mults[name] !== undefined
}
