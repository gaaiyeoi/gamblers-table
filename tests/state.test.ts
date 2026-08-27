import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'

import { deepMerge, deepMergeAll } from '../src/core/state/deepMerge'
import { createDefaultGameState } from '../src/core/state/gameState'
import { CURRENT_SCHEMA_VERSION, migrate } from '../src/core/state/schema'
import { deserializeState, serializeState } from '../src/core/state/serializer'

describe('createDefaultGameState', () => {
  it('生成完整默认存档', () => {
    const state = createDefaultGameState()
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(state.dimensions).toHaveLength(8)
    expect(state.cash.eq(0)).toBe(true)
    expect(state.prestige.tier).toBe(1)
  })
})

describe('deepMerge', () => {
  it('补齐缺省字段', () => {
    const defaults = createDefaultGameState()
    const partial = { schemaVersion: 1 } as ReturnType<typeof createDefaultGameState>
    const merged = deepMerge(partial, defaults)
    expect(merged.dimensions).toHaveLength(8)
    expect(merged.stats.totalFlips).toBe(0)
  })

  it('存档数据覆盖默认值（标量/数组字段不丢失）', () => {
    const defaults = createDefaultGameState()
    const saved = createDefaultGameState()
    saved.cash = new Decimal(12345)
    saved.dimensions[0].bought = 7
    saved.dimensions[0].amount = new Decimal(99)
    saved.skullTokens = 5
    saved.stats.totalFlips = 42
    saved.stats.totalEarned = new Decimal(500)

    const merged = deepMergeAll(defaults, saved)
    expect(merged.cash.eq(12345)).toBe(true)
    expect(merged.dimensions[0].bought).toBe(7)
    expect(merged.dimensions[0].amount.eq(99)).toBe(true)
    expect(merged.skullTokens).toBe(5)
    expect(merged.stats.totalFlips).toBe(42)
    expect(merged.stats.totalEarned.eq(500)).toBe(true)
  })
})

describe('serializer', () => {
  it('Decimal 往返序列化', () => {
    const state = createDefaultGameState()
    state.cash = new Decimal('1.234e50')
    state.dimensions[0].amount = new Decimal(42)

    const serialized = serializeState(state) as Record<string, unknown>
    expect(typeof serialized.cash).toBe('string')

    const restored = deserializeState<ReturnType<typeof createDefaultGameState>>(serialized)
    expect(restored.cash.eq(new Decimal('1.234e50'))).toBe(true)
    expect(restored.dimensions[0].amount.eq(42)).toBe(true)
  })
})

describe('migrate', () => {
  it('旧版本存档迁移到当前版本', () => {
    const state = createDefaultGameState()
    state.schemaVersion = 1
    const migrated = migrate(state)
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    // 迁移 1 -> 2 补齐 challenge 与 automator 字段
    expect(migrated.challenge).toBeDefined()
    expect(migrated.automator).toBeDefined()
  })
})
