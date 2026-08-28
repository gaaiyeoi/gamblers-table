import {
  MINING_CONSTANTS,
  SECONDS_PER_HOUR,
  type MiningGasId,
  type MiningRareEarthId,
  type SmelteryId,
} from '../../data/mining'
import { smelteryOf } from '../../data/mining'
import { noteAtDepth } from '../../data/miningNotes'
import { digitSum, isPrime, logBase } from '../../math'
import type { MiningState } from '../../state/gameState'
import {
  currentBreaks,
  currentDamage,
  currentDurability,
  currentGas,
  currentHitsNeeded,
  currentOre,
  currentScrap,
  currentSmoke,
  depthHitsNeeded,
  depthOre,
  dwellerLimit,
  enhancementLevel,
  gainCurrency,
  hitsNeeded,
  miningDamage,
  rareDropFinal,
  smelteryTimeNeeded,
} from './core'
import { autoBuyUpgrades } from './actions'
import { applyCurrencyMults, rebuildMults } from './effects'
import { currentToughness } from './core'
import { multGet } from './mults'
import { statIncreaseTo } from './stats'

/** 自动升级的执行间隔（秒）。 */
const AUTO_BUY_INTERVAL_SECONDS = 10

/** 遗物之力每秒自然累积量（本项目简化：Gooboo 由 glyph 挖掘产生）。 */
const RELIC_POWER_RATE = 0.1
/** 遗物之力上限。 */
const RELIC_POWER_MAX = 100

/** Speedrun 成就的时间窗口（秒）：本次转生内 15 分钟。 */
const SPEEDRUN_TIME_LIMIT = 900

/**
 * 采矿主循环 —— 1:1 移植自 Gooboo `js/modules/mining.js` 的 `tick()` 与 `awardLoot()`。
 *
 * 核心语义：
 * - 每秒对当前层造成 1 次伤害（`damage - toughness`）
 * - 耐久归零即击碎一次；**在已挖到过的层**（depth < maxDepth）**不击碎也有收益**（`loots`）
 * - 只有最新层击碎才会推进 `maxDepth`
 */

const C = MINING_CONSTANTS

/** 防止极端数值下死循环的保险丝。 */
const MAX_LOOPS_PER_TICK = 100_000

function discoverNote(m: MiningState, depth: number): void {
  const note = noteAtDepth(depth)
  if (note === undefined || m.discoveredNotes.includes(depth)) {
    return
  }
  m.discoveredNotes.push(depth)
}

function addBreaks(m: MiningState, depth: number, amount: number): void {
  while (m.breaks.length < depth) {
    m.breaks.push(0)
  }
  m.breaks[depth - 1] = (m.breaks[depth - 1] ?? 0) + amount
}

function updateDwellerStat(m: MiningState): void {
  const limit = dwellerLimit(m)
  if (m.subfeature === 0) {
    m.depthDwellerCap0 = Math.max(m.depthDwellerCap0, Math.min(m.depthDweller0, limit))
  } else {
    m.depthDwellerCap1 = Math.max(m.depthDwellerCap1, Math.min(m.depthDweller1, limit))
  }
}

