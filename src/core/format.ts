import Decimal from 'break_infinity.js'

/** 大数显示记法。 */
export type Notation = 'standard' | 'scientific' | 'engineering'

const SUFFIXES = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No']

/**
 * 格式化大数：< 1e6 用逗号分隔整数；≥ 1e6 用科学计数法。
 * 记法支持：
 * - standard：1,234,567 / 1.23e9
 * - scientific：1.234567e6 → 1.23e6
 * - engineering：工程计数法（指数为 3 的倍数，1.23e6 → 1.23M）
 */
export function formatNumber(value: Decimal | number, notation: Notation = 'standard'): string {
  const dec = Decimal.fromValue(value)
  if (Number.isNaN(dec.mantissa)) return 'NaN'
  if (dec.eq(0)) return '0'
  if (dec.lt(0)) return `-${formatNumber(dec.abs(), notation)}`

  const exponent = dec.exponent
  const mantissa = dec.mantissa

  // 逗号分隔整数：standard 记法在 1e16 内可无损显示；科学/工程记法在 1e6 内
  const commaLimit = notation === 'standard' ? 16 : 6
  if (exponent < commaLimit) {
    return dec.toNumber().toLocaleString('en-US', { maximumFractionDigits: 0 })
  }

  switch (notation) {
    case 'scientific':
      return `${mantissa.toFixed(2)}e${exponent}`
    case 'engineering': {
      const engExp = Math.floor(exponent / 3) * 3
      const engMantissa = dec.div(Decimal.pow(10, engExp)).toNumber()
      const suffixIdx = engExp / 3 - 1
      const suffix = SUFFIXES[suffixIdx] ?? ''
      return `${engMantissa.toFixed(2)} ${suffix}`
    }
    default:
      return `${mantissa.toFixed(2)}e${exponent}`
  }
}

/** 小数格式：<10 保留 1 位小数（0.5 显示 "0.5"），≥10 显示整数。 */
function formatSmall(value: number): string {
  if (value < 10) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

/**
 * 格式化现金：< 1e6 显示为 "$149" / "$10,000"；
 * 大额显示为 "1.23M $" 风格（参考截图 "2.1m $"）。
 */
export function formatCash(value: Decimal | number): string {
  const dec = Decimal.fromValue(value)
  if (dec.lt(1e6)) return `$${formatSmall(dec.toNumber())}`
  const suffix = suffixOf(dec)
  return `${dec.div(suffix.value).toNumber().toFixed(2)} ${suffix.label}$`
}

/** 格式化每秒产出："2 M $/sec"。 */
export function formatRate(value: Decimal | number): string {
  const dec = Decimal.fromValue(value)
  if (dec.lt(1e6)) return `$${formatSmall(dec.toNumber())}/sec`
  const suffix = suffixOf(dec)
  return `${dec.div(suffix.value).toNumber().toFixed(2)} ${suffix.label}$/sec`
}

function suffixOf(dec: Decimal): { value: Decimal; label: string } {
  const table = [
    { value: Decimal.pow(10, 6), label: 'M' },
    { value: Decimal.pow(10, 9), label: 'B' },
    { value: Decimal.pow(10, 12), label: 'T' },
    { value: Decimal.pow(10, 15), label: 'Qa' },
    { value: Decimal.pow(10, 18), label: 'Qi' },
  ]
  for (const item of table) {
    if (dec.gte(item.value)) return item
  }
  return { value: Decimal.pow(10, 6), label: 'M' }
}
