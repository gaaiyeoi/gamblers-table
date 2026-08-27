import type { EventBus, GameEvent } from './engine/eventBus'

/**
 * Lazy 懒缓存（参考 antimatter-dimensions 的 Lazy + GameCache）：
 * 首次访问时才计算并缓存，可通过 invalidate() 或事件自动失效。
 * 增量游戏每帧都会乘算大量倍率，缓存是性能关键。
 */
export class Lazy<T> {
  private cached: T | undefined
  private hasValue = false

  constructor(private readonly compute: () => T) {}

  get value(): T {
    if (!this.hasValue) {
      this.cached = this.compute()
      this.hasValue = true
    }
    return this.cached as T
  }

  invalidate(): void {
    this.hasValue = false
    this.cached = undefined
  }

  /** 订阅事件，事件触发时自动失效。返回 this 方便链式。 */
  invalidateOn(bus: EventBus, ...events: GameEvent[]): this {
    for (const event of events) {
      bus.on(event, () => this.invalidate())
    }
    return this
  }

  /** 手动设置缓存值。 */
  set(value: T): void {
    this.cached = value
    this.hasValue = true
  }
}

/** 全局倍率缓存登记处（机制模块在注册阶段向这里登记 Lazy）。 */
export const GameCache: Record<string, Lazy<unknown>> = {}
