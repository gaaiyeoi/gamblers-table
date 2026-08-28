import { EventHub, GAME_EVENT } from './eventBus'

export interface GameLoopOptions {
  /** 固定步长（毫秒），默认 50ms = 20 tick/s。 */
  stepMs?: number
  /** 单帧最大时间差（毫秒），防止后台恢复产生巨大 delta，默认 1000ms。 */
  maxFrameDelta?: number
  /**
   * 单帧（一次 rAF）最多推进的游戏步数，默认 2。
   * 防止某帧 delta 过大时固定步长累积器无限追赶、占死 JS 主线程导致所有按钮失去响应。
   * 注意：未处理完的余数会被保留到下一帧继续推进，而不是丢弃（放置游戏收益应基于真实
   * 经过的时间，掉帧/渲染变慢不应白丢在线收益）。
   */
  maxStepsPerFrame?: number
  /**
   * 单帧未处理余数的最大累积量（毫秒）。超过此值说明帧率已极低或主线程长时间阻塞，
   * 此时丢弃多余部分以免累积器无限膨胀；正常掉帧不会触及该上限。
   */
  maxAccumulatedMs?: number
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
  private readonly maxStepsPerFrame: number
  private readonly maxAccumulatedMs: number
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
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 2
    this.maxAccumulatedMs = options.maxAccumulatedMs ?? 60_000
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

  /** 手动同步推进一帧（测试用）：不受单帧步数限制，一次性消化全部累积。 */
  step(deltaMs: number): void {
    this.accumulate(deltaMs, false)
  }

  /**
   * 重置时间基线：把 `lastTime` 对齐到当前时刻。
   * 用于标签页回到前台时，离线结算已手动补齐了后台经过的时间，
   * 避免 rAF 恢复后把这段隐藏时间再算一次（重复计收益）。
   */
  resetBaseline(): void {
    this.lastTime = this.now()
  }

  private frame = (time: number): void => {
    if (!this.running) return
    const delta = time - this.lastTime
    this.lastTime = time
    this.accumulate(delta, true)
    this.frameId = this.scheduleFrame(this.frame)
  }

  /**
   * 按固定步长消化累积时间。
   * `limited=true`（rAF 帧路径）时单帧最多推进 `maxStepsPerFrame` 步，
   * 未处理完的余数保留到下一帧继续推进，避免掉帧/渲染变慢时白丢真实时间。
   * 仅当余数超过 `maxAccumulatedMs`（主线程长时间卡死等极端情况）时才丢弃上限部分，
   * 防止累积器无限膨胀、长时间阻塞主线程。
   */
  private accumulate(deltaMs: number, limited: boolean): void {
    const delta = Math.min(deltaMs, this.maxFrameDelta)
    if (delta <= 0) return
    this.accumulator += delta
    let guard = 0
    while (this.accumulator >= this.stepMs && (!limited || guard < this.maxStepsPerFrame)) {
      guard += 1
      EventHub.logic.emit(GAME_EVENT.GAME_TICK_BEFORE)
      this.onTick(this.stepMs)
      // 带本次 tick 毫秒数派发，供依赖固定步长的订阅者（如 SpawnQueue）消费
      EventHub.logic.emit(GAME_EVENT.GAME_TICK_AFTER, this.stepMs)
      this.accumulator -= this.stepMs
    }
    // 余数结转：不丢弃真实时间，仅按上限兜底极端情况
    this.accumulator = Math.min(this.accumulator, this.maxAccumulatedMs)
  }
}
