import Decimal from 'break_infinity.js'

/**
 * 状态序列化：Decimal 不是 JSON 原生类型，需转为字符串存储。
 * 采用 {type:'decimal', value:string} 结构，便于与普通对象区分。
 */

const DECIMAL_MARKER = 'Decimal:'

export type Serializable = {
  [key: string]: unknown
} | unknown[]

function serializeValue(value: unknown): unknown {
  if (value instanceof Decimal) {
    return `${DECIMAL_MARKER}${value.toString()}`
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeValue(item)
    }
    return result
  }
  return value
}

function deserializeValue(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith(DECIMAL_MARKER)) {
    return new Decimal(value.slice(DECIMAL_MARKER.length))
  }
  if (Array.isArray(value)) {
    return value.map((item) => deserializeValue(item))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deserializeValue(item)
    }
    return result
  }
  return value
}

/** 序列化为可 JSON.stringify 的结构。 */
export function serializeState<T>(state: T): unknown {
  return serializeValue(state)
}

/** 从序列化结构还原为带 Decimal 的状态。 */
export function deserializeState<T>(data: unknown): T {
  return deserializeValue(data) as T
}
