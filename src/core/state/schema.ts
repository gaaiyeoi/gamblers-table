import Decimal from 'break_infinity.js'

import type { GameState } from './gameState'

/** 当前存档版本号。每次新增/变更字段结构时 +1 并补充迁移函数。 */
export const CURRENT_SCHEMA_VERSION = 8

export const migrations: Record<number, (state: GameState) => void> = {
  2: (state) => {
    state.challenge = { activeId: null, completedIds: [], opposition: new Decimal(0), failures: 0 }
    state.automator = { enabled: false, script: '', lastActionAt: 0 }
  },
  3: (state) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.stats.totalWins = (state.stats as any).totalWins ?? 0
    state.eventLog = state.eventLog ?? []
  },
  4: (state) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.stats.totalHelpersHired = (state.stats as any).totalHelpersHired ?? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.stats.totalDimensionsBought = (state.stats as any).totalDimensionsBought ?? 0
    state.levels = { completed: 0, pendingLevelId: null, dismissedLevelId: null, clickMult: new Decimal(1), incomeMult: new Decimal(1) }
  },
  5: (state) => {
    // 累计骷髅代币统计（跨转生保留，扭蛋消费不扣减）。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.stats.totalSkullTokensEarned = (state.stats as any).totalSkullTokensEarned ?? 0
  },
  6: (state) => {
    // 过关确认：给旧存档补 pendingLevelId（当前关等待确认标记）。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.levels.pendingLevelId = (state.levels as any).pendingLevelId ?? null
  },
  7: (state) => {
    // 暂缓过关：给旧存档补 dismissedLevelId（当前关已暂缓标记）。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.levels.dismissedLevelId = (state.levels as any).dismissedLevelId ?? null
  },
  8: (state) => {
    // 开局自带 1 枚铜币：旧档若 D1 从未购买，补发 1 枚（含 amount，保证桌布上有硬币可翻转）。
    const dim0 = state.dimensions[0]
    if (dim0 !== undefined && dim0.bought === 0) {
      dim0.bought = 1
      dim0.amount = dim0.amount.add(1)
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