/** 结算一次掉落。`breaks` 为击碎次数，`loots` 为未击碎的拾取次数，`hits` 为总命中数。 */
function awardLoot(m: MiningState, breaks: number, loots: number, hits: number): void {
  const gotLoot = breaks > 0 || loots > 0
  if (gotLoot) {
    for (const key in currentOre(m)) {
      const entry = currentOre(m)[key]
      gainCurrency(m, key, entry.amount * (C.ORE_BREAK * breaks + loots))
    }
    gainCurrency(m, 'scrap', currentScrap(m) * (C.SCRAP_BREAK * breaks + loots))
    const smokeGain = currentSmoke(m) * (C.SMOKE_BREAK * breaks + loots)
    if (smokeGain > 0) {
      gainCurrency(m, 'smoke', smokeGain)
    }
  }

  const depth = m.depth
  const existingBreaks = currentBreaks(m)
  const totalBreaks = existingBreaks + breaks

  if (m.subfeature === 0) {
    // 花岗岩：按击碎数跨越 10 的幂次时叠加对数倍率
    if (gotLoot && depth >= C.GRANITE_DEPTH && totalBreaks >= 1000) {
      let breaksMult = 0
      let cursor = existingBreaks
      while (cursor < totalBreaks) {
        const breaksBase = cursor > 0 ? Math.floor(Math.log10(cursor)) : -1
        const adds = Math.min(totalBreaks - cursor, Math.pow(10, breaksBase + 1) - cursor)
        cursor += adds
        if (breaksBase >= 3) {
          breaksMult += adds * Math.pow(2, breaksBase - 3)
        }
      }
      breaksMult =
        breaks > 0 ? breaksMult / breaks : Math.pow(2, Math.floor(Math.log10(existingBreaks)) - 3)
      gainCurrency(
        m,
        'granite',
        rareDropFinal(m, 'granite') * (C.RARE_DROP_BREAK * breaks + loots) * breaksMult,
      )
    }

    // 盐：当层只有一种矿，或该层插了火把
    const depthOres = Object.keys(depthOre(m, depth, true)).length
    if (gotLoot && depth >= C.SALT_DEPTH && (depthOres === 1 || m.torchDepths.includes(depth))) {
      gainCurrency(
        m,
        'salt',
        rareDropFinal(m, 'salt') *
          (depthOres === 1 ? 1 : 0.5) *
          (C.RARE_DROP_BREAK * breaks + loots),
      )
    }

    // 煤：当层首次击碎
    if (depth >= C.COAL_DEPTH && existingBreaks === 0 && breaks > 0) {
      gainCurrency(m, 'coal', rareDropFinal(m, 'coal'))
    }

    // 硫：当层首次击碎（按实际命中数计）
    if (depth >= C.SULFUR_DEPTH && existingBreaks === 0 && hits > loots) {
      gainCurrency(m, 'sulfur', rareDropFinal(m, 'sulfur') * (hits - loots))
    }

    // 硝石：击碎数每跨过一个 10 的幂次
    if (depth >= C.NITER_DEPTH && breaks > 0) {
      let breaksMult = 0
      let cursor = existingBreaks
      while (cursor < totalBreaks) {
        const breaksBase = cursor > 0 ? Math.floor(Math.log10(cursor)) : -1
        const nextStep = Math.pow(10, breaksBase + 1)
        cursor = Math.min(totalBreaks, nextStep)
        if (cursor === nextStep) {
          breaksMult += 1
        }
      }
      gainCurrency(m, 'niter', rareDropFinal(m, 'niter') * breaksMult)
    }

    // 黑曜石：仅在无增强（或增强关闭）时产出
    if (gotLoot && depth >= C.OBSIDIAN_DEPTH && (enhancementLevel(m) <= 0 || !m.enhancementsActive)) {
      gainCurrency(m, 'obsidian', rareDropFinal(m, 'obsidian') * (C.RARE_DROP_BREAK * breaks + loots))
    }

    // 深岩：深度各位数字和 ≥ 14
    if (gotLoot && depth >= C.DEEPROCK_DEPTH && digitSum(depth) >= 14) {
      gainCurrency(m, 'deeprock', rareDropFinal(m, 'deeprock') * (C.RARE_DROP_BREAK * breaks + loots))
    }
    // 注：辉光碎片（glowshard）在 Gooboo 中不由此处产出，而是成就奖励，故这里不发。
  }

  if (m.subfeature === 1) {
    if (gotLoot && isPrime(depth)) {
      gainCurrency(
        m,
        'limestone',
        rareDropFinal(m, 'limestone') * (C.RARE_DROP_BREAK * breaks + loots),
      )
    }
    if (gotLoot && depth >= C.MOONSHARD_DEPTH && m.depthDwellerCap1 >= depth) {
      gainCurrency(
        m,
        'moonshard',
        rareDropFinal(m, 'moonshard') * (C.RARE_DROP_BREAK * breaks + loots),
      )
    }
    if (gotLoot && depth >= C.PHOSPHORUS_DEPTH && depth % 25 === 0) {
      gainCurrency(
        m,
        'phosphorus',
        rareDropFinal(m, 'phosphorus') * (C.RARE_DROP_BREAK * breaks + loots),
      )
    }
  }

  if (breaks > 0) {
    addBreaks(m, m.depth, breaks)
  }
}

/** 熔炼产线推进：按温度与堆叠成本逐条产出锭。 */
function tickSmeltery(m: MiningState, seconds: number): void {
  for (const key in m.smeltery) {
    const line = m.smeltery[key]
    if (line === undefined || line.stored <= 0) {
      continue
    }
    let secondsLeft = seconds
    let bars = 0
    let progress = line.progress
    let timeNeeded = smelteryTimeNeeded(m, key as SmelteryId)
    while (secondsLeft > 0 && bars < line.stored) {
      if (secondsLeft >= timeNeeded * (1 - progress)) {
        bars += 1
        secondsLeft -= timeNeeded * (1 - progress)
        progress = 0
      } else {
        progress += secondsLeft / timeNeeded
        secondsLeft = 0
      }
      timeNeeded *= C.SMELTERY_TIME_INCREMENT
    }
    if (bars > 0) {
      line.stored -= bars
      gainCurrency(m, smelteryOf(key as SmelteryId).output, bars)
    }
    line.progress = progress
  }
}

