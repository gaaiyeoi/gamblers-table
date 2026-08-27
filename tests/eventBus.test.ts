import { describe, expect, it, vi } from 'vitest'

import { EventBus, EventHub, GAME_EVENT } from '../src/core/engine/eventBus'

describe('EventBus', () => {
  it('订阅并派发事件', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on(GAME_EVENT.GAME_TICK_AFTER, handler)

    bus.emit(GAME_EVENT.GAME_TICK_AFTER, { value: 1 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ value: 1 })
  })

  it('取消订阅后不再收到事件', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    const off = bus.on(GAME_EVENT.CASH_CHANGED, handler)

    bus.emit(GAME_EVENT.CASH_CHANGED)
    off()
    bus.emit(GAME_EVENT.CASH_CHANGED)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('未订阅的事件派发不抛错', () => {
    const bus = new EventBus()
    expect(() => bus.emit(GAME_EVENT.GAME_LOAD)).not.toThrow()
  })

  it('clear 清空所有订阅', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on(GAME_EVENT.GAME_TICK_BEFORE, handler)
    bus.clear()
    bus.emit(GAME_EVENT.GAME_TICK_BEFORE)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('EventHub 双总线', () => {
  it('logic 与 ui 是独立实例', () => {
    expect(EventHub.logic).not.toBe(EventHub.ui)
  })

  it('事件枚举包含核心生命周期事件', () => {
    expect(GAME_EVENT.GAME_TICK_BEFORE).toBe('GAME_TICK_BEFORE')
    expect(GAME_EVENT.GAME_TICK_AFTER).toBe('GAME_TICK_AFTER')
    expect(GAME_EVENT.PRESTIGE_RESET_BEFORE).toBe('PRESTIGE_RESET_BEFORE')
  })
})
