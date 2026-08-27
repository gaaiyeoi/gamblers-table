import { EventHub, GAME_EVENT } from '../engine/eventBus'
import { HAT_POOL, RARITY_WEIGHTS, GACHA_COST, type HatDef, type HatRarity } from '../data/gachaPool'
import type { GameState } from '../state/gameState'

/**
 * 扭蛋机机制：消耗骷髅代币抽取帽子外观，加入收藏。
 * 按稀有度权重随机抽取。
 */

/** 按稀有度权重抽取一个帽子。 */
export function pullOneHat(rng: () => number = Math.random): HatDef {
  // 1) 按稀有度权重选稀有度
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, w) => sum + w, 0)
  let roll = rng() * totalWeight
  let chosenRarity: HatRarity = 'common'
  for (const rarity of Object.keys(RARITY_WEIGHTS) as HatRarity[]) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll <= 0) {
      chosenRarity = rarity
      break
    }
  }
  // 2) 从该稀有度帽子池中等概率抽一个
  const candidates = HAT_POOL.filter((h) => h.rarity === chosenRarity)
  const pool = candidates.length > 0 ? candidates : HAT_POOL
  return pool[Math.floor(rng() * pool.length)]!
}

/**
 * 抽卡若干次，扣除骷髅代币，返回结果列表。
 * 返回的顺序与抽中顺序对应。
 */
export function gachaPull(state: GameState, count = 1, rng: () => number = Math.random): HatDef[] | null {
  const totalCost = GACHA_COST * count
  if (state.skullTokens < totalCost) return null
  state.skullTokens -= totalCost
  const results: HatDef[] = []
  for (let i = 0; i < count; i += 1) {
    const hat = pullOneHat(rng)
    results.push(hat)
    if (!state.gacha.collection.includes(hat.id)) {
      state.gacha.collection.push(hat.id)
    }
  }
  state.gacha.pulls += count
  EventHub.logic.emit(GAME_EVENT.GACHA_PULL, { results })
  return results
}

/** 当前是否已收藏某个帽子。 */
export function hasHat(state: GameState, hatId: string): boolean {
  return state.gacha.collection.includes(hatId)
}