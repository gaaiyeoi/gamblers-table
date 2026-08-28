/**
 * 采矿成就（1:1 移植 `js/modules/mining/achievement.js`）。
 *
 * 两条关键语义：
 * 1. 等级从 0 起，满足 `value >= milestones(level)` 就 +1，直到 `cap`（默认 20）。
 * 2. `reward[level]` / `relic[level]` 是在**升入该级之前**的等级上判定的，
 *    即 `reward[0]` 表示「刚达到 milestones(0) 时发放」。
 *
 * 成就奖励是「跨转生保留升级（keepUpgrade）」的**唯一正确来源**——
 * 之前把 keepUpgrade 写在升级定义上是错的。
 */

import { splicedLinear } from '../math'
import type { MiningState } from '../state/gameState'
import { statTotal } from '../mechanics/mining/stats'

export type MiningAchievementId =
  | 'maxDepth0'
  | 'maxDepth1'
  | 'maxDepthSpeedrun'
  | 'maxDamage'
  | 'scrap'
  | 'oreTotal'
  | 'oreVariety'
  | 'depthDwellerCap0'
  | 'depthDwellerCap1'
  | 'coal'
  | 'enhancementHighest'
  | 'resin'
  | 'gasTotal'
  | 'smoke'
  | 'craftingWasted'
  | 'dwellerCapHit'
  | 'craftingLuck'

/** 成就奖励条目。 */
export interface MiningAchievementReward {
  /** 升级 id（`mining_` 前缀已去掉）。 */
  name: string
  /** `keepUpgrade` = 跨转生保留该升级；`relic` = 发现遗物。 */
  type: 'keepUpgrade' | 'relic'
  value: number | boolean
}

export interface MiningAchievement {
  id: MiningAchievementId
  /** 当前指标值。 */
  value: (m: MiningState) => number
  /** 初始值：低于此值则该成就不展示。 */
  default: number
  /** 等级上限，默认 20。 */
  cap: number
  /** 升入第 `lvl+1` 级所需的值。 */
  milestones: (lvl: number) => number
  /** 各等级的奖励。 */
  reward?: Partial<Record<number, MiningAchievementReward[]>>
  /** 秘密成就：未达成前不展示。 */
  secret?: boolean
  /** 展示格式。 */
  display?: 'number' | 'boolean'
}

/** 9 种矿石的 stat 名。 */
const ORE_STAT_NAMES = [
  'oreAluminium',
  'oreCopper',
  'oreTin',
  'oreIron',
  'oreTitanium',
  'orePlatinum',
  'oreIridium',
  'oreOsmium',
  'oreLead',
]

/** 12 种稀有掉落 + 6 种气体，用于「种类数」统计。 */
const VARIETY_STAT_NAMES = [
  ...ORE_STAT_NAMES,
  'granite',
  'salt',
  'coal',
  'sulfur',
  'niter',
  'obsidian',
  'deeprock',
  'glowshard',
  'limestone',
  'moonshard',
  'phosphorus',
  'helium',
  'neon',
  'argon',
  'krypton',
  'xenon',
  'radon',
]

/** 6 种气体的「历史最大持有量」stat 名。 */
const GAS_MAX_STAT_NAMES = [
  'heliumMax',
  'neonMax',
  'argonMax',
  'kryptonMax',
  'xenonMax',
  'radonMax',
]

function sumTotals(m: MiningState, names: string[]): number {
  let sum = 0
  for (const name of names) {
    sum += statTotal(m, name)
  }
  return sum
}

