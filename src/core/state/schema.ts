import Decimal from 'break_infinity.js'

import { createMiningState, type GameState } from './gameState'

/** 当前存档版本号。每次新增/变更字段结构时 +1 并补充迁移函数。 */
export const CURRENT_SCHEMA_VERSION = 22

export const migrations: Record<number, (state: GameState) => void> = {
  15: (state) => {
    // 采矿系统：旧档补默认 MiningState。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyState = state as any
    if (anyState.mining === undefined) {
      anyState.mining = {
        depth: 1,
        wallHp: new Decimal(10),
        scrap: new Decimal(0),
        coal: new Decimal(0),
        ores: {},
        pickaxe: {},
        furnaceIngot: null,
        furnaceFill: 0,
        furnaceMax: 10,
        enhanced: false,
        hitsAtLayer: 0,
        graniteCollectedAtLayer: 0,
        lastBreakAt: 0,
        helium: new Decimal(0),
        heliumBoost: 0,
        heliumIncrement: 0,
        pickaxeLevels: 0,
        unlocked: [],
      }
    }
  },
  16: (state) => {
    // 采矿为唯一经济：剥离被移除的硬币/维度/挑战字段。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = state as any
    delete s.dimensions
    delete s.autobuyers
    delete s.upgradeToggles
    delete s.feedToggles
    delete s.skullTokens
    delete s.challenge
    if (s.stats !== undefined) {
      for (const k of ['totalFlips', 'totalWins', 'totalDimensionsBought', 'totalSkullTokensEarned']) {
        delete s.stats[k]
      }
      if (s.stats.totalEarned === undefined) s.stats.totalEarned = new Decimal(0)
    }
  },
  18: (state) => {
    // 采矿重建：迁移到新结构（9矿/升级树/声望升级/锭增强/绿水晶）。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyState = state as any
    const old = anyState.mining
    const next = old && typeof old === 'object' ? old : {}
    // 声望货币：reputation → 绿水晶
    if (anyState.prestige?.currency?.reputation !== undefined) {
      if (anyState.prestige.currency.crystalGreen === undefined) {
        anyState.prestige.currency.crystalGreen = anyState.prestige.currency.reputation
      }
      delete anyState.prestige.currency.reputation
    }
    anyState.mining = {
      depth: next.depth ?? 1,
      maxDepth: next.maxDepth ?? next.depth ?? 1,
      wallHp: next.wallHp ?? new Decimal(10),
      scrap: next.scrap ?? new Decimal(0),
      coal: next.coal ?? new Decimal(0),
      ores: next.ores ?? {},
      crystalGreen: next.crystalGreen ?? anyState.prestige?.currency?.crystalGreen ?? new Decimal(0),
      upgrades: next.upgrades ?? next.upgradeLevels ?? {},
      prestige: next.prestige ?? {},
      furnaceBar: null,
      furnaceFill: 0,
      furnaceMax: 10,
      enhanced: false,
      enhancedBar: null,
      hitsAtLayer: next.hitsAtLayer ?? 0,
      graniteCollectedAtLayer: next.graniteCollectedAtLayer ?? 0,
      lastBreakAt: next.lastBreakAt ?? 0,
      helium: next.helium ?? new Decimal(0),
      unlocked: next.unlocked ?? [],
    }
  },
  19: (state) => {
    // 移除无效天赋树字段。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = state as any
    delete s.talents
  },
  20: (state) => {
    // 气态升级：补 气态资源 与 气态升级等级 默认值。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (state as any).mining
    if (m === undefined) return
    if (m.gas === undefined) m.gas = {}
    if (m.gasUpgrades === undefined) m.gasUpgrades = {}
  },
  21: (state) => {
    // 重生进度基准：补默认值（未转生过则以当前 maxDepth 为起点）。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (state as any).mining
    if (m === undefined) return
    if (m.prestigeBaseDepth === undefined) m.prestigeBaseDepth = m.maxDepth ?? 1
  },
  22: (state) => {
    // 矿场 1:1 复刻 Gooboo：耐久/硬度/镐子锻造/深度居民/信标/7 条熔炼产线。
    // 旧 MiningState 与新版完全不兼容（ Decimal 货币 → number、wallHp → durability、
    // maxDepth → maxDepth0/1 ），因此采矿进度整体重置，其余系统保持不变。
    // 声望绿水晶从 prestige.currency 搬到 mining.currency，避免丢失。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = state as any
    const carriedGreen =
      s.mining?.crystalGreen ?? s.mining?.currency?.crystalGreen ?? s.prestige?.currency?.crystalGreen
    const fresh = createMiningState()
    if (carriedGreen !== undefined && Number(carriedGreen) > 0) {
      fresh.currency.crystalGreen = Number(carriedGreen)
    }
    s.mining = fresh
    if (s.prestige?.currency !== undefined) {
      delete s.prestige.currency.crystalGreen
    }
  },
}

export function migrate(state: GameState): GameState {
  let version = state.schemaVersion ?? 1
  while (version < CURRENT_SCHEMA_VERSION) {
    version += 1
    const patch = migrations[version]
    if (patch !== undefined) patch(state)
  }
  state.schemaVersion = CURRENT_SCHEMA_VERSION
  return state
}
