import Decimal from 'break_infinity.js'

import { D0, D1 } from '../math'
import { CURRENT_SCHEMA_VERSION } from './schema'

/** 单个维度（硬币/生成器）状态。 */
export interface DimensionState {
  /** 已购买数量（整数）。 */
  bought: number
  /** 强化等级：每级产出倍率 ×(1 + enhanceBonus)。 */
  enhanceLevel: number
  /** 当前数量（Decimal，累积生产）。 */
  amount: Decimal
}

/** 单个自动购买器（对应一个硬币维度）状态。 */
export interface AutobuyerState {
  /** 目标维度 tier（1 开始）。 */
  tier: number
  /** 是否启用自动购买。 */
  enabled: boolean
  /** 上次尝试购买的 tick 时间戳。 */
  lastTick: number
}

/** 助手状态。 */
export interface HelperState {
  count: number
  /** 升级等级：每级提升该助手的翻转速率。 */
  level: number
  /** 帽子外观 id（来自扭蛋机收藏）。 */
  hat: string
}

/** 转生状态。 */
export interface PrestigeState {
  /** 当前已解锁的最高转生层。 */
  tier: number
  /** 各层转生硬通货（tier1~tier4 对应的 currency id -> 数量）。 */
  currency: Record<string, Decimal>
}

/** 扭蛋机状态。 */
export interface GachaState {
  pulls: number
  /** 已收集外观 id 列表。 */
  collection: string[]
}

/** 挑战运行状态。 */
export interface ChallengeState {
  activeId: string | null
  completedIds: string[]
  opposition: Decimal
  failures: number
}

/** 自动化脚本运行状态。 */
export interface AutomatorState {
  enabled: boolean
  script: string
  lastActionAt: number
}

/** 事件日志条目。 */
export interface EventEntry {
  id: number
  time: string
  msg: string
}

/** 统计状态。 */
export interface StatsState {
  totalFlips: number
  totalWins: number
  totalEarned: Decimal
  /** 累计雇佣助手次数（跨转生保留）。 */
  totalHelpersHired: number
  /** 累计购买维度数量（跨转生保留）。 */
  totalDimensionsBought: number
  /** 累计获得骷髅代币数（跨转生保留，不随扭蛋消费扣减）。 */
  totalSkullTokensEarned: number
}

/** 任务关卡（主线）状态。 */
export interface LevelState {
  /** 已完成的关卡数（0 表示尚未完成第 1 关，等于下一关待解锁序号 - 1）。 */
  completed: number
  /** 当前关已达成目标、等待玩家确认过关的关卡 id（null 表示无需确认）。 */
  pendingLevelId: string | null
  /** 玩家选择"暂缓"的当前关 id：暂缓后本关不再自动弹确认框，直到过关/转生。 */
  dismissedLevelId: string | null
  /** 永久点击收益倍率（累乘，跨转生保留）。 */
  clickMult: Decimal
  /** 永久全局收益倍率（累乘，跨转生保留）。 */
  incomeMult: Decimal
}

/**
 * 可序列化游戏状态（对应参考项目的 window.player，但带类型 + 版本号）。
 * 核心设计：全部状态集中一处、可 JSON 序列化（Decimal 经 serializer 转字符串）。
 */
export interface GameState {
  schemaVersion: number
  /** 基础资源：现金。 */
  cash: Decimal
  /** 导数级联生产链维度 D1..Dn。 */
  dimensions: DimensionState[]
  /** 自动购买器：每个硬币维度一个独立开关（默认关闭，由玩家自行开启）。 */
  autobuyers: AutobuyerState[]
  /** 升级等级表：id -> 等级。 */
  upgrades: Record<string, number>
  /** 助手表：id -> 状态。 */
  helpers: Record<string, HelperState>
  /** 转生状态。 */
  prestige: PrestigeState
  /** 已解锁天赋 id 列表。 */
  talents: string[]
  /** 全局解锁位（机制级 QoL：autobuyer / 批量购买 / 挑战奖励等）。 */
  unlockFlags: string[]
  /** 骷髅代币（骷髅面朝上获得）。 */
  skullTokens: number
  /** 扭蛋机状态。 */
  gacha: GachaState
  /** 挑战运行状态。 */
  challenge: ChallengeState
  /** 自动化脚本运行状态。 */
  automator: AutomatorState
  /** 统计。 */
  stats: StatsState
  /** 任务关卡（主线）状态。 */
  levels: LevelState
  /** 事件日志（最近 50 条）。 */
  eventLog: EventEntry[]
}

const INITIAL_DIMENSION_COUNT = 8

/** 创建一份全新的默认存档。 */
export function createDefaultGameState(): GameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cash: D0,
    // 开局自带 1 枚铜币（D1），保证桌布上初始就有一枚可点击/翻转的硬币。
    dimensions: Array.from({ length: INITIAL_DIMENSION_COUNT }, (_, i) => ({
      bought: i === 0 ? 1 : 0,
      enhanceLevel: 0,
      amount: i === 0 ? D1 : D0,
    })),
    // 默认全部关闭：由玩家在硬币界面手动开启，避免"钱够就自动买"。
    autobuyers: Array.from({ length: INITIAL_DIMENSION_COUNT }, (_, i) => ({
      tier: i + 1,
      enabled: false,
      lastTick: 0,
    })),
    upgrades: {},
    helpers: {},
    prestige: {
      tier: 1,
      currency: {},
    },
    talents: [],
    unlockFlags: [],
    skullTokens: 0,
    gacha: {
      pulls: 0,
      collection: [],
    },
    challenge: {
      activeId: null,
      completedIds: [],
      opposition: D0,
      failures: 0,
    },
    automator: {
      enabled: false,
      script: '',
      lastActionAt: 0,
    },
    stats: {
      totalFlips: 0,
      totalWins: 0,
      totalEarned: D0,
      totalHelpersHired: 0,
      totalDimensionsBought: 0,
      totalSkullTokensEarned: 0,
    },
    levels: {
      completed: 0,
      pendingLevelId: null,
      dismissedLevelId: null,
      clickMult: D1,
      incomeMult: D1,
    },
    eventLog: [],
  }
}