export const MINING_ACHIEVEMENTS: readonly MiningAchievement[] = [
  {
    id: 'maxDepth0',
    value: (m) => statTotal(m, 'maxDepth0'),
    default: 1,
    cap: 20,
    milestones: (lvl) => lvl * 25 + 25,
  },
  {
    id: 'maxDepth1',
    value: (m) => statTotal(m, 'maxDepth1'),
    default: 1,
    cap: 20,
    milestones: (lvl) => (lvl > 0 ? lvl * 20 : 10),
  },
  {
    id: 'maxDepthSpeedrun',
    value: (m) => statTotal(m, 'maxDepthSpeedrun'),
    default: 1,
    cap: 10,
    milestones: (lvl) => (lvl > 0 ? lvl * 10 + 10 : 15),
    reward: {
      1: [{ name: 'depthDweller', type: 'keepUpgrade', value: true }],
      2: [{ name: 'compressor', type: 'keepUpgrade', value: true }],
      3: [{ name: 'oreSlots', type: 'keepUpgrade', value: true }],
      5: [{ name: 'graniteHardening', type: 'keepUpgrade', value: true }],
      9: [{ name: 'oreWashing', type: 'keepUpgrade', value: true }],
    },
  },
  {
    id: 'maxDamage',
    value: (m) => statTotal(m, 'maxDamage'),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(80_000, lvl) * 10_000,
    reward: {
      3: [{ name: 'hullbreaker', type: 'keepUpgrade', value: true }],
      6: [{ name: 'bronzeCache', type: 'keepUpgrade', value: true }],
    },
  },
  {
    id: 'scrap',
    value: (m) => statTotal(m, 'scrap'),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(8000, lvl) * 5e6,
    reward: {
      3: [
        { name: 'aluminiumExpansion', type: 'keepUpgrade', value: true },
        { name: 'copperExpansion', type: 'keepUpgrade', value: true },
      ],
      4: [{ name: 'tinCache', type: 'keepUpgrade', value: true }],
    },
  },
  {
    id: 'oreTotal',
    value: (m) => sumTotals(m, ORE_STAT_NAMES),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(10, lvl) * 100,
    reward: {
      2: [
        { name: 'aluminiumCache', type: 'keepUpgrade', value: true },
        { name: 'aluminiumHardening', type: 'keepUpgrade', value: true },
      ],
      3: [{ name: 'copperCache', type: 'keepUpgrade', value: true }],
      4: [
        { name: 'aluminiumTanks', type: 'keepUpgrade', value: true },
        { name: 'aluminiumAnvil', type: 'keepUpgrade', value: true },
      ],
      5: [
        { name: 'magnet', type: 'keepUpgrade', value: true },
        { name: 'warehouse', type: 'keepUpgrade', value: true },
      ],
      6: [
        { name: 'titaniumExpansion', type: 'keepUpgrade', value: true },
        { name: 'titaniumCache', type: 'keepUpgrade', value: true },
      ],
    },
  },
  {
    id: 'oreVariety',
    value: (m) => {
      let count = 0
      for (const name of VARIETY_STAT_NAMES) {
        if (statTotal(m, name) > 0) {
          count += 1
        }
      }
      return count
    },
    default: 0,
    cap: 20,
    milestones: (lvl) => splicedLinear(1, 2, 8, lvl) + 2,
    reward: {
      1: [{ name: 'copperTanks', type: 'keepUpgrade', value: true }],
      3: [{ name: 'refinery', type: 'keepUpgrade', value: true }],
      5: [
        { name: 'ironExpansion', type: 'keepUpgrade', value: true },
        { name: 'ironHardening', type: 'keepUpgrade', value: true },
        { name: 'ironFilter', type: 'keepUpgrade', value: true },
      ],
    },
  },
  {
    id: 'depthDwellerCap0',
    value: (m) => statTotal(m, 'depthDwellerCap0'),
    default: 0,
    cap: 10,
    milestones: (lvl) => lvl * 10 + (lvl === 0 ? 5 : 0),
    reward: {
      0: [{ name: 'craftingStation', type: 'keepUpgrade', value: true }],
      9: [{ name: 'drillFuel', type: 'keepUpgrade', value: true }],
    },
  },
  {
    id: 'depthDwellerCap1',
    value: (m) => statTotal(m, 'depthDwellerCap1'),
    default: 0,
    cap: 10,
    milestones: (lvl) => lvl * 10 + (lvl === 0 ? 5 : 0),
  },
  {
    id: 'coal',
    value: (m) => statTotal(m, 'coal'),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(2.5, lvl) * 100,
    reward: {
      2: [{ name: 'furnace', type: 'keepUpgrade', value: true }],
    },
  },
  {
    id: 'enhancementHighest',
    value: (m) => statTotal(m, 'enhancementHighest'),
    default: 0,
    cap: 5,
    milestones: (lvl) => (lvl + 1) * 2,
  },
  {
    id: 'resin',
    value: (m) => statTotal(m, 'resin'),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(2, lvl) * 50,
    reward: {
      3: [{ name: 'honeyPot', type: 'relic', value: true }],
    },
  },
  {
    id: 'gasTotal',
    value: (m) => {
      let sum = 0
      for (const name of GAS_MAX_STAT_NAMES) {
        const v = statTotal(m, name)
        sum += v < 1 ? 0 : Math.floor(Math.log10(v))
      }
      return sum
    },
    default: 0,
    cap: 20,
    milestones: (lvl) => (lvl + 1) * 4,
  },
  {
    id: 'smoke',
    value: (m) => statTotal(m, 'smokeMax'),
    default: 0,
    cap: 20,
    milestones: (lvl) => Math.pow(64, lvl) * 100,
  },
  {
    id: 'craftingWasted',
    value: (m) => statTotal(m, 'craftingWasted'),
    default: 0,
    cap: 1,
    milestones: () => 1,
    secret: true,
    display: 'boolean',
  },
  {
    id: 'dwellerCapHit',
    value: (m) => statTotal(m, 'dwellerCapHit'),
    default: 0,
    cap: 1,
    milestones: () => 1,
    secret: true,
    display: 'boolean',
  },
  {
    id: 'craftingLuck',
    value: (m) => statTotal(m, 'craftingLuck'),
    default: 1,
    cap: 1,
    milestones: () => 1e6,
    secret: true,
  },
]

