import type { GameState } from '../state/gameState'

/**
 * 脚本动作执行器由 store 注入，core 只负责解析与判定。
 * 自动化用于采矿经济的转生：`if cash >= 1e8 then prestige 1`。
 */

/** 支持的比较操作。 */
export type Comparison = '>' | '>=' | '<' | '<=' | '=='
/** 支持的自动化动作。 */
export type AutomatorAction = { type: 'prestige'; tier: number }

export interface AutomatorRule {
  metric: 'cash' | 'reputation'
  comparison: Comparison
  value: number
  action: AutomatorAction
}

export interface AutomatorResult {
  action: AutomatorAction | null
  error: string | null
}

/** 内置策略 DSL（受限语法，不执行任意 JavaScript，确保存档脚本安全）。 */
export function parseAutomatorScript(script: string): AutomatorRule[] {
  const rules: AutomatorRule[] = []
  for (const rawLine of script.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const match = line.match(/^if\s+(cash|reputation)\s*(>=|<=|==|>|<)\s*([\d.eE+-]+)\s+then\s+prestige\s+([\w-]+)$/i)
    if (match === null) throw new Error(`无法解析自动化规则：${line}`)
    const metric = match[1] as AutomatorRule['metric']
    const comparison = match[2] as Comparison
    const value = Number(match[3])
    if (!Number.isFinite(value)) throw new Error(`自动化阈值不是有限数字：${match[3]}`)
    rules.push({ metric, comparison, value, action: { type: 'prestige', tier: Number(match[4]) } })
  }
  return rules
}

function metricValue(state: GameState, metric: AutomatorRule['metric']): number {
  if (metric === 'cash') return state.cash.toNumber()
  // reputation 指标：读取采矿声望货币（绿水晶）
  return state.mining.currency.crystalGreen ?? 0
}

function compare(left: number, op: Comparison, right: number): boolean {
  if (op === '>') return left > right
  if (op === '>=') return left >= right
  if (op === '<') return left < right
  if (op === '<=') return left <= right
  return left === right
}

/** 执行一次脚本评估，返回第一条命中的动作。 */
export function evaluateAutomator(state: GameState, rules: AutomatorRule[]): AutomatorResult {
  for (const rule of rules) {
    if (compare(metricValue(state, rule.metric), rule.comparison, rule.value)) {
      return { action: rule.action, error: null }
    }
  }
  return { action: null, error: null }
}

/** 解析并评估脚本；错误作为结构化结果返回，不让主循环崩溃。 */
export function evaluateScript(state: GameState, script: string): AutomatorResult {
  try {
    return evaluateAutomator(state, parseAutomatorScript(script))
  } catch (error) {
    return { action: null, error: error instanceof Error ? error.message : '自动化脚本错误' }
  }
}
