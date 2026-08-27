import Decimal from 'break_infinity.js'

import type { GameState } from './gameState'

/** 当前存档版本号。每次新增/变更字段结构时 +1 并补充迁移函数。 */
export const CURRENT_SCHEMA_VERSION = 3

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
