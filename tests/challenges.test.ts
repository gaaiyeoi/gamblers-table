import Decimal from 'break_infinity.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { createDefaultGameState, type GameState } from '../src/core/state/gameState'
import {
  applyReversePurchase,
  hasChallengeReward,
  isDimensionBanned,
  startChallenge,
  tickChallenge,
} from '../src/core/mechanics/challenges'
import { buyDimension } from '../src/core/mechanics/derivativeChain'

let state: GameState

beforeEach(() => {
  state = createDefaultGameState()
  state.cash = new Decimal(1e9)
})

describe('dimension ban challenge', () => {
  it('evenOnly bans odd dimensions', () => {
    expect(startChallenge(state, 'evenOnly')).toBe(true)
    expect(isDimensionBanned(state, 1)).toBe(true)
    expect(isDimensionBanned(state, 2)).toBe(false)
    expect(buyDimension(state, 1)).toBe(false)
    expect(buyDimension(state, 2)).toBe(true)
  })
})

describe('reverse purchase challenge', () => {
  it('requires higher-tier amount and consumes it', () => {
    expect(startChallenge(state, 'reverseFlow')).toBe(true)
    state.dimensions[1].amount = new Decimal(10)
    const before = state.dimensions[1].amount
    expect(applyReversePurchase(state, 1, 5)).toBe(true)
    expect(state.dimensions[1].amount.eq(before.sub(0.5))).toBe(true)
  })

  it('fails when higher-tier amount is insufficient', () => {
    startChallenge(state, 'reverseFlow')
    expect(applyReversePurchase(state, 1, 5)).toBe(false)
  })
})

describe('opposition challenge', () => {
  it('opposition grows by dt', () => {
    state.cash = new Decimal(100) // 低于 target 1e6，避免立即完成
    startChallenge(state, 'darkMatter')
    tickChallenge(state, 5000)
    expect(state.challenge.opposition.eq(10)).toBe(true)
    expect(state.challenge.activeId).toBe('darkMatter')
  })

  it('opposition above cash fails and resets current scope', () => {
    state.cash = new Decimal(1)
    startChallenge(state, 'darkMatter')
    state.dimensions[0].amount = new Decimal(10)
    tickChallenge(state, 1000)
    expect(state.challenge.activeId).toBeNull()
    expect(state.challenge.failures).toBe(1)
    expect(state.cash.eq(0)).toBe(true)
    expect(state.dimensions[0].amount.eq(0)).toBe(true)
  })

  it('reaching target completes and unlocks QoL reward', () => {
    startChallenge(state, 'darkMatter')
    state.cash = new Decimal(1e6)
    tickChallenge(state, 1)
    expect(state.challenge.activeId).toBeNull()
    expect(state.challenge.completedIds).toContain('darkMatter')
    expect(hasChallengeReward(state, 'challenge.switching')).toBe(true)
  })
})