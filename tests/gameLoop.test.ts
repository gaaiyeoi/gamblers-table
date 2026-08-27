import { describe, expect, it, vi } from 'vitest'

import { GameLoop } from '../src/core/engine/gameLoop'

function createTestLoop(stepMs = 50, onTick = vi.fn()) {
  let time = 0
  let scheduled: Array<{ id: number; cb: (t: number) => void }> = []
  let nextId = 1

  const loop = new GameLoop(onTick, {
    stepMs,
    now: () => time,
    scheduleFrame: (cb) => {
      const id = nextId++
      scheduled.push({ id, cb })
      return id
    },
    cancelFrame: (id) => {
      scheduled = scheduled.filter((s) => s.id !== id)
    },
  })

  /** 模拟驱动一帧：推进时钟并执行已排队的帧回调。 */
  const advanceFrame = (deltaMs: number) => {
    time += deltaMs
    const pending = scheduled
    scheduled = []
    for (const { cb } of pending) cb(time)
  }

  return { loop, advanceFrame, onTick, advanceTime: (ms: number) => (time += ms) }
}

describe('GameLoop（固定步长累积器）', () => {
  it('50ms 步长下推进 200ms 触发 4 次 tick', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(200)
    expect(onTick).toHaveBeenCalledTimes(4)
  })

  it('余数累积：100ms 触发 2 次 tick，剩余 0ms', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(100)
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('超大 delta 被 maxFrameDelta 截断（防后台恢复爆炸）', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(5000)
    // maxFrameDelta 默认 1000ms → 最多 20 次 tick
    expect(onTick).toHaveBeenCalledTimes(20)
  })

  it('stop 后不再触发 tick', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    loop.stop()
    advanceFrame(100)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('step 可手动同步推进（测试用）', () => {
    const { loop, onTick } = createTestLoop()
    loop.step(150)
    expect(onTick).toHaveBeenCalledTimes(3)
  })
})
