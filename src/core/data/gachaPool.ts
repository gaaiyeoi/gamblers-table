/**
 * 帽子（扭蛋机奖池）配置。
 * 帽子仅做外观收集（rarity 影响视觉稀有度），不提供产能加成（MVP 简化）。
 * 后续可扩展为 rarity × multiplier 的产能加成。
 */
export interface HatDef {
  /** 唯一 id。 */
  id: string
  /** i18n 名称 key。 */
  nameKey: string
  /** 稀有度（权重：common=70, rare=20, epic=8, legendary=2）。 */
  rarity: HatRarity
  /** 像素图标 id（UI 阶段映射）。 */
  icon: string
}

export type HatRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** 稀有度抽中权重（数字越大概率越高）。 */
export const RARITY_WEIGHTS: Record<HatRarity, number> = {
  common: 70,
  rare: 20,
  epic: 8,
  legendary: 2,
}

/** 单次抽卡花费的骷髅代币。 */
export const GACHA_COST = 1

/** 帽子奖池（参考截图：红苹果帽/棕帽/灰帽/绿帽/棕尖帽/黑帽/紫帽 + 稀有金帽/彩虹帽）。 */
export const HAT_POOL: HatDef[] = [
  // 普通（common）
  { id: 'hat_brown', nameKey: 'hats.brown', rarity: 'common', icon: 'brown' },
  { id: 'hat_grey', nameKey: 'hats.grey', rarity: 'common', icon: 'grey' },
  { id: 'hat_green', nameKey: 'hats.green', rarity: 'common', icon: 'green' },
  { id: 'hat_purple', nameKey: 'hats.purple', rarity: 'common', icon: 'purple' },
  // 稀有（rare）
  { id: 'hat_apple', nameKey: 'hats.apple', rarity: 'rare', icon: 'apple' },
  { id: 'hat_brownpointed', nameKey: 'hats.brownpointed', rarity: 'rare', icon: 'brownpointed' },
  { id: 'hat_black', nameKey: 'hats.black', rarity: 'rare', icon: 'black' },
  // 史诗（epic）
  { id: 'hat_underwater', nameKey: 'hats.underwater', rarity: 'epic', icon: 'underwater' },
  { id: 'hat_bunny', nameKey: 'hats.bunny', rarity: 'epic', icon: 'bunny' },
  // 传说（legendary）— 金帽 / 彩虹帽
  { id: 'hat_gold', nameKey: 'hats.gold', rarity: 'legendary', icon: 'gold' },
  { id: 'hat_rainbow', nameKey: 'hats.rainbow', rarity: 'legendary', icon: 'rainbow' },
]

export function hatOf(id: string): HatDef {
  const found = HAT_POOL.find((h) => h.id === id)
  if (found === undefined) throw new Error(`未知帽子 id：${id}`)
  return found
}