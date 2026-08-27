/**
 * core 层统一导出入口（参考 antimatter-dimensions 的 globals.js 聚合模式）。
 * 业务层/绑定层只允许从此入口导入 core 能力，禁止散落深层 import。
 */

// 引擎
export * from './engine/eventBus'
export * from './engine/gameLoop'
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
export * from './data/coinTypes'
export * from './data/helperTypes'
export * from './data/gachaPool'
export * from './data/prestigeTiers'
export * from './data/talents'
export * from './data/challenges'

// 机制
export * from './mechanics/derivativeChain'
export * from './mechanics/coins'
export * from './mechanics/helpers'
export * from './mechanics/gacha'
export * from './mechanics/autobuyers'
export * from './mechanics/prestige'
export * from './mechanics/talentTree'
export * from './mechanics/challenges'
export * from './mechanics/automator'
