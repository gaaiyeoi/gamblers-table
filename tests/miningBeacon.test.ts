import { describe, expect, it } from 'vitest'

import {
  createDefaultGameState,
  initMining,
  miningActiveBeacon,
  miningBeaconOwned,
  miningPlaceBeacon,
  miningRemoveBeacon,
  miningToughness,
} from '../src/core'
import { depthDurability, ensureDurability } from '../src/core'

/** 构造一份已初始化、且耐久填充完毕的存档。 */
function fresh() {
  const state = createDefaultGameState()
  initMining(state)
  ensureDurability(state)
  return state
}

/** 通过声望升级 `crystalBeacon` 授予信标持有数，并重建乘区。 */
function grantBeacons(state: ReturnType<typeof fresh>, level: number): void {
  state.mining.prestigeUpgrades.crystalBeacon = level
  initMining(state)
}

describe('beacon（对齐 Gooboo beacon.js）', () => {
  it('未获得 crystalBeacon 时没有任何信标可持有', () => {
    const state = fresh()
    expect(miningBeaconOwned(state, 'piercing')).toBe(0)
    expect(miningPlaceBeacon(state, 10, 'piercing')).toBe(false)
  })

  it('crystalBeacon 逐级授予 4 种信标（Piercing→Rich→Wonder→Hope）', () => {
    const state = fresh()
    grantBeacons(state, 1)
    expect(miningBeaconOwned(state, 'piercing')).toBe(1)
    expect(miningBeaconOwned(state, 'rich')).toBe(0)

    grantBeacons(state, 2)
    expect(miningBeaconOwned(state, 'rich')).toBe(1)

    grantBeacons(state, 3)
    expect(miningBeaconOwned(state, 'wonder')).toBe(1)

    grantBeacons(state, 4)
    expect(miningBeaconOwned(state, 'hope')).toBe(1)
  })

  it('放置信标后占用持有数，且不再重复放置', () => {
    const state = fresh()
    grantBeacons(state, 1)
    expect(miningPlaceBeacon(state, 10, 'piercing')).toBe(true)
    // 已放置后同一深度不可再放
    expect(miningPlaceBeacon(state, 10, 'piercing')).toBe(false)
    // 持有数被占用
    expect(miningBeaconOwned(state, 'piercing')).toBe(0)
  })

  it('Piercing 信标（range 1）只覆盖放置层，降低硬度', () => {
    const state = fresh()
    grantBeacons(state, 1)
    state.mining.depth = 12 // 深度 >= 10 才有硬度
    const before = miningToughness(state)

    miningPlaceBeacon(state, 12, 'piercing')
    expect(miningActiveBeacon(state)).toBe('piercing')
    // 效果：miningToughness mult = 1/(0*0.25+5) = 0.2
    expect(miningToughness(state)).toBeCloseTo(before * 0.2, 6)

    // range 1：相邻层不被覆盖
    expect(miningActiveBeacon({ ...state, mining: { ...state.mining, depth: 11 } })).toBeNull()
  })

  it('Hope 信标（range 5）覆盖放置层起 5 层', () => {
    const state = fresh()
    grantBeacons(state, 4)
    miningPlaceBeacon(state, 100, 'hope')
    for (let d = 100; d <= 104; d += 1) {
      expect(miningActiveBeacon({ ...state, mining: { ...state.mining, depth: d } })).toBe('hope')
    }
    // 第 105 层超出范围
    expect(miningActiveBeacon({ ...state, mining: { ...state.mining, depth: 105 } })).toBeNull()
  })

  it('移除信标需要冷却，且之后该深度可再放置', () => {
    const state = fresh()
    grantBeacons(state, 1)
    state.mining.depth = 10
    miningPlaceBeacon(state, 10, 'piercing')
    expect(miningActiveBeacon(state)).toBe('piercing')

    expect(miningRemoveBeacon(state, 10)).toBe(true)
    expect(miningActiveBeacon(state)).toBeNull()

    // 冷却期内不可再次移除
    expect(miningRemoveBeacon(state, 10)).toBe(false)
  })

  it('深度子模式 1 不产生任何信标效果', () => {
    const state = fresh()
    grantBeacons(state, 1)
    miningPlaceBeacon(state, 10, 'piercing')
    state.mining.subfeature = 1
    expect(miningActiveBeacon(state)).toBeNull()
  })
})
