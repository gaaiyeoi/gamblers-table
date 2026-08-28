import Decimal from 'break_infinity.js'

import { D0 } from '../math'
import {
  MINING_BEACONS,
  MINING_CONSTANTS,
  MINING_SMELTERY,
  createMiningMultDefs,
} from '../data/mining'
import { createMults, type MultMap } from '../mechanics/mining/mults'
import { CURRENT_SCHEMA_VERSION } from './schema'

const C = MINING_CONSTANTS

/** 熔炼产线运行时状态。 */
export interface MiningSmelteryState {
  /** 当前这一炉的进度（0~1）。 */
  progress: number
  /** 待产出的数量。 */
  stored: number
  /** 本条产线累计投料次数（决定价格与时间成本）。 */
  total: number
  /** 产线定义中的基础耗时。 */
  timeNeeded: number
  /** 产线定义中的最低温度。 */
  minTemperature: number
}

/** 锻造槽位中的一份矿石。 */
export interface MiningIngredientSlot {
  /** 矿石 id（如 `oreAluminium`）。 */
  name: string
  /** 压缩等级。 */
  compress: number
}

/**
 * 采矿状态 —— 1:1 对应 Gooboo `store/mining.js` 的 state。
 * 数值一律用 `number`（Gooboo 原始实现即如此，上限为 IEEE 754 双精度）。
 */
export interface MiningState {
  /** 当前子模式：0 = 普通矿，1 = 气态。 */
  subfeature: 0 | 1
  /** 当前深度层（从 1 开始）。 */
  depth: number
  /** 子模式 0 的历史最大深度（升级解锁与居民上限依据）。 */
  maxDepth0: number
  /** 子模式 1 的历史最大深度。 */
  maxDepth1: number

  /** 深度居民（子模式 0）—— 转生资源，随时间累积。 */
  depthDweller0: number
  /** 子模式 0 的居民历史峰值（决定水晶产出档位）。 */
  depthDwellerCap0: number
  depthDweller1: number
  depthDwellerCap1: number

  /** 当前层剩余耐久。 */
  durability: number
  /** 镐子威力（伤害基数）。 */
  pickaxePower: number
  /** 锻造槽位。 */
  ingredientList: MiningIngredientSlot[]
  /** 每层的累计击碎次数（下标 = depth - 1）。 */
  breaks: number[]
  /** 树脂（锻造消耗品）。 */
  resin: number
  /** 插了火把的深度层。 */
  torchDepths: number[]

  /** 7 条熔炼产线。 */
  smeltery: Record<string, MiningSmelteryState>
  /** 7 种锭增强等级。 */
  enhancement: Record<string, number>
  /** 当前选择要增强的锭。 */
  enhancementIngredient: string | null
  /** 增强效果总开关。 */
  enhancementsActive: boolean
  /** 历史最高增强等级。 */
  enhancementHighest: number

  /** 4 种信标的等级。 */
  beacon: Record<string, number>
  /** 已放置的信标（深度 → 信标 id）。 */
  beaconPlaced: Record<number, string>
  /** 信标移除冷却（秒）。 */
  beaconCooldown: number

  /** 辉光碎片的额外深度门槛（成就奖励）。 */
  glowshardLimit: number

  /** 全部采矿货币持有量。 */
  currency: Record<string, number>

  // ── 卡牌 ──
  /** 各卡持有量（id → 数量）。 */
  cards: Record<number, number>
  /** 已发现的 shiny 卡。 */
  cardFoundShiny: Record<number, boolean>
  /** 待激活的选择（未超出上限前不生效）。 */
  cardSelected: number[]
  /** 当前生效的卡。 */
  cardEquipped: number[]
  /** 遗物之力（active 技能的消耗品，随时间自然累积）。 */
  relicPower: number
  /** 已发现的探险笔记深度列表（按深度升序）。 */
  discoveredNotes: number[]
  /** 常规升级等级。 */
  upgrades: Record<string, number>
  /** 声望升级等级。 */
  prestigeUpgrades: Record<string, number>
  /** Premium 升级等级（gem_ruby 购买，跨转生保留）。 */
  premiumUpgrades: Record<string, number>

  /** 乘区表（运行时派生，重建自上面各项）。 */
  mults: MultMap
  /** `keepUpgrade` 标记：转生时保留的常规升级。 */
  keepUpgrades: Record<string, boolean>
  /** `uncapUpgrade` 标记：解除等级上限的升级。 */
  uncappedUpgrades: Record<string, boolean>
  /** 解锁位。 */
  unlocks: Record<string, { see: boolean; use: boolean }>

  /**
   * 自动下潜阈值：击碎新层后，若下一层可在 N 秒内击碎则自动前进。
   * Gooboo 的 `progressMining` 默认为 null（→ 0），即默认**不**自动下潜，需手动导航。
   */
  autoProgress: number
  /**
   * 自动购买升级开关（**本项目扩展，Gooboo 无此功能**）。
   * 默认关闭，关闭时行为与 Gooboo 完全一致。
   */
  autoBuyUpgrades: boolean
  /** 自动购买的执行间隔累加器（秒）。 */
  autoBuyAccumulator: number
  /** 未满 1 秒的时间累积（秒）。 */
  tickAccumulator: number

