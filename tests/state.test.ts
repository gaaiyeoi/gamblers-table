import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'

import { deepMerge, deepMergeAll } from '../src/core/state/deepMerge'
import { createDefaultGameState } from '../src/core/state/gameState'
import { CURRENT_SCHEMA_VERSION, migrate } from '../src/core/state/schema'
import { deserializeState, serializeState } from '../src/core/state/serializer'

describe('createDefaultGameState', () => {
  it('生成完整默认存档（采矿为唯一经济）', () => {
    const state = createDefaultGameState()
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(state.mining.depth).toBe(1)
    expect(state.mining.maxDepth0).toBe(1)
    expect(state.mining.pickaxePower).toBe(8)
    expect(state.mining.smeltery.aluminium).toBeDefined()
    expect(state.cash.eq(0)).toBe(true)
    expect(state.prestige.tier).toBe(1)
    // 已移除硬币链
    expect('dimensions' in state).toBe(false)
    expect('challenge' in state).toBe(false)
  })
})

describe('deepMerge', () => {
  it('补齐缺省字段', () => {
    const defaults = createDefaultGameState()
    const partial = { schemaVersion: 1 } as ReturnType<typeof createDefaultGameState>
    const merged = deepMerge(partial, defaults)
    expect(merged.mining.depth).toBe(1)
    expect(merged.prestige.tier).toBe(1)
  })

  it('存档数据覆盖默认值（标量/数组字段不丢失）', () => {
    const defaults = createDefaultGameState()
    const saved = createDefaultGameState()
    saved.cash = new Decimal(12345)
    saved.mining.depth = 30
    saved.mining.currency.scrap = 999
    saved.mining.currency.coal = 50

    const merged = deepMergeAll(defaults, saved)
    expect(merged.cash.eq(12345)).toBe(true)
    expect(merged.mining.depth).toBe(30)
    expect(merged.mining.currency.scrap).toBe(999)
    expect(merged.mining.currency.coal).toBe(50)
  })
})

describe('serializer', () => {
  it('Decimal 往返序列化', () => {
    const state = createDefaultGameState()
    state.cash = new Decimal('1.234e50')
    state.mining.currency.scrap = 42

    const serialized = serializeState(state) as Record<string, unknown>
    expect(typeof serialized.cash).toBe('string')

    const restored = deserializeState<ReturnType<typeof createDefaultGameState>>(serialized)
    expect(restored.cash.eq(new Decimal('1.234e50'))).toBe(true)
    expect(restored.mining.currency.scrap).toBe(42)
  })
})

describe('migrate', () => {
  it('迁移 v15 补齐采矿状态（旧档默认）', () => {
    const state = createDefaultGameState() as unknown as Record<string, unknown>
    state.schemaVersion = 14
    delete state.mining
    const migrated = migrate(state)
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(migrated.mining).toBeDefined()
  })

  it('迁移 v16 剥离被移除的硬币/维度/挑战字段', () => {
    const state = createDefaultGameState() as unknown as Record<string, unknown>
    state.schemaVersion = 15
    state.dimensions = []
    state.autobuyers = []
    state.upgradeToggles = {}
    state.skullTokens = 5
    state.challenge = {}
    ;(state.stats as Record<string, unknown>).totalFlips = 10

    const migrated = migrate(state)
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect('dimensions' in migrated).toBe(false)
    expect('autobuyers' in migrated).toBe(false)
    expect('upgradeToggles' in migrated).toBe(false)
    expect('skullTokens' in migrated).toBe(false)
    expect('challenge' in migrated).toBe(false)
    expect('totalFlips' in (migrated as Record<string, unknown>).stats).toBe(false)
  })
})
