/**
 * 卡牌机制（1:1 移植 `store/card.js` 的玩法核心）。
 *
 * 说明：
 * - 卡包价格用 `gem_emerald`（本项目在转生时按深度居民产出 emerald）。
 * - **不实现 shiny 卡**：shiny 需 `cardShiny` 解锁 + 独立掉落链路 + shinyDust 兑换，
 *   属于 Gooboo 后期深层系统，本项目先留状态位（`cardFoundShiny`）但不开采。
 */

import { MINING_CARD_PACKS, miningCardOf } from '../../data/miningCards'
import type { MiningState } from '../../state/gameState'
import { isUnlocked, rebuildMults } from './effects'
import { multGet } from './mults'

/** 加权随机选下标。Gooboo `weightSelect`。 */
export function weightSelect(weights: readonly number[], roll: number): number {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) {
    return 0
  }
  let cursor = roll * total
  for (let i = 0; i < weights.length; i += 1) {
    cursor -= weights[i]
    if (cursor <= 0) {
      return i
    }
  }
  return weights.length - 1
}

/** 装备卡上限（`miningCardCap`，默认 1）。 */
export function cardCap(m: MiningState): number {
  return Math.max(0, Math.floor(multGet(m.mults, 'miningCardCap')))
}

/** 已收集的卡种类数（feature 的 cacheCards）。 */
export function cardsCollected(m: MiningState): number {
  return Object.keys(m.cards).length
}

/** 当前装备卡的总力量。adaptive 卡无固定力量（horde 专用），本项目计 0。 */
export function cardPower(m: MiningState): number {
  let power = 0
  const counts: Record<number, number> = {}
  for (const id of m.cardEquipped) {
    counts[id] = (counts[id] ?? 0) + 1
  }
  for (const raw of Object.keys(counts)) {
    const id = Number(raw)
    const def = miningCardOf(id)
    const base = def.power === 'adaptive' ? 0 : def.power
    power += (base + (m.cardFoundShiny[id] === true ? 1 : 0)) * counts[id]
  }
  return power
}

/** 开卡包：消耗 emerald，抽取 `amount` 张卡。 */
export function openPack(
  m: MiningState,
  packId: string,
  rng: () => number = Math.random,
): { ok: boolean; cards: number[] } {
  const pack = MINING_CARD_PACKS[packId]
  if (pack === undefined) {
    return { ok: false, cards: [] }
  }
  if (pack.unlock !== undefined && !isUnlocked(m, pack.unlock)) {
    return { ok: false, cards: [] }
  }
  const price = pack.price * pack.amount
  if ((m.currency.gem_emerald ?? 0) < price) {
    return { ok: false, cards: [] }
  }
  m.currency.gem_emerald = (m.currency.gem_emerald ?? 0) - price

  const ids = Object.keys(pack.content).map(Number)
  const weights = ids.map((id) => pack.content[id])
  const opened: number[] = []
  for (let i = 0; i < pack.amount; i += 1) {
    const id = ids[weightSelect(weights, rng())]
    m.cards[id] = (m.cards[id] ?? 0) + 1
    opened.push(id)
  }
  rebuildMults(m)
  return { ok: true, cards: opened }
}

/** 切换某卡是否在选择列表（受装备上限约束）。 */
export function toggleCardSelected(m: MiningState, id: number): void {
  const index = m.cardSelected.indexOf(id)
  if (index >= 0) {
    m.cardSelected.splice(index, 1)
    return
  }
  if (m.cardSelected.length < cardCap(m)) {
    m.cardSelected.push(id)
  }
}

/** 提交选择 → 装备（截断到上限）。 */
export function activateCards(m: MiningState): void {
  const cap = cardCap(m)
  m.cardEquipped = [...m.cardSelected].slice(0, cap)
  m.cardSelected = []
  rebuildMults(m)
}

/** 卸下全部装备。 */
export function unequipCards(m: MiningState): void {
  m.cardEquipped = []
  m.cardSelected = []
  rebuildMults(m)
}
