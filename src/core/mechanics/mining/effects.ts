import {
  EMBER_CURRENCY_MULT,
  GAS_CURRENCY_MULT,
  MINING_BEACONS,
  MINING_CONSTANTS,
  MINING_ENHANCEMENTS,
  MINING_GASES,
} from '../../data/mining'
import { MINING_ACHIEVEMENTS, achievementLevel } from '../../data/miningAchievements'
import {
  MINING_CARDS,
  MINING_CARD_COLLECTIONS,
  MINING_CARD_FEATURE,
  miningCardOf,
} from '../../data/miningCards'
import { MINING_PREMIUM_UPGRADES } from '../../data/miningPremiumUpgrades'
import { ALL_MINING_UPGRADES } from '../../data/miningUpgrades'
import { MINING_RELICS, relicUnlocked, type MiningRelicState } from '../../data/relics'
import type { MiningState } from '../../state/gameState'
import { cardPower, cardsCollected } from './cards'
import { currentDepthBeacon, enhancementLevel } from './core'
import { globalLevel } from './stats'
import { multSet } from './mults'

/**
 * 乘区写入层 —— 把升级 / 增强 / 信标 / 货币联动的贡献写进 mult 表。
 * 对应 Gooboo 的 `system/applyEffect` + `mult/setBase|setMult`。
 */

const C = MINING_CONSTANTS

/** 气态子模式解锁所需的全局等级（Gooboo：`meta/globalLevel >= 625`）。 */
export const GAS_SUBFEATURE_GLOBAL_LEVEL = 625

export function isUnlocked(m: MiningState, key: string, requireUse = false): boolean {
  const u = m.unlocks[key]
  if (u === undefined) {
    return false
  }
  return requireUse ? u.use : u.see
}

export function setUnlock(m: MiningState, key: string, value: boolean): void {
  const u = m.unlocks[key]
  if (u === undefined) {
    m.unlocks[key] = { see: value, use: value }
    return
  }
  u.see = u.see || value
  u.use = value
}

/* ── 单条效果的应用 ── */

function applyOne(
  m: MiningState,
  source: string,
  type: 'mult' | 'base' | 'unlock' | 'keepUpgrade' | 'uncapUpgrade',
  name: string,
  value: number | boolean | null,
): void {
  switch (type) {
    case 'mult':
      multSet(m.mults, name, 'mult', source, typeof value === 'number' ? value : null)
      break
    case 'base':
      multSet(m.mults, name, 'base', source, typeof value === 'number' ? value : null)
      break
    case 'unlock':
      setUnlock(m, name, value === true)
      break
    case 'keepUpgrade':
      m.keepUpgrades[name] = value === true
      break
    case 'uncapUpgrade':
      m.uncappedUpgrades[name] = value === true
      break
    default:
      break
  }
}

/** 清空某个来源在所有乘区里的贡献。 */
function clearSource(m: MiningState, source: string): void {
  for (const key in m.mults) {
    const item = m.mults[key]
    delete item.base[source]
    delete item.mult[source]
    delete item.bonus[source]
  }
}

/* ── 升级 ── */

function applyUpgrade(m: MiningState, id: string): void {
  const def = ALL_MINING_UPGRADES.find((u) => u.id === id)
  if (def === undefined) {
    return
  }
  const lvl = def.kind === 'prestige' ? (m.prestigeUpgrades[id] ?? 0) : (m.upgrades[id] ?? 0)
  const source = `upgrade_mining_${id}`
  clearSource(m, source)
  if (lvl <= 0) {
    return
  }
  for (const eff of def.effect) {
    applyOne(m, source, eff.type, eff.name, eff.value(lvl))
  }
}

/* ── Premium 升级（gem_ruby，跨转生保留） ── */

function applyPremium(m: MiningState, id: string): void {
  const def = MINING_PREMIUM_UPGRADES.find((u) => u.id === id)
  if (def === undefined) {
    return
  }
  const lvl = m.premiumUpgrades[id] ?? 0
  const source = `premium_${id}`
  clearSource(m, source)
  if (lvl <= 0) {
    return
  }
  for (const eff of def.effect) {
    applyOne(m, source, eff.type, eff.name, eff.value(lvl))
  }
}

/* ── 锭增强 ── */

