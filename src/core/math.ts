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