  // ── 统计 ──
  /**
   * 统计双轨：`value` 转生清零，`total` 永不重置。
   * 成就与全局等级只认 `total`。
   */
  stats: {
    value: Record<string, number>
    total: Record<string, number>
  }
  timeSpent: number
  totalDamage: number
  maxDamage: number
  craftingCount: number
  craftingWasted: number
  craftingLuck: number
  prestigeCount: number
  bestPrestige0: number
  bestPrestige1: number
}

/** 转生状态。 */
export interface PrestigeState {
  /** 当前已解锁的最高转生层。 */
  tier: number
  /** 各层转生硬通货（tier1~tier4 对应的 currency id -> 数量）。 */
  currency: Record<string, Decimal>
}

/** 自动化脚本运行状态。 */
export interface AutomatorState {
  enabled: boolean
  script: string
  lastActionAt: number
}

/** 事件日志条目（type 为可选字段，旧存档没有时按 info 渲染）。 */
export interface EventEntry {
  id: number
  time: string
  msg: string
  /** 事件性质：成功/提示/警告/失败，决定事件流里的配色。 */
  type?: 'info' | 'success' | 'warn' | 'error'
}

/** 统计状态。 */
export interface StatsState {
  totalEarned: Decimal
}

/**
 * 可序列化游戏状态。核心设计：全部状态集中一处、可 JSON 序列化（Decimal 经 serializer 转字符串）。
 * 采矿为唯一经济：废料/矿石 → 升级树；深度居民 → 水晶 → 声望升级。
 */
export interface GameState {
  schemaVersion: number
  /** 基础资源：现金（由采矿产出）。 */
  cash: Decimal
  /** 采矿状态（掘金矿场）。 */
  mining: MiningState
  /** 转生状态。 */
  prestige: PrestigeState
  /** 全局解锁位。 */
  unlockFlags: string[]
  /** 自动化脚本运行状态。 */
  automator: AutomatorState
  /** 统计。 */
  stats: StatsState
  /** 事件日志（最近 50 条）。 */
  eventLog: EventEntry[]
}

/** 创建一份全新的采矿状态。 */
export function createMiningState(): MiningState {
  const smeltery: Record<string, MiningSmelteryState> = {}
  for (const def of MINING_SMELTERY) {
    smeltery[def.id] = {
      progress: 0,
      stored: 0,
      total: 0,
      timeNeeded: def.timeNeeded,
      minTemperature: def.minTemperature,
    }
  }
  const enhancement: Record<string, number> = {}
  for (const def of MINING_SMELTERY) {
    enhancement[def.output] = 0
  }
  const beacon: Record<string, number> = {}
  for (const id of MINING_BEACONS) {
    beacon[id.id] = 0
  }

  return {
    subfeature: 0,
    depth: 1,
    maxDepth0: 1,
    maxDepth1: 1,
    depthDweller0: 0,
    depthDwellerCap0: 0,
    depthDweller1: 0,
    depthDwellerCap1: 0,
    durability: 0,
    pickaxePower: C.PICKAXE_POWER_BASE,
    ingredientList: [],
    breaks: [],
    resin: 0,
    torchDepths: [],
    smeltery,
    enhancement,
    enhancementIngredient: null,
    enhancementsActive: true,
    enhancementHighest: 0,
    beacon,
    beaconPlaced: {},
    beaconCooldown: 0,
    glowshardLimit: 0,
    currency: {},
    upgrades: {},
    prestigeUpgrades: {},
    premiumUpgrades: {},
    cards: {},
    cardFoundShiny: {},
    cardSelected: [],
    relicPower: 0,
    discoveredNotes: [],
    cardEquipped: [],
    mults: createMults(createMiningMultDefs()),
    keepUpgrades: {},
    uncappedUpgrades: {},
    unlocks: {},
    autoProgress: 0,
    autoBuyUpgrades: false,
    autoBuyAccumulator: 0,
    tickAccumulator: 0,
    stats: { value: {}, total: {} },
    timeSpent: 0,
    totalDamage: 0,
    maxDamage: 0,
    craftingCount: 0,
    craftingWasted: 0,
    craftingLuck: 1,
    prestigeCount: 0,
    bestPrestige0: 0,
    bestPrestige1: 0,
  }
}

/** 创建一份全新的默认存档。 */
export function createDefaultGameState(): GameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cash: D0,
    mining: createMiningState(),
    prestige: {
      tier: 1,
      currency: {},
    },
    unlockFlags: [],
    automator: {
      enabled: false,
      script: '',
      lastActionAt: 0,
    },
    stats: {
      totalEarned: D0,
    },
    eventLog: [],
  }
}
