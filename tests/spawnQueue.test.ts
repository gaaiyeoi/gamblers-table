import { describe, expect, it } from 'vitest'

import { SpawnQueue } from '../src/core/engine/spawnQueue'

describe('SpawnQueue（生成队列）', () => {
  it('默认间隔 60ms，且可配置', () => {
    expect(new SpawnQueue().intervalMs).toBe(60)
    expect(new SpawnQueue({ intervalMs: 120 }).intervalMs).toBe(120)
  })

  it('初始为空闲，进度为 1', () => {
    const q = new SpawnQueue()
    expect(q.busy).toBe(false)
    expect(q.remaining).toBe(0)
    expect(q.total).toBe(0)
  })

  it('入队后逐枚释放，直到释放完', () => {
    const q = new SpawnQueue({ intervalMs: 10 })
    q.enqueue(3)
    expect(q.busy).toBe(true)
    expect(q.remaining).toBe(3)
    expect(q.total).toBe(3)

    // 不足一个间隔：不释放
    expect(q.tick(5)).toBe(0)
    expect(q.remaining).toBe(3)

    // 累计到一个间隔：释放一枚
    expect(q.tick(5)).toBe(1)
    expect(q.remaining).toBe(2)

    // 一次性跨越两个间隔：释放两枚
    expect(q.tick(20)).toBe(2)
    expect(q.remaining).toBe(0)
    expect(q.busy).toBe(false)
  })

  it('掉帧时单次 tick 可释放多枚', () => {
    const q = new SpawnQueue({ intervalMs: 10 })
    q.enqueue(5)
    expect(q.tick(100)).toBe(5)
    expect(q.busy).toBe(false)
  })

  it('空闲时入队开启新批次，释放中途入队并入当前批次', () => {
    const q = new SpawnQueue({ intervalMs: 10 })
    q.enqueue(2)
    expect(q.tick(10)).toBe(1) // 释放 1，剩 1
    q.enqueue(3) // 中途追加，并入当前批次
    expect(q.total).toBe(5)
    expect(q.remaining).toBe(4)
  })

  it('clear 清空队列', () => {
    const q = new SpawnQueue({ intervalMs: 10 })
    q.enqueue(4)
    q.clear()
    expect(q.busy).toBe(false)
    expect(q.remaining).toBe(0)
    expect(q.total).toBe(0)
  })
})
