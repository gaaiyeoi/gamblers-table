/**
 * core 层统一导出入口。业务层/绑定层只允许从此入口导入 core 能力。
 */

// 引擎
export * from './engine/eventBus'
export * from './engine/gameLoop'
export * from './engine/spawnQueue'
export * from './engine/timeManager'

// 基础设施
export * from './cache'
export * from './math'
export * from './format'

// 状态
export * from './state/gameState'
export * from './state/schema'
export * from './state/deepMerge'
export * from './state/serializer'

// 数据配置
export * from './data/mining'
export * from './data/milestones'
export * from './data/miningAchievements'
export * from './data/miningCards'
export * from './data/miningNames'
export * from './data/miningNotes'
export * from './data/miningPremiumUpgrades'
export * from './data/miningUpgrades'
export * from './data/prestigeTiers'
export * from './data/relics'

// 机制
export * from './mechanics/mining'
export * from './mechanics/blockReasons'
export * from './mechanics/prestige'
export * from './mechanics/automator'
