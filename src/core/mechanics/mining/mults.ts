/**
 * 乘区（mult）系统 —— 1:1 对应 Gooboo 的 `store/mult.js`。
 *
 * 每个乘区有三类贡献者：
 * - `base`：加法，累加到 baseValue 之上
 * - `mult`：乘法，累乘
 * - `bonus`：加法，在所有乘法之后追加
 *
 * 求值公式：`(baseValue + Σbase + base) * Πmult * mult + Σbonus + bonus`
 *
 * `group` 用于把一个乘区的贡献同步广播给一组乘区
 * （例如 `miningOreGain` 会同步到所有 `currencyMiningOreXxxGain`）。
 */

export type MultContributionKind = 'base' | 'mult' | 'bonus'

export interface MultItem {
  baseValue: number
  min: number | null
  max: number | null
  round: boolean
  base: Record<string, number>
  mult: Record<string, number>
  bonus: Record<string, number>
  /** 贡献广播目标乘区名列表。 */
  group: string[]
}

export type MultMap = Record<string, MultItem>

export interface MultDef {
  baseValue?: number
  min?: number | null
  max?: number | null
  round?: boolean
  group?: string[]
}

/** 创建一个空乘区容器。 */
export function createMultItem(def: MultDef = {}): MultItem {
  return {
    baseValue: def.baseValue ?? 0,
    min: def.min ?? null,
    max: def.max ?? null,
    round: def.round ?? false,
    base: {},
    mult: {},
    bonus: {},
    group: def.group ?? [],
  }
}

/** 用一组定义初始化乘区表。 */
export function createMults(defs: Record<string, MultDef>): MultMap {
  const map: MultMap = {}
  for (const [key, def] of Object.entries(defs)) {
    map[key] = createMultItem(def)
  }
  return map
}

/** 确保某个乘区存在（惰性创建）。 */
export function ensureMult(mults: MultMap, name: string): MultItem {
  if (mults[name] === undefined) {
    mults[name] = createMultItem()
  }
  return mults[name]
}

/** 求值：`(baseValue + Σbase + base) * Πmult * mult + Σbonus + bonus`，再做 min/max/round 处理。 */
export function multGet(mults: MultMap, name: string, base = 0, mult = 1, bonus = 0): number {
  const item = mults[name]
  if (item === undefined) {
    return (base + bonus) * mult
  }

  let baseSum = item.baseValue
  for (const key in item.base) {
    baseSum += item.base[key]
  }
  let multProd = 1
  for (const key in item.mult) {
    multProd *= item.mult[key]
  }
  let bonusSum = 0
  for (const key in item.bonus) {
    bonusSum += item.bonus[key]
  }

  let val = (baseSum + base) * multProd * mult + bonusSum + bonus

  if (item.min !== null) {
    val = Math.max(val, item.min)
  }
  if (item.max !== null) {
    val = Math.min(val, item.max)
  }
  if (item.round) {
    val = Math.round(val)
  }
  return val
}

/**
 * 写入一个贡献值。`value` 为 `null` 表示移除该贡献（Gooboo 中效果值为 null 即不生效）。
 * 会同步广播到 group 中的乘区。
 */
export function multSet(
  mults: MultMap,
  name: string,
  kind: MultContributionKind,
  key: string,
  value: number | null,
): void {
  const item = ensureMult(mults, name)
  const bucket = item[kind]
  if (value === null || !Number.isFinite(value)) {
    delete bucket[key]
  } else {
    bucket[key] = value
  }
  for (const target of item.group) {
    const targetItem = ensureMult(mults, target)
    const targetBucket = targetItem[kind]
    if (value === null || !Number.isFinite(value)) {
      delete targetBucket[key]
    } else {
      targetBucket[key] = value
    }
  }
}

/** 创建一个 `multSet` 的绑定版本，便于按来源批量写入/清除。 */
export function multWriter(mults: MultMap, source: string) {
  return {
    set(name: string, kind: MultContributionKind, value: number | null): void {
      multSet(mults, name, kind, source, value)
    },
    clear(names: Iterable<string>): void {
      for (const name of names) {
        multSet(mults, name, 'base', source, null)
        multSet(mults, name, 'mult', source, null)
        multSet(mults, name, 'bonus', source, null)
      }
    },
  }
}
