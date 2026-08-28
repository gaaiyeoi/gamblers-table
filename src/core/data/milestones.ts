/**
 * 里程碑引导（主线进度提示）
 *
 * 把 Gooboo 的整条推进路线串成"有节奏、有步骤、有引导"的关卡流程：
 * 每当玩家到达一个关键节点（首次解锁某个机制 / 首次转生 / 开启气态子模式等），
 * 就弹出一个里程碑提示，说明"解锁了什么 + 下一步做什么"。
 *
 * 只提示一次（由 uiStore 记录已展示 id），跨转生不重复打扰。
 */

import type { MiningState } from '../state/gameState'

/** 里程碑节点定义。 */
export interface MilestoneDef {
  /** 唯一 id，用于"只弹一次"去重。 */
  id: string
  /** 图标（emoji，沿用现有像素风格）。 */
  icon: string
  /** 标题（玩家看到的里程碑名）。 */
  title: string
  /** 解锁了什么。 */
  desc: string
  /** 下一步做什么（引导主线）。 */
  next: string
  /** 触发条件：达到即弹窗。 */
  condition: (m: MiningState) => boolean
}

/**
 * 里程碑主线（按玩家推进顺序排列）。
 *
 * 以普通矿（subfeature 0）的历史最大深度为主轴，对齐升级树的解锁门槛：
 *   - 深度 5    → 废料增速升级
 *   - 深度 15   → 铝矿产出
 *   - 深度 20   → 镐子锻造（craftingStation）
 *   - 深度 40   → 深度居民 + 转生（depthDweller）
 *   - 深度 60   → 熔炼厂（smeltery）
 *   - 深度 105  → 锭增强（enhancingStation）
 *   - 深度 150  → 树脂（stickyJar）
 * 之后是首次转生，以及全局等级 625 解锁的气态子模式。
 */
export const MILESTONES: readonly MilestoneDef[] = [
  {
    id: 'begin',
    icon: '⛏',
    title: '欢迎来到矿洞',
    desc: '小动物军团会自动刨土，把废料和矿石挖出来。',
    next: '先积攒废料，然后在「升级树」购买第一个升级，提高伤害与产出。',
    condition: () => true,
  },
  {
    id: 'depth5',
    icon: '📈',
    title: '深度 5：废料增速',
    desc: '解锁废料增速升级「scrapGainUp」，废料产出更快。',
    next: '在升级树继续提升废料产出与容量，往更深的矿层挖。',
    condition: (m) => m.maxDepth0 >= 5,
  },
  {
    id: 'depth15',
    icon: '🪨',
    title: '深度 15：矿石开采',
    desc: '铝矿开始产出，可以收集并存入槽位。',
    next: '积攒铝矿，为深度 20 解锁的「镐子锻造」做准备。',
    condition: (m) => m.maxDepth0 >= 15,
  },
  {
    id: 'depth20',
    icon: '🔨',
    title: '深度 20：镐子锻造',
    desc: '解锁「镐子锻造」——把矿石放入槽位锻造，提升镐子威力。',
    next: '在「镐子锻造」区放入矿石并点击锻造，品质与纯度决定威力提升概率。',
    condition: (m) => m.maxDepth0 >= 20,
  },
  {
    id: 'depth40',
    icon: '🏠',
    title: '深度 40：深度居民',
    desc: '解锁「深度居民」——居民随时间累积，是转生的关键资源。',
    next: '当居民达到上限时，点击「转生」兑换水晶，进入声望循环。',
    condition: (m) => m.maxDepth0 >= 40,
  },
  {
    id: 'depth60',
    icon: '🔥',
    title: '深度 60：熔炼厂',
    desc: '解锁「熔炼厂」——投入矿石与稀有物，按温度与堆料成本产出锭。',
    next: '用熔炼的锭来强化镐子锻造，突破更高硬度矿层。',
    condition: (m) => m.maxDepth0 >= 60,
  },
  {
    id: 'depth105',
    icon: '✨',
    title: '深度 105：锭增强',
    desc: '解锁「锭增强」——消耗锭，按锭型给对应效果加成。',
    next: '选择要增强的锭并点击增强，本声望内产出显著提升。',
    condition: (m) => m.maxDepth0 >= 105,
  },
  {
    id: 'firstPrestige',
    icon: '💎',
    title: '首次转生',
    desc: '完成转生，获得绿水晶，正式进入声望循环。',
    next: '用水晶购买「声望升级」，它们跨转生保留，让你越转越强。',
    condition: (m) => m.prestigeCount >= 1,
  },
  {
    id: 'depth150',
    icon: '🧪',
    title: '深度 150：树脂',
    desc: '解锁「树脂」——锻造/熔炼的进阶消耗材料。',
    next: '继续推进深度，解锁更多稀有物与产线。',
    condition: (m) => m.maxDepth0 >= 150,
  },
  {
    id: 'gasSubfeature',
    icon: '💨',
    title: '气态子模式',
    desc: '全局等级达到 625，解锁「气态矿」子模式。',
    next: '下次转生选择「气态矿」，探索全新的气体资源与专属升级。',
    condition: (m) => m.unlocks['miningGasSubfeature']?.see === true,
  },
]

const MILESTONE_MAP: Record<string, MilestoneDef> = {}
for (const def of MILESTONES) {
  MILESTONE_MAP[def.id] = def
}

/** 按 id 取里程碑定义。 */
export function milestoneOf(id: string): MilestoneDef {
  const def = MILESTONE_MAP[id]
  if (def === undefined) {
    throw new Error(`unknown milestone: ${id}`)
  }
  return def
}

/**
 * 从当前状态中筛出"已达成且尚未展示过"的里程碑。
 * 返回顺序即定义顺序（玩家推进会按节奏依次弹出）。
 */
export function checkNewMilestones(
  m: MiningState,
  seen: ReadonlySet<string>,
): MilestoneDef[] {
  return MILESTONES.filter((ms) => !seen.has(ms.id) && ms.condition(m))
}
