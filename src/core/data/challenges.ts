import Decimal from 'break_infinity.js'

/** 规则颠覆挑战的类型。 */
export type ChallengeRule =
  | { type: 'banDimensions'; tiers: number[] }
  | { type: 'reversePurchase'; ratio: number; sourceTier: number }
  | { type: 'opposition'; growthPerSec: Decimal; failureRatio: number }

export interface ChallengeDef {
  id: string
  nameKey: string
  descriptionKey: string
  rules: ChallengeRule[]
  /** 完成条件：cash 达到目标。 */
  target: Decimal
  /** 机制级奖励解锁位。 */
  rewardFlag: string
}

/** 三个 MVP 挑战：封禁、反向扣减、动态对抗。 */
export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'evenOnly',
    nameKey: 'challenges.evenOnly.name',
    descriptionKey: 'challenges.evenOnly.description',
    rules: [{ type: 'banDimensions', tiers: [1, 3, 5, 7] }],
    target: new Decimal(1e5),
    rewardFlag: 'bulkBuy',
  },
  {
    id: 'reverseFlow',
    nameKey: 'challenges.reverseFlow.name',
    descriptionKey: 'challenges.reverseFlow.description',
    rules: [{ type: 'reversePurchase', ratio: 0.1, sourceTier: 2 }],
    target: new Decimal(5e5),
    rewardFlag: 'autobuyer.conditions',
  },
  {
    id: 'darkMatter',
    nameKey: 'challenges.darkMatter.name',
    descriptionKey: 'challenges.darkMatter.description',
    rules: [{ type: 'opposition', growthPerSec: new Decimal(2), failureRatio: 1 }],
    target: new Decimal(1e6),
    rewardFlag: 'challenge.switching',
  },
]

export function challengeOf(id: string): ChallengeDef {
  const def = CHALLENGES.find((item) => item.id === id)
  if (def === undefined) throw new Error(`未知挑战 id：${id}`)
  return def
}