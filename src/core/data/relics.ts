/**
 * 采矿圣遗物（1:1 语义参考 Gooboo `js/modules/mining/relic.js`）。
 *
 * 精简版（已去掉 glyph 台座 / 挖掘进度 / level 升级等与村庄、gallery 深度耦合的子系统）：
 * - **被动效果**：发现后永久提供乘区（friendlyBat → 废料 ×1.25；honeyPot → 树脂上限 +1）
 * - **主动技能**：消耗 `relic_power`（本项目改为按时间自然累积）换取一次性收益
 * - 解锁条件：
 *   - friendlyBat：**全局等级 ≥ 40**（Gooboo 判据）
 *   - honeyPot：**树脂成就第 3 级**发现（achievement 已写 `unlock.relic_honeyPot`）
 *
 * 数据保持纯净（不含 mechanics 引用），active 的参数计算/发放逻辑放在
 * `core/mechanics/mining/actions.ts` 的 `useRelicActive`。
 */

export type MiningRelicId = 'friendlyBat' | 'honeyPot'

export interface MiningRelicEffect {
  /** 乘区名。 */
  name: string
  type: 'mult' | 'base'
  value: number
}

export interface MiningRelic {
  id: MiningRelicId
  nameKey: string
  descKey: string
  icon: string
  /** 被动效果（发现即生效）。 */
  passive: MiningRelicEffect[]
  /** 主动技能：消耗 relic_power 换取对应货币。 */
  active?: { cost: number; currency: string }
  /** 解锁：需全局等级 ≥ 该值。 */
  unlockGl?: number
  /** 解锁：需某 unlock 标志已可见（如 `relic_honeyPot`）。 */
  unlockKey?: string
}

export const MINING_RELICS: MiningRelic[] = [
  {
    id: 'friendlyBat',
    nameKey: 'relics.friendlyBat',
    descKey: 'relics.friendlyBat.desc',
    icon: '🦇',
    passive: [{ name: 'currencyMiningScrapGain', type: 'mult', value: 1.25 }],
    active: { cost: 8, currency: 'scrap' },
    unlockGl: 40,
  },
  {
    id: 'honeyPot',
    nameKey: 'relics.honeyPot',
    descKey: 'relics.honeyPot.desc',
    icon: '🍯',
    passive: [{ name: 'miningResinMax', type: 'base', value: 1 }],
    active: { cost: 10, currency: 'resin' },
    unlockKey: 'relic_honeyPot',
  },
]

export function relicOf(id: MiningRelicId): MiningRelic {
  const def = MINING_RELICS.find((r) => r.id === id)
  if (def === undefined) {
    throw new Error(`未知圣遗物：${id}`)
  }
  return def
}

/** 读取遗物解锁所需的上下文。 */
export interface MiningRelicState {
  mining: {
    maxDepth0: number
    maxDepth1: number
    unlocks: Record<string, { see: boolean; use: boolean }>
  }
}

/** 全局等级（遗物 friendlyBat 解锁依据）。 */
export function globalLevelOf(state: MiningRelicState): number {
  return Math.max(0, state.mining.maxDepth0 - 1) + Math.max(0, state.mining.maxDepth1 - 1)
}

/** 圣遗物是否已解锁。 */
export function relicUnlocked(relic: MiningRelic, state: MiningRelicState): boolean {
  if (relic.unlockGl !== undefined && globalLevelOf(state) < relic.unlockGl) {
    return false
  }
  if (relic.unlockKey !== undefined && state.mining.unlocks[relic.unlockKey]?.see !== true) {
    return false
  }
  return true
}