const ACHIEVEMENT_MAP: Record<string, MiningAchievement> = {}
for (const def of MINING_ACHIEVEMENTS) {
  ACHIEVEMENT_MAP[def.id] = def
}

export function miningAchievementOf(id: MiningAchievementId): MiningAchievement {
  const def = ACHIEVEMENT_MAP[id]
  if (def === undefined) {
    throw new Error(`unknown mining achievement: ${id}`)
  }
  return def
}

/** 计算成就等级：从 0 起累加满足里程碑的次数，受 cap 限制。 */
export function achievementLevel(m: MiningState, id: MiningAchievementId): number {
  const def = miningAchievementOf(id)
  const value = def.value(m)
  let lvl = 0
  while (lvl < def.cap && value >= def.milestones(lvl)) {
    lvl += 1
  }
  return lvl
}

/** 是否已达成（等级 > 0）。 */
export function achievementDone(m: MiningState, id: MiningAchievementId): boolean {
  return achievementLevel(m, id) > 0
}

/** 是否应当展示：秘密成就达成前隐藏，未超过初始值的不展示。 */
export function achievementVisible(m: MiningState, def: MiningAchievement): boolean {
  if (def.secret === true && achievementLevel(m, def.id) <= 0) {
    return false
  }
  return achievementLevel(m, def.id) > 0 || def.value(m) > def.default
}

/** 升到当前等级为止累积获得的所有奖励（含 relic 发现）。 */
export function achievementRewards(
  m: MiningState,
  id: MiningAchievementId,
): MiningAchievementReward[] {
  const def = miningAchievementOf(id)
  const lvl = achievementLevel(m, id)
  const out: MiningAchievementReward[] = []
  for (let i = 0; i < lvl; i += 1) {
    const rewards = def.reward?.[i]
    if (rewards !== undefined) {
      out.push(...rewards)
    }
  }
  return out
}
