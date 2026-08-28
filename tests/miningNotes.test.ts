import { describe, expect, it } from 'vitest'

import {
  createDefaultGameState,
  ensureDurability,
  initMining,
  MINING_NOTES,
  noteAtDepth,
  tickMining,
  type GameState,
} from '../src/core'

function fresh(): GameState {
  const state = createDefaultGameState()
  initMining(state)
  ensureDurability(state)
  // 开启自动下潜，无人值守推进
  state.mining.autoProgress = 90
  return state
}

describe('探险笔记', () => {
  it('笔记数据覆盖深度节点', () => {
    expect(MINING_NOTES.length).toBeGreaterThanOrEqual(31)
    expect(noteAtDepth(1)?.id).toBe('mining_0')
    expect(noteAtDepth(174)?.id).toBe('mining_33')
    // 无笔记的深度返回 undefined
    expect(noteAtDepth(3)).toBeUndefined()
  })

  it('挖到指定深度时发现对应笔记', () => {
    const state = fresh()
    tickMining(state, 120_000)
    // 深度 1 的笔记在首次击穿时即被记录
    expect(state.mining.discoveredNotes).toContain(1)
    expect(state.mining.discoveredNotes.length).toBeGreaterThan(0)
  })

  it('已发现的笔记不重复记录', () => {
    const state = fresh()
    tickMining(state, 120_000)
    const count = state.mining.discoveredNotes.length
    // 继续推进，笔记应仍只记录一次
    tickMining(state, 60_000)
    expect(state.mining.discoveredNotes.length).toBeGreaterThanOrEqual(count)
    const unique = new Set(state.mining.discoveredNotes)
    expect(unique.size).toBe(state.mining.discoveredNotes.length)
  })

  it('发现顺序与深度一致', () => {
    const state = fresh()
    tickMining(state, 300_000)
    const sorted = [...state.mining.discoveredNotes].sort((a, b) => a - b)
    expect(state.mining.discoveredNotes).toEqual(sorted)
  })
})
