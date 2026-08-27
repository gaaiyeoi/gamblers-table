/**
 * 事件总线 + 全局事件枚举
 *
 * 参考 antimatter-dimensions 的 EventHub：分为 logic（游戏逻辑）与 ui（界面响应）
 * 两条总线。机制模块之间仅通过事件通信，禁止互相直接 import 实现。
 */
export const GAME_EVENT = {
  // 主循环
  GAME_TICK_BEFORE: 'GAME_TICK_BEFORE',
  GAME_TICK_AFTER: 'GAME_TICK_AFTER',
  // 生产 / 购买
  CASH_CHANGED: 'CASH_CHANGED',
  DIMENSION_BOUGHT: 'DIMENSION_BOUGHT',
  UPGRADE_BOUGHT: 'UPGRADE_BOUGHT',
  HELPER_HIRED: 'HELPER_HIRED',
  HELPER_UNLOCKED: 'HELPER_UNLOCKED',
  COIN_UNLOCKED: 'COIN_UNLOCKED',
  COIN_MELTED: 'COIN_MELTED',
  // 转生
  PRESTIGE_RESET_BEFORE: 'PRESTIGE_RESET_BEFORE',
  PRESTIGE_RESET_AFTER: 'PRESTIGE_RESET_AFTER',
  // 天赋
  TALENT_POINT_CHANGED: 'TALENT_POINT_CHANGED',
  // 挑战
  CHALLENGE_STARTED: 'CHALLENGE_STARTED',
  CHALLENGE_COMPLETED: 'CHALLENGE_COMPLETED',
  CHALLENGE_FAILED: 'CHALLENGE_FAILED',
  // 任务关卡
  LEVEL_READY: 'LEVEL_READY',
  LEVEL_COMPLETED: 'LEVEL_COMPLETED',
  // 外观 / 抽奖
  GACHA_PULL: 'GACHA_PULL',
  HELPER_HAT_CHANGED: 'HELPER_HAT_CHANGED',
  // 成就
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  // 存档
  GAME_LOAD: 'GAME_LOAD',
  GAME_SAVE: 'GAME_SAVE',
} as const

export type GameEvent = (typeof GAME_EVENT)[keyof typeof GAME_EVENT]

type EventHandler = (payload: unknown) => void

/**
 * 轻量发布订阅实现。
 */
export class EventBus {
  private readonly handlers = new Map<GameEvent, Set<EventHandler>>()

  /**
   * 订阅事件，返回取消订阅函数。
   */
  on(event: GameEvent, handler: EventHandler): () => void {
    let set = this.handlers.get(event)
    if (set === undefined) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler)
    return () => this.off(event, handler)
  }

  off(event: GameEvent, handler: EventHandler): void {
    const set = this.handlers.get(event)
    if (set !== undefined) {
      set.delete(handler)
    }
  }

  /** 取消某个目标的所有订阅（用于组件卸载）。 */
  offAll(target: unknown): void {
    for (const set of this.handlers.values()) {
      for (const handler of set) {
        if ((handler as { target?: unknown }).target === target) {
          set.delete(handler)
        }
      }
    }
  }

  emit(event: GameEvent, payload?: unknown): void {
    const set = this.handlers.get(event)
    if (set === undefined) return
    for (const handler of set) {
      handler(payload)
    }
  }

  clear(): void {
    this.handlers.clear()
  }

  /** 统计订阅数（调试用）。 */
  get size(): number {
    let count = 0
    for (const set of this.handlers.values()) count += set.size
    return count
  }
}

/** 全局双总线：logic 用于游戏逻辑，ui 用于界面响应。 */
export const EventHub = {
  logic: new EventBus(),
  ui: new EventBus(),
}
