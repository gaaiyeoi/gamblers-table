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
  it('单帧最多推进 maxStepsPerFrame（默认 2）步，余数结转不丢失', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(200) // 200ms = 4 步，单帧只推进 2 步，剩余 100ms 结转
    expect(onTick).toHaveBeenCalledTimes(2)
    advanceFrame(10) // 下一帧带上结转余数补跑 2 步
    expect(onTick).toHaveBeenCalledTimes(4)
  })

  it('掉帧不丢失真实时间：大 delta 分多帧补完，而不是丢弃', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    // 单帧注入 400ms（=8 步），maxFrameDelta 内；单帧上限 2 步，其余结转
    advanceFrame(400)
    expect(onTick).toHaveBeenCalledTimes(2)
    // 后续用小步长帧把结转余数全部消化（8 步总共），而不是丢弃
    for (let i = 0; i < 20; i += 1) {
      advanceFrame(1)
    }
    expect(onTick).toHaveBeenCalledTimes(8)
  })

  it('余数累积：100ms 触发 2 次 tick，剩余 0ms', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(100)
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('多帧小 delta 累积：正常运行频率不受单帧上限影响', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    for (let i = 0; i < 10; i += 1) {
      advanceFrame(50) // 每帧恰好 1 步，均低于 maxStepsPerFrame
    }
    expect(onTick).toHaveBeenCalledTimes(10)
  })

  it('超大 delta：maxFrameDelta 截断到 1000ms 后再按 maxStepsPerFrame 丢弃', () => {
    const { loop, advanceFrame, onTick } = createTestLoop()
    loop.start()
    advanceFrame(5000)
    // maxFrameDelta 截断到 1000ms=20 步，但单帧最多推进 2 步，其余结转后续帧
    expect(onTick).toHaveBeenCalledTimes(2)
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
