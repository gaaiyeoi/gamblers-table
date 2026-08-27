import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { availableTalentPoints, canSpendTalent, freeResetTalents, spendTalent, talentTotalMultiplier } from '../src/core/mechanics/talentTree'
import { prestigeReset } from '../src/core/mechanics/prestige'
import { createDefaultGameState, type GameState } from '../src/core/state/gameState'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
})

function giveReputation(amount: number): void {
  state.prestige.currency.reputation = new Decimal(amount)
}

describe('availableTalentPoints（可用天赋点）', () => {
  it('reputation = 0 → 0 点', () => {
    expect(availableTalentPoints(state)).toBe(0)
  })

  it('reputation = 5 → 5 点（未点亮任何天赋）', () => {
    giveReputation(5)
    expect(availableTalentPoints(state)).toBe(5)
  })

  it('点亮消耗 2 点的天赋 → 可用 3 点', () => {
    giveReputation(5)
    spendTalent(state, 't_offline_3')
    expect(availableTalentPoints(state)).toBe(3)
  })
})

describe('spendTalent（点亮天赋）', () => {
  it('成功点亮并加入 talents 列表', () => {
    giveReputation(5)
    expect(spendTalent(state, 't_offline_1')).toBe(true)
    expect(state.talents).toContain('t_offline_1')
  })

  it('已点亮的不能再点亮', () => {
    giveReputation(5)
    spendTalent(state, 't_offline_1')
    expect(canSpendTalent(state, 't_offline_1')).toBe(false)
    expect(spendTalent(state, 't_offline_1')).toBe(false)
  })

  it('点数不足返回 false', () => {
    giveReputation(0)
    expect(spendTalent(state, 't_offline_3')).toBe(false)
  })
})

describe('freeResetTalents（无损重置）', () => {
  it('重置后所有天赋清空且点数恢复', () => {
    giveReputation(5)
    spendTalent(state, 't_offline_1')
    spendTalent(state, 't_offline_2')
    expect(state.talents).toHaveLength(2)
    freeResetTalents(state)
    expect(state.talents).toHaveLength(0)
    expect(availableTalentPoints(state)).toBe(5)
  })

  it('无损：重置后 reputation 不变', () => {
    giveReputation(5)
    spendTalent(state, 't_offline_3')
    const repBefore = state.prestige.currency.reputation
    freeResetTalents(state)
    expect(state.prestige.currency.reputation.eq(repBefore)).toBe(true)
  })
})

describe('talentTotalMultiplier（倍率叠加）', () => {
  it('未点亮 → 1', () => {
    expect(talentTotalMultiplier(state).eq(1)).toBe(true)
  })

  it('点亮后倍率连乘', () => {
    giveReputation(10)
    spendTalent(state, 't_offline_1') // 1.1
    spendTalent(state, 't_online_1') // 1.1
    const m = talentTotalMultiplier(state).toNumber()
    expect(m).toBeCloseTo(1.21, 5)
  })
})

describe('prestige + talents 集成', () => {
  it('转生后获得通货，可点亮天赋', () => {
    state.cash = new Decimal(1e9)
    prestigeReset(state, 1)
    const points = availableTalentPoints(state)
    expect(points).toBeGreaterThanOrEqual(2)
    spendTalent(state, 't_offline_3') // cost 2
    expect(state.talents).toContain('t_offline_3')
  })
})