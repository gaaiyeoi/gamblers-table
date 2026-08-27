/**
 * 任务关卡（主线）配置。
 *
 * 与"规则颠覆挑战"（challenges）不同，关卡是一条线性主线：第 1 关从极小的
 * 目标起步，逐关抬升，让新玩家很快进入正反馈循环。
 *
 * 目标大多基于"累计型统计"（累计抛币 / 累计赚取 / 累计购买维度 / 累计雇佣
 * 助手 / 骷髅代币），这些在转生后不清零，因此转生不会重置关卡进度。
 */

/** 关卡目标：多样化，覆盖不同玩法维度。 */
export type LevelGoal =
  | { type: 'totalFlips'; target: number }
  | { type: 'totalEarned'; target: number }
  | { type: 'cash'; target: number }
  | { type: 'dimensionsBought'; target: number }
  | { type: 'helpersHired'; target: number }
  | { type: 'skullTokens'; target: number }

/** 关卡奖励：机制解锁（unlockFlags）+ 永久数值加成（累乘）。 */
export type LevelReward =
  | { type: 'clickMult'; value: number }
  | { type: 'incomeMult'; value: number }
  | { type: 'flag'; flag: string }

/** 单关定义。 */
export interface LevelDef {
  /** 唯一 id，形如 level-1。 */
  id: string
  /** 目标。 */
  goal: LevelGoal
  /** 奖励。 */
  reward: LevelReward
}

/** 12 关主线：目标从小到大、玩法维度交替，奖励机制+数值结合。 */
export const LEVELS: LevelDef[] = [
  { id: 'level-1', goal: { type: 'totalEarned', target: 1_000_000 }, reward: { type: 'clickMult', value: 1.5 } },
  { id: 'level-2', goal: { type: 'totalEarned', target: 10_000_000 }, reward: { type: 'incomeMult', value: 1.5 } },
  { id: 'level-3', goal: { type: 'totalEarned', target: 100_000_000 }, reward: { type: 'flag', flag: 'bulkBuy' } },
  { id: 'level-4', goal: { type: 'helpersHired', target: 5 }, reward: { type: 'clickMult', value: 2 } },
  { id: 'level-5', goal: { type: 'dimensionsBought', target: 30 }, reward: { type: 'flag', flag: 'autobuyer' } },
  { id: 'level-6', goal: { type: 'totalEarned', target: 1_000_000_000 }, reward: { type: 'incomeMult', value: 2 } },
  { id: 'level-7', goal: { type: 'skullTokens', target: 40 }, reward: { type: 'clickMult', value: 2.5 } },
  { id: 'level-8', goal: { type: 'totalEarned', target: 10_000_000_000 }, reward: { type: 'clickMult', value: 3 } },
  { id: 'level-9', goal: { type: 'dimensionsBought', target: 120 }, reward: { type: 'incomeMult', value: 2.5 } },
  { id: 'level-10', goal: { type: 'totalFlips', target: 50_000 }, reward: { type: 'flag', flag: 'autobuyer.conditions' } },
  { id: 'level-11', goal: { type: 'totalEarned', target: 100_000_000_000 }, reward: { type: 'clickMult', value: 4 } },
  { id: 'level-12', goal: { type: 'totalEarned', target: 1_000_000_000_000 }, reward: { type: 'incomeMult', value: 5 } },
]

/** 关卡总数。 */
export const LEVEL_COUNT = LEVELS.length

/** 按 1 开始序号获取关卡定义（越界返回 undefined）。 */
export function levelAt(levelNumber: number): LevelDef | undefined {
  return LEVELS[levelNumber - 1]
}
