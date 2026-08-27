/** 天赋树节点：三系分支（离线挂机流 / 在线操作流 / 维度偏向流）。 */
export type TalentBranch = 'offline' | 'online' | 'dimension'

export interface TalentDef {
  id: string
  nameKey: string
  branch: TalentBranch
  cost: number
  /** 节点倍率贡献（MVP 仅占位，后续接入乘算）。 */
  multiplier?: number
}

/** 9 个 MVP 节点（每系 3 个）。 */
export const TALENTS: TalentDef[] = [
  // 离线挂机流
  { id: 't_offline_1', nameKey: 'talents.offline.1', branch: 'offline', cost: 1, multiplier: 1.1 },
  { id: 't_offline_2', nameKey: 'talents.offline.2', branch: 'offline', cost: 1, multiplier: 1.1 },
  { id: 't_offline_3', nameKey: 'talents.offline.3', branch: 'offline', cost: 2, multiplier: 1.2 },
  // 在线操作流
  { id: 't_online_1', nameKey: 'talents.online.1', branch: 'online', cost: 1, multiplier: 1.1 },
  { id: 't_online_2', nameKey: 'talents.online.2', branch: 'online', cost: 1, multiplier: 1.1 },
  { id: 't_online_3', nameKey: 'talents.online.3', branch: 'online', cost: 2, multiplier: 1.2 },
  // 维度偏向流
  { id: 't_dimension_1', nameKey: 'talents.dimension.1', branch: 'dimension', cost: 1, multiplier: 1.15 },
  { id: 't_dimension_2', nameKey: 'talents.dimension.2', branch: 'dimension', cost: 2, multiplier: 1.25 },
  { id: 't_dimension_3', nameKey: 'talents.dimension.3', branch: 'dimension', cost: 3, multiplier: 1.5 },
]

export function talentOf(id: string): TalentDef {
  const def = TALENTS.find((t) => t.id === id)
  if (def === undefined) throw new Error(`未知天赋 id：${id}`)
  return def
}

/** 按分支分组。 */
export function talentsByBranch(): Record<TalentBranch, TalentDef[]> {
  const map: Record<TalentBranch, TalentDef[]> = { offline: [], online: [], dimension: [] }
  for (const t of TALENTS) {
    map[t.branch].push(t)
  }
  return map
}