function applyEnhancement(m: MiningState, id: string): void {
  const def = MINING_ENHANCEMENTS.find((e) => e.id === id)
  if (def === undefined) {
    return
  }
  const lvl = m.enhancement[id] ?? 0
  const source = `miningEnhancement_${id}`
  clearSource(m, source)
  if (lvl <= 0 || !m.enhancementsActive) {
    return
  }
  for (const eff of def.effect) {
    applyOne(m, source, eff.type, eff.name, eff.value(lvl))
  }
}

/* ── 信标 ── */

function applyBeaconEffects(m: MiningState): void {
  for (const def of MINING_BEACONS) {
    const source = `miningBeacon_${def.id}`
    clearSource(m, source)
  }
  const active = currentDepthBeacon(m)
  if (active === null) {
    return
  }
  const def = MINING_BEACONS.find((b) => b.id === active)
  if (def === undefined) {
    return
  }
  const lvl = m.beacon[def.id] ?? 0
  const source = `miningBeacon_${def.id}`
  for (const eff of def.effect) {
    applyOne(m, source, eff.type, eff.name, eff.value(lvl))
  }
}

/* ── 黑曜石惩罚：有增强时黑曜石产出衰减 ── */

function applyObsidianPenalty(m: MiningState): void {
  const level = enhancementLevel(m)
  const source = 'miningObsidianPenalty'
  if (level > 0) {
    multSet(
      m.mults,
      'currencyMiningObsidianGain',
      'mult',
      source,
      C.OBSIDIAN_PENALTY_BASE * Math.pow(C.OBSIDIAN_PENALTY_INCREMENT, level - 1),
    )
  } else {
    multSet(m.mults, 'currencyMiningObsidianGain', 'mult', source, null)
  }
}

/* ── 货币联动（气体 / 余烬） ── */

export function applyCurrencyMults(m: MiningState): void {
  for (const gas of MINING_GASES) {
    const source = `currencyMining_${gas}`
    const value = m.currency[gas] ?? 0
    const table = GAS_CURRENCY_MULT[gas]
    for (const name in table) {
      multSet(m.mults, name, 'mult', source, table[name](value))
    }
  }
  const emberSource = 'currencyMining_ember'
  const ember = m.currency.ember ?? 0
  for (const name in EMBER_CURRENCY_MULT) {
    multSet(m.mults, name, 'mult', emberSource, EMBER_CURRENCY_MULT[name](ember))
  }
}

/* ── 圣遗物：已发现遗物的被动效果 ── */

function applyRelics(m: MiningState): void {
  const ctx: MiningRelicState = { mining: m }
  for (const relic of MINING_RELICS) {
    const source = `relic_${relic.id}`
    clearSource(m, source)
    if (!relicUnlocked(relic, ctx)) {
      continue
    }
    for (const eff of relic.passive) {
      applyOne(m, source, eff.type, eff.name, eff.value)
    }
  }
}

/* ── 全局重建 ── */

/** 清空所有乘区贡献（保留 baseValue / group 定义）。 */
export function resetMults(m: MiningState): void {
  for (const key in m.mults) {
    const item = m.mults[key]
    item.base = {}
    item.mult = {}
    item.bonus = {}
  }
  for (const key in m.keepUpgrades) {
    delete m.keepUpgrades[key]
  }
  for (const key in m.uncappedUpgrades) {
    delete m.uncappedUpgrades[key]
  }
}

/**
 * 按当前所有来源重建乘区表。
 * 在载入存档后、购买升级 / 增强 / 放置信标后、以及每个 tick 开始时调用。
 */
export function rebuildMults(m: MiningState): void {
  resetMults(m)

  // 解锁：气态子模式（Gooboo 判据是全局等级 >= 625）
  if (globalLevel(m) >= GAS_SUBFEATURE_GLOBAL_LEVEL) {
    setUnlock(m, 'miningGasSubfeature', true)
  }
  // 解锁：高级 / 豪华卡包（跟随子模式 0 的历史最大深度）
  if (m.maxDepth0 >= 260) {
    setUnlock(m, 'miningAdvancedCardPack', true)
  }
  if (m.maxDepth0 >= 350) {
    setUnlock(m, 'miningLuxuryCardPack', true)
  }

  for (const def of ALL_MINING_UPGRADES) {
    const lvl = def.kind === 'prestige' ? (m.prestigeUpgrades[def.id] ?? 0) : (m.upgrades[def.id] ?? 0)
    if (lvl > 0 || def.persistent === true) {
      applyUpgrade(m, def.id)
    }
  }

  // Premium 升级（跨转生保留，gem_ruby 购买）
  for (const def of MINING_PREMIUM_UPGRADES) {
    const lvl = m.premiumUpgrades[def.id] ?? 0
    if (lvl > 0) {
      applyPremium(m, def.id)
    }
  }

  // keepUpgrade 的唯一来源：成就奖励（Gooboo 的 `achievementReward_*`）
  applyAchievements(m)

  // 卡牌：装备卡效果 + 卡组（feature）奖励 + 收藏集奖励
  applyCards(m)

  for (const def of MINING_ENHANCEMENTS) {
    applyEnhancement(m, def.id)
  }
  applyRelics(m)
  applyBeaconEffects(m)
  applyObsidianPenalty(m)
  applyCurrencyMults(m)
}

