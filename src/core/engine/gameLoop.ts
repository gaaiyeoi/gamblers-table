import { EventHub, GAME_EVENT } from './eventBus'

export interface GameLoopOptions {
  /** 固定步长（毫秒），默认 50ms = 20 tick/s。 */
  stepMs?: number
  /** 单帧最大时间差（毫秒），防止后台恢复产生巨大 delta，默认 1000ms。 */
  maxFrameDelta?: number
  /** 时间源，默认 performance.now()。测试可注入。 */
  now?: () => number
  /** 帧调度，默认 requestAnimationFrame。测试可注入。 */
  scheduleFrame?: (callback: (time: number) => void) => number
  /** 取消帧调度。 */
  cancelFrame?: (id: number) => void
}

/**
 * Delta-Time 主循环 + 固定步长累积器（参考 antimatter-dimensions 的 gameLoop）：
 * - 以真实时间差驱动，按固定步长（50ms）切分，保证不同刷新率下产出一致
 * - 每步调用 onTick(deltaMs)，由生产链等机制消费
 * - 前后派发 GAME_TICK_BEFORE / GAME_TICK_AFTER 事件
 */
export class GameLoop {
  private readonly stepMs: number
  private readonly maxFrameDelta: number
  private readonly now: () => number
  private readonly scheduleFrame: (cb: (t: number) => void) => number
  private readonly cancelFrame: (id: number) => void

  private frameId: number | null = null
  private lastTime = 0
  private accumulator = 0
  private running = false

  constructor(
    private readonly onTick: (deltaMs: number) => void,
    options: GameLoopOptions = {},
  ) {
    this.stepMs = options.stepMs ?? 50
    this.maxFrameDelta = options.maxFrameDelta ?? 1000
    this.now = options.now ?? (() => performance.now())
    this.scheduleFrame = options.scheduleFrame ?? ((cb) => requestAnimationFrame(cb))
    this.cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id))
  }

  get isRunning(): boolean {
    return this.running
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = this.now()
    this.accumulator = 0
    this.frameId = this.scheduleFrame(this.frame)
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId)
      this.frameId = null
    }
  }

  /** 手动同步推进一帧（测试用）。 */
  step(deltaMs: number): void {
    this.accumulate(deltaMs)
  }

  private frame = (time: number): void => {
    if (!this.running) return
    const delta = time - this.lastTime
    this.lastTime = time
    this.accumulate(delta)
    this.frameId = this.scheduleFrame(this.frame)
  }

  private accumulate(deltaMs: number): void {
    const delta = Math.min(deltaMs, this.maxFrameDelta)
    if (delta <= 0) return
    this.accumulator += delta
    while (this.accumulator >= this.stepMs) {
      EventHub.logic.emit(GAME_EVENT.GAME_TICK_BEFORE)
      this.onTick(this.stepMs)
      // 带本次 tick 毫秒数派发，供依赖固定步长的订阅者（如 SpawnQueue）消费
      EventHub.logic.emit(GAME_EVENT.GAME_TICK_AFTER, this.stepMs)
      this.accumulator -= this.stepMs
    }
  }
}
