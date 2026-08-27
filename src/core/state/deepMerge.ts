/**
 * 深度合并：加载存档时用默认值补齐缺省字段，保证旧档/损坏档升级不崩。
 * 规则：普通对象递归合并；数组整体替换；非对象直接替换。
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** 把 target 与 source 深度合并，返回 target（就地修改）。 */
export function deepMerge<T>(target: T, source: T): T {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source
  }
  for (const key of Object.keys(source)) {
    const targetValue = (target as Record<string, unknown>)[key]
    const sourceValue = (source as Record<string, unknown>)[key]
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      deepMerge(targetValue, sourceValue)
    } else {
      ;(target as Record<string, unknown>)[key] = sourceValue
    }
  }
  return target
}

/** 合并多个对象（参考 deepmergeAll）：依次把 defaults 之后的对象合并进第一个。 */
export function deepMergeAll<T extends object>(...objects: T[]): T {
  const result = {} as T
  for (const obj of objects) {
    deepMerge(result, obj)
  }
  return result
}
