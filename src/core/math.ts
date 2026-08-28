import Decimal from 'break_infinity.js'

/** 常用数值常量。 */
export const D0 = new Decimal(0)
export const D1 = new Decimal(1)
export const D2 = new Decimal(2)
export const D10 = new Decimal(10)

/** IEEE 754 双精度上限，作为转生阈值边界（1.79e308）。 */
export const NUMBER_LIMIT = new Decimal(Number.MAX_VALUE)

/**
 * 阶梯加成：每购买 k 个维度，该维度基础产出倍率翻倍，即 2^(bought/k)。
 */
export function doublingMultiplier(bought: number, k: number): Decimal {
  if (bought < 0) return D1
  if (k <= 0) return D1
  return Decimal.pow(D2, Math.floor(bought / k))
}

/**
 * 成本缩放：第 n 次购买的成本 = base * growth^n。
 */
export function exponentialCost(base: Decimal, growth: Decimal, purchased: number): Decimal {
  return base.mul(growth.pow(purchased))
}

/**
 * 每秒产出速率换算：ratePerSec * dtMs。
 */
export function ratePerSecond(rate: Decimal, dtMs: number): Decimal {
  return rate.mul(dtMs).div(1000)
}

/**
 * 安全取整：去除浮点误差。当值与最近整数相差小于 1e-9 时按该整数取整，
 * 否则按正常向下取整（真实小数）。
 */
export function safeFloor(value: Decimal): Decimal {
  const rounded = value.round()
  if (value.sub(rounded).abs().lt(new Decimal(1e-9))) {
    return rounded
  }
  return Decimal.floor(value)
}

/** 以 base 为底的对数。 */
export function logBase(num: number, base: number): number {
  return Math.log(num) / Math.log(base)
}

/** 等差数列第 pos 项的和（1, 3, 6, 10, 15, 21, ...）。 */
export function getSequence(base = 1, pos = 1): number {
  return Math.round((base + (pos - 1) / 2) * pos)
}

/** 分段线性：在 breakpoint 前后使用不同的增长量。 */
export function splicedLinear(increase1: number, increase2: number, breakpoint: number, value: number): number {
  return Math.max(0, value - breakpoint) * increase2 + Math.min(breakpoint, value) * increase1
}

/** 分段指数：在 breakpoint 前后使用不同的底数。 */
export function splicedPow(exponent1: number, exponent2: number, breakpoint: number, value: number): number {
  return Math.pow(exponent2, Math.max(0, value - breakpoint)) * Math.pow(exponent1, Math.min(breakpoint, value))
}

/** 前段指数、后段线性混合。 */
export function splicedPowLinear(exponent: number, increase: number, breakpoint: number, value: number): number {
  return (Math.max(0, value - breakpoint) * increase + 1) * Math.pow(exponent, Math.min(breakpoint, value))
}

/** 从 base 起、每步增加 increase 的 amount 项和（可跳过前 skip 项）。 */
export function deltaLinear(base: number, increase: number, amount = 1, skip = 0): number {
  const finalBase = increase * skip + base
  return (finalBase + ((amount - 1) * increase) / 2) * amount
}

/** 十进制各位数字之和。 */
export function digitSum(num: number): number {
  return `${num}`.split('').reduce((acc, n) => acc + parseInt(n, 10), 0)
}

/** 取数组下标 index 的值；越界返回 fallback（Gooboo `fallbackArray`）。 */
export function fallbackArray<T>(array: T[], fallback: T, index: number): T {
  return index >= 0 && index < array.length ? array[index] : fallback
}

/** 对数型递减收益。 */
export function getDiminishing(num: number): number {
  return num <= 0 ? 0 : Math.pow(Math.log(num + 1.5), 2.1) / Math.pow(Math.log(2.5), 2.1)
}

/** 逼近上限：每次按 base/cap 的比例逼近 cap，重复 num 次后的值。 */
export function getApproaching(base: number, cap: number, num: number): number {
  return (1 - Math.pow(1 - base / cap, num)) * cap
}

/** 质数判定。 */
export function isPrime(num: number): boolean {
  for (let i = 2, n = Math.sqrt(num); i <= n; i += 1) {
    if (num % i === 0) {
      return false
    }
  }
  return num > 1
}

/** 后缀记数法（'K' = 1e3, 'M' = 1e6, 'B' = 1e9 ...），用于直译 Gooboo 数值常量。 */
export function buildNum(number: number, suffix = ''): number {
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N', 'D', 'C']
  const magnitude = suffixes.indexOf(suffix)
  if (magnitude === -1) {
    throw new Error(`Invalid suffix: ${suffix}`)
  }
  return number * Math.pow(1000, magnitude)
}