/** 深度居民累积：向 `dwellerLimit` 逼近，达到后可 overcap（递减收益）。 */
function tickDweller(m: MiningState, seconds: number): void {
  if (m.unlocks.miningDepthDweller?.use !== true) {
    return
  }
  const sf = m.subfeature
  const dwellerKey = sf === 0 ? 'depthDweller0' : 'depthDweller1'
  const capKey = sf === 0 ? 'depthDwellerCap0' : 'depthDwellerCap1'
  const limit = dwellerLimit(m)
  const speed = multGet(m.mults, 'miningDepthDwellerSpeed') / limit
  let timeLeft = seconds

  if (m[capKey] < limit) {
    const newDweller = Math.min(
      C.DWELLER_OVERFLOW +
        limit -
        (C.DWELLER_OVERFLOW + limit - m[dwellerKey]) * Math.pow(1 - speed, seconds),
      limit,
    )
    if (newDweller >= limit) {
      const until = timeUntilNextSafe(m, limit)
      timeLeft -= until === null ? 0 : Math.ceil(until)
    } else {
      timeLeft = 0
    }
    m[dwellerKey] = Math.max(m[dwellerKey], newDweller)
    m[capKey] = Math.max(m[capKey], newDweller)
  }

  if (timeLeft > 0 && limit > 0) {
    let newDweller = m[dwellerKey]
    let dwellerProgress = speed * C.DWELLER_OVERFLOW * timeLeft
    let guard = 0
    while (dwellerProgress > 0 && guard < MAX_LOOPS_PER_TICK) {
      guard += 1
      const breakpointCount = Math.floor((10 * (newDweller + 1e-12)) / limit) - 10
      const targetAmount = ((breakpointCount + 1) / 10) * limit
      const progressMade = Math.min(
        dwellerProgress * Math.pow(C.DWELLER_OVERCAP_MULT, breakpointCount + 1),
        targetAmount,
      )
      newDweller += progressMade
      dwellerProgress -= progressMade * Math.pow(1 / C.DWELLER_OVERCAP_MULT, breakpointCount + 1)
    }
    m[dwellerKey] = Math.max(m[dwellerKey], newDweller)
  }
}

function timeUntilNextSafe(m: MiningState, amount: number): number | null {
  const limit = dwellerLimit(m)
  if (amount > limit || limit <= 0) {
    return null
  }
  const speed = multGet(m.mults, 'miningDepthDwellerSpeed') / limit
  const current = m.subfeature === 0 ? m.depthDwellerCap0 : m.depthDwellerCap1
  const num = (amount - C.DWELLER_OVERFLOW - limit) / -(C.DWELLER_OVERFLOW + limit - current)
  if (num <= 0) {
    return null
  }
  return logBase(num, 1 - speed)
}

/**
 * 推进采矿 `seconds` 秒。
 * 由主循环每帧调用（内部按秒累积，见 `accumulateMining`）。
 */
