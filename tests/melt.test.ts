import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { checkCoinUnlocks } from '../src/core/mechanics/coins'
import { canMelt, meltAll, meltCoins, MELT_RATIO } from '../src/core/mechanics/melt'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

/** 解锁银币（累计赚取 50 万），便于测试铜币熔铸到银币。 */
function unlockSilver(): void {
  state.stats.totalEarned = new Decimal(500_000)
  checkCoinUnlocks(state)
}

describe('canMelt（熔铸条件）', () => {
  it('低阶币数量不足 MELT_RATIO 时不可熔铸', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO - 1
    expect(canMelt(state, 1)).toBe(false)
  })

  it('数量足够但目标高阶币未解锁时不可熔铸', () => {
    state.dimensions[0].bought = MELT_RATIO
    expect(canMelt(state, 1)).toBe(false)
  })

  it('数量足够且高阶已解锁时可熔铸', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO
    expect(canMelt(state, 1)).toBe(true)
  })

  it('最高阶硬币（黑曜石）不可继续熔铸', () => {
    state.dimensions[7].bought = MELT_RATIO * 10
    expect(canMelt(state, 8)).toBe(false)
  })
})

describe('meltCoins（熔铸）', () => {
  it('按 MELT_RATIO:1 兑换 bought（10 铜 → 1 银）', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO
    state.dimensions[0].amount = new Decimal(MELT_RATIO)

    const groups = meltCoins(state, 1, 1)

    expect(groups).toBe(1)
    expect(state.dimensions[0].bought).toBe(0)
    expect(state.dimensions[1].bought).toBe(1)
  })

  it('amount 按 baseRate 等价转移（10 铜 = 5/3 银）', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO
    state.dimensions[0].amount = new Decimal(MELT_RATIO)

    meltCoins(state, 1, 1)

    // 铜币 amount 清零，银币按 10 × 0.5 / 3 = 5/3 增加。
    expect(state.dimensions[0].amount.eq(0)).toBe(true)
    const expected = new Decimal(5).div(3)
    expect(state.dimensions[1].amount.sub(expected).abs().lt(1e-9)).toBe(true)
  })

  it('请求超过可熔铸数量时只熔铸实际可用的组数', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO * 2 // 只能熔 2 组
    state.dimensions[0].amount = new Decimal(MELT_RATIO * 2)

    const groups = meltCoins(state, 1, 5)

    expect(groups).toBe(2)
    expect(state.dimensions[0].bought).toBe(0)
    expect(state.dimensions[1].bought).toBe(2)
  })

  it('目标未解锁时熔铸失败且不改动状态', () => {
    state.dimensions[0].bought = MELT_RATIO * 3
    state.dimensions[0].amount = new Decimal(MELT_RATIO * 3)

    const groups = meltCoins(state, 1, 1)

    expect(groups).toBe(0)
    expect(state.dimensions[0].bought).toBe(MELT_RATIO * 3)
    expect(state.dimensions[1].bought).toBe(0)
  })
})

describe('meltAll（全部熔铸）', () => {
  it('一次性把可熔铸的低阶币全部熔铸，余数保留', () => {
    unlockSilver()
    state.dimensions[0].bought = MELT_RATIO * 3 + 4 // 35 枚铜币
    state.dimensions[0].amount = new Decimal(MELT_RATIO * 3 + 4)

    const groups = meltAll(state, 1)

    expect(groups).toBe(3)
    expect(state.dimensions[0].bought).toBe(4)
    expect(state.dimensions[1].bought).toBe(3)
  })

  it('无可熔铸数量时返回 0', () => {
    unlockSilver()
    state.dimensions[0].bought = 3

    expect(meltAll(state, 1)).toBe(0)
  })
})
