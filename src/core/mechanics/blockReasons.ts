import { miningUpgradeOf, type MiningUpgradeDef } from '../data/miningUpgrades'
import { PRESTIGE_TIERS } from '../data/prestigeTiers'
import type { GameState } from '../state/gameState'
import {
  currencyOf,
  type MiningUpgradeId,
  miningEnhanceBlock,
  miningEnhancementBarsNeeded,
  miningEnhancementMax,
  miningUpgradeBlock,
  miningPrestigePreview,
} from './mining'

/**
 * 「为什么不能点」的结构化原因。
 *
 * 纯数据、不含文案：core 层只负责判定被什么卡住（未解锁/满级/哪种资源不足/差多少），
 * 由绑定层（gameStore）翻译成玩家可读的一句话，写进事件流与提示。
 */
export type BlockKind =
  /** 未解锁（深度 / 前置 / 依赖解锁位）。 */
  | 'locked'
  /** 分层解锁门槛未达到（如 oreSlots 需要更深的深度）。 */
  | 'depth'
  /** 已达等级上限。 */
  | 'capped'
  /** 废料不足。 */
  | 'scrap'
  /** 金属矿不足。 */
  | 'ore'
  /** 气态资源不足。 */
  | 'gas'
  /** 氦不足。 */
  | 'helium'
  /** 绿水晶不足。 */
  | 'crystal'
  /** 未达转生门槛（深度居民不足）。 */
  | 'threshold'
  /** 熔炼产线未投料。 */
  | 'furnace'
  /** 未选择要增强的锭。 */
  | 'ingredient'
  /** 锭不足。 */
  | 'bars'

export interface BlockReason {
  /** 被什么卡住。 */
  kind: BlockKind
  /** 缺失资源的 id（kind 为 ore/gas/bars 时有效）。 */
  resourceId?: string
  /** 需求量。 */
  need?: number
  /** 当前持有量 / 当前进度。 */
  have?: number
  /** 等级上限（kind 为 capped 时有效）。 */
  cap?: number
  /** 前置升级 id（kind 为 locked 时有效）。 */
  requiresId?: MiningUpgradeId
  /** 前置升级所需等级（kind 为 locked 时有效）。 */
  requiresLevel?: number
}

function resourceKind(id: string): BlockKind {
  switch (id) {
    case 'scrap':
      return 'scrap'
    case 'helium':
      return 'helium'
    case 'crystalGreen':
    case 'crystalYellow':
      return 'crystal'
    default:
      if (id.startsWith('ore') || id.startsWith('bar')) {
        return 'ore'
      }
      return 'gas'
  }
}

/** 把 `miningUpgradeBlock` 的结果翻译成 `BlockReason`。 */
function fromUpgradeBlock(state: GameState, id: MiningUpgradeId): BlockReason | null {
  const block = miningUpgradeBlock(state, id)
  if (block === null) {
    return null
  }
  switch (block.kind) {
    case 'hidden':
      return { kind: 'locked', requiresId: id }
    case 'capped':
      return { kind: 'capped', cap: block.cap }
    case 'levelLocked':
      return { kind: 'depth', need: block.depth }
    case 'resource':
      return {
        kind: resourceKind(block.id),
        resourceId: block.id,
        need: block.need,
        have: block.have,
      }
    default:
      return null
  }
}

/** 升级树：为什么买不了。 */
export function miningUpgradeBlockReason(state: GameState, id: MiningUpgradeId): BlockReason | null {
  return fromUpgradeBlock(state, id)
}

/** 气态升级：为什么买不了。 */
export function gasUpgradeBlockReason(state: GameState, id: MiningUpgradeId): BlockReason | null {
  return fromUpgradeBlock(state, id)
}

/** 声望升级：为什么买不了。 */
export function prestigeUpgradeBlockReason(
  state: GameState,
  id: MiningUpgradeId,
): BlockReason | null {
  return fromUpgradeBlock(state, id)
}

/** 熔炼产线投料：为什么投不了。 */
export function fillFurnaceBlockReason(state: GameState, barId: string): BlockReason | null {
  const line = Object.keys(state.mining.smeltery).find((key) => BAR_BY_LINE[key] === barId)
  if (line === undefined) {
    return { kind: 'furnace' }
  }
  const stored = state.mining.smeltery[line]?.stored ?? 0
  if (stored <= 0) {
    return { kind: 'furnace', need: 1, have: stored }
  }
  return null
}

const BAR_BY_LINE: Record<string, string> = {
  aluminium: 'barAluminium',
  bronze: 'barBronze',
  steel: 'barSteel',
  titanium: 'barTitanium',
  shiny: 'barShiny',
  iridium: 'barIridium',
  darkIron: 'barDarkIron',
}

/** 镐增强：为什么增强不了。 */
export function enhanceBlockReason(state: GameState): BlockReason | null {
  const block = miningEnhanceBlock(state)
  const ingredient = state.mining.enhancementIngredient
  const lvl = ingredient === null ? 0 : (state.mining.enhancement[ingredient] ?? 0)
  switch (block) {
    case 'noIngredient':
      return { kind: 'ingredient' }
    case 'maxed':
      return { kind: 'capped', cap: miningEnhancementMax(state) }
    case 'bars':
      return {
        kind: 'bars',
        resourceId: ingredient ?? undefined,
        need: miningEnhancementBarsNeeded(state),
        have: ingredient === null ? 0 : currencyOf(state, ingredient),
      }
    case 'none':
      return null
    default:
      return { kind: 'capped', cap: miningEnhancementMax(state), have: lvl }
  }
}

/** 转生：为什么转不了（深度居民不足 / 未解锁）。 */
export function prestigeBlockReason(state: GameState, tier: number): BlockReason | null {
  if (tier === 1) {
    if (state.mining.unlocks.miningDepthDweller?.use !== true) {
      return { kind: 'locked', requiresId: 'depthDweller' }
    }
    const need = PRESTIGE_TIERS[0]!.threshold.toNumber()
    const have = miningPrestigePreview(state)
    if (have < need) {
      return { kind: 'threshold', need, have }
    }
    return null
  }
  const need = PRESTIGE_TIERS[tier - 1]?.threshold.toNumber() ?? 0
  if (state.cash.lt(need)) {
    return { kind: 'threshold', need, have: state.cash.toNumber() }
  }
  return null
}

/** 解析某个升级的定义（UI 展示名称与效果用）。 */
export function upgradeDefOf(id: MiningUpgradeId): MiningUpgradeDef {
  return miningUpgradeOf(id)
}