export function tickMiningSeconds(m: MiningState, seconds: number): void {
  if (!(seconds > 0)) {
    return
  }
  const sf = m.subfeature
  m.timeSpent += seconds

  // 自动升级（本项目扩展）：每 10 秒跑一轮，避免每帧扫 160 条升级
  if (m.autoBuyUpgrades) {
    m.autoBuyAccumulator += seconds
    if (m.autoBuyAccumulator >= AUTO_BUY_INTERVAL_SECONDS) {
      m.autoBuyAccumulator = 0
      autoBuyUpgrades(m, 1)
    }
  }

  if (m.beaconCooldown > 0) {
    m.beaconCooldown = Math.max(m.beaconCooldown - seconds, 0)
  }

  tickSmeltery(m, seconds)

  if (m.unlocks.miningResin?.use === true && sf === 0) {
    gainCurrency(m, 'resin', seconds * multGet(m.mults, 'currencyMiningResinGain'))
  }

  if (currentDamage(m) > 0) {
    let secondsLeft = seconds
    let guard = 0
    while (secondsLeft > 0 && guard < MAX_LOOPS_PER_TICK) {
      guard += 1
      const maxDepth = sf === 0 ? m.maxDepth0 : m.maxDepth1
      let breaks = 0
      let loots = 0
      const preHits = Math.min(secondsLeft, currentHitsNeeded(m))

      // 已挖到过的层：不击碎也能持续拾取
      if (m.depth < maxDepth) {
        loots += preHits
      }
      secondsLeft -= preHits

      const dmg = miningDamage(m)
      m.maxDamage = Math.max(m.maxDamage, dmg)
      m.totalDamage += preHits * dmg
      // 成就读取的是最终伤害（Gooboo：`stat/increaseTo mining_maxDamage = currentDamage`）
      statIncreaseTo(m, 'maxDamage', currentDamage(m))

      let newDurability = m.durability - preHits * currentDamage(m)

      if (newDurability <= 0) {
        breaks += 1
        const isLatest = maxDepth === m.depth
        if (isLatest) {
          // 首次击碎新层：补齐气体
          const gasses = currentGas(m)
          for (const key of Object.keys(gasses) as MiningGasId[]) {
            gainCurrency(m, key, gasses[key] ?? 0)
          }
          loots += 1
          if (sf === 0) {
            m.maxDepth0 = Math.max(m.maxDepth0, m.depth + 1)
            // Gooboo：notes[maxDepth0 - 1]
            discoverNote(m, m.maxDepth0 - 1)
          } else {
            m.maxDepth1 = Math.max(m.maxDepth1, m.depth + 1)
          }
          statIncreaseTo(m, `maxDepth${sf}`, m.depth + 1)
          // Speedrun：本次转生内 15 分钟（900 秒）内到达的深度
          if (sf === 0 && m.timeSpent <= SPEEDRUN_TIME_LIMIT) {
            statIncreaseTo(m, 'maxDepthSpeedrun', m.depth + 1)
          }
          updateDwellerStat(m)
        }

        if (isLatest && depthHitsNeeded(m, m.depth + 1) <= m.autoProgress) {
          awardLoot(m, breaks, loots, preHits)
          m.depth += 1
          newDurability = currentDurability(m)
          rebuildMults(m)
        } else {
          m.totalDamage += secondsLeft * dmg
          breaks += Math.floor(secondsLeft / hitsNeeded(m))
          loots += secondsLeft
          newDurability = currentDurability(m) - currentDamage(m) * (secondsLeft % hitsNeeded(m))
          awardLoot(m, breaks, loots, preHits + secondsLeft)
          secondsLeft = 0
        }
      } else {
        awardLoot(m, breaks, loots, preHits)
      }

      m.durability = newDurability
    }
  } else if (m.depth >= C.SULFUR_DEPTH && currentBreaks(m) === 0) {
    // 伤害被硬度吃光时，硫仍按秒产出
    gainCurrency(m, 'sulfur', rareDropFinal(m, 'sulfur') * seconds)
  }

  tickDweller(m, seconds)

  // 居民堆满（含 overcap）→ 秘密成就
  const dwellerNow = sf === 0 ? m.depthDweller0 : m.depthDweller1
  if (dwellerLimit(m) > 0 && dwellerNow >= dwellerLimit(m)) {
    statIncreaseTo(m, 'dwellerCapHit', 1)
  }

  // 遗物之力：随时间自然累积（active 技能消耗品）
  m.relicPower = Math.min(RELIC_POWER_MAX, m.relicPower + seconds * RELIC_POWER_RATE)

  applyCurrencyMults(m)
}

/** 帧级入口：累积毫秒，满 1 秒才推进一次（Gooboo 的 tickspeed = 1s）。 */
export function accumulateMining(m: MiningState, deltaMs: number): void {
  m.tickAccumulator += Math.max(0, deltaMs) / 1000
  let guard = 0
  while (m.tickAccumulator >= 1 && guard < MAX_LOOPS_PER_TICK) {
    guard += 1
    m.tickAccumulator -= 1
    tickMiningSeconds(m, 1)
  }
}

/** 手动切换当前层（Gooboo 的深度导航条）。 */
export function setDepth(m: MiningState, depth: number): boolean {
  const maxDepth = m.subfeature === 0 ? m.maxDepth0 : m.maxDepth1
  const target = Math.min(Math.max(1, Math.floor(depth)), maxDepth)
  if (target === m.depth) {
    return false
  }
  m.depth = target
  m.durability = currentDurability(m)
  rebuildMults(m)
  return true
}

/** 剩余稀有掉落类型，供 UI 展示。 */
export function rareDropIds(): MiningRareEarthId[] {
  return ['granite', 'salt', 'coal', 'sulfur', 'niter', 'obsidian', 'deeprock', 'glowshard']
}

export { currentToughness, SECONDS_PER_HOUR }