/**
 * 应用所有成就奖励。
 *
 * Gooboo 在 `achievement/check` 里对每一级奖励调用
 * `system/applyEffect({type, name, multKey: 'achievementReward_' + key, value})`。
 * 这里改为幂等重建：每次 rebuildMults 都把所有已达成等级的奖励重放一遍。
 */
/**
 * 应用卡牌效果。
 *
 * 对应 Gooboo `card/applyCardEffects` + `applyFeatureEffects` + 收藏集全收集奖励：
 * - 每张装备卡的效果按张数展开（mult：>=1 线性、<1 幂；base/bonus：×张数）
 * - 卡组奖励：`miningDamage` 随已收集卡数、`miningPrestigeIncome` 随 shiny 数（本项目 0）
 * - 卡力量奖励：`miningDamage`、`miningPrestigeIncome` 随卡力量
 * - 收藏集集齐：一次性奖励
 */
function applyCards(m: MiningState): void {
  const counts: Record<number, number> = {}
  for (const id of m.cardEquipped) {
    counts[id] = (counts[id] ?? 0) + 1
  }

  // 每张装备卡效果
  for (const raw of Object.keys(counts)) {
    const id = Number(raw)
    const amount = counts[id]
    const def = miningCardOf(id)
    const source = `card_${id}`
    for (const eff of def.reward ?? []) {
      if (eff.type !== 'base' && eff.type !== 'mult') {
        continue
      }
      const value =
        eff.type === 'base'
          ? eff.value * amount
          : eff.value >= 1
            ? (eff.value - 1) * amount + 1
            : Math.pow(eff.value, amount)
      multSet(m.mults, eff.name, eff.type, source, value)
    }
  }

  // 卡组奖励（基于已收集卡数）
  const collected = cardsCollected(m)
  if (collected > 0) {
    const fr = MINING_CARD_FEATURE.reward
    multSet(m.mults, fr.name, 'mult', 'cards_mining', fr.value(collected))
  }

  // 卡力量奖励
  const power = cardPower(m)
  if (power > 0) {
    for (const eff of MINING_CARD_FEATURE.powerReward) {
      multSet(m.mults, eff.name, 'mult', 'cardPower_mining', eff.value(power))
    }
  }

  // 收藏集集齐奖励
  for (const key of Object.keys(MINING_CARD_COLLECTIONS)) {
    const members = MINING_CARDS.filter((c) => c.collection === key)
    const complete = members.length > 0 && members.every((c) => (m.cards[c.id] ?? 0) > 0)
    const def = MINING_CARD_COLLECTIONS[key]
    const source = `cardCollection_${key}`
    for (const eff of def.reward ?? []) {
      multSet(m.mults, eff.name, eff.type === 'base' ? 'base' : 'mult', source, complete ? eff.value : null)
    }
  }
}

function applyAchievements(m: MiningState): void {
  for (const def of MINING_ACHIEVEMENTS) {
    const lvl = achievementLevel(m, def.id)
    for (let i = 0; i < lvl; i += 1) {
      const rewards = def.reward?.[i]
      if (rewards === undefined) continue
      for (const reward of rewards) {
        switch (reward.type) {
          case 'keepUpgrade':
            // key 与升级自带的 keepUpgrade 效果保持一致（`mining_<id>`）
            m.keepUpgrades[`mining_${reward.name}`] = true
            break
          case 'relic':
            setUnlock(m, `relic_${reward.name}`, true)
            break
          default:
            break
        }
      }
    }
  }
  // 成就等级同时作为 `miningGlowshardLimit` 的来源（辉光碎片深度门槛）
  const glowshardAchievement = achievementLevel(m, 'maxDepth0')
  if (glowshardAchievement > 0) {
    multSet(m.mults, 'miningGlowshardLimit', 'base', 'achievementReward_maxDepth0', glowshardAchievement)
  }
}
