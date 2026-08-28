/**
 * 采矿统计（Gooboo `store/stat.js` 的简化版）。
 *
 * 每条统计有两轨：
 * - `value`：当前值，转生时清零（如本次声望挖到的废料）
 * - `total`：历史累计 / 历史最大，**永不重置**，成就与全局等级读它
 */

import type { MiningState } from '../../state/gameState'

/** 读取当前值。 */
export function statValue(m: MiningState, name: string): number {
  return m.stats.value[name] ?? 0
}

/** 读取历史累计/最大值。 */
export function statTotal(m: MiningState, name: string): number {
  return m.stats.total[name] ?? 0
}

/** 累加：同时推进当前值与历史最大。 */
export function statAdd(m: MiningState, name: string, amount: number): void {
  if (!(amount > 0)) {
    return
  }
  const next = (m.stats.value[name] ?? 0) + amount
  m.stats.value[name] = next
  const total = m.stats.total[name] ?? 0
  if (next > total) {
    m.stats.total[name] = next
  }
}

/** 抬升到更高值（用于「历史最大」类统计）。 */
export function statIncreaseTo(m: MiningState, name: string, value: number): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    return
  }
  const current = m.stats.value[name] ?? 0
  if (value > current) {
    m.stats.value[name] = value
  }
  const total = m.stats.total[name] ?? 0
  if (value > total) {
    m.stats.total[name] = value
  }
}

/**
 * 全局等级（Global Level）。
 *
 * Gooboo：`meta/globalLevelPart({key: 'mining_' + subfeature, amount: maxDepth - 1})`，
 * 各特性的 part 相加得到 GL；本项目只有 mining，故
 * `GL = (maxDepth0 - 1) + (maxDepth1 - 1)`。
 */
export function globalLevel(m: MiningState): number {
  return Math.max(0, m.maxDepth0 - 1) + Math.max(0, m.maxDepth1 - 1)
}

/** 清空当前值（转生时调用），保留 total。 */
export function resetStatValues(m: MiningState): void {
  for (const key in m.stats.value) {
    delete m.stats.value[key]
  }
}
