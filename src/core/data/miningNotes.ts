/**
 * 采矿探险日志（Gooboo 的 notes，1:1 深度映射）。
 *
 * 发现机制（Gooboo `js/modules/mining.js`）：
 * 子模式 0 首次击穿某层时，若 `notes[maxDepth0 - 1]` 存在则记录该笔记。
 * 本项目将笔记 id 存进 `MiningState.discoveredNotes`。
 *
 * 文案为中文简版（原版为 Gooboo 的 flavor 文本）。
 */

export interface MiningNote {
  id: string
  depth: number
  title: string
  text: string
}

/** 深度 → 笔记。 */
export const MINING_NOTES: readonly MiningNote[] = [
  { id: 'mining_0', depth: 1, title: '第一层', text: '头顶的矿灯在嗡嗡作响，这是属于你的第一块岩壁。' },
  { id: 'mining_1', depth: 2, title: '黑暗之下', text: '再往下，黑暗会越来越浓，但你知道那里藏着更多。' },
  { id: 'mining_2', depth: 4, title: '矿脉低语', text: '据说最深的矿工会听见石头在低语。' },
  { id: 'mining_3', depth: 7, title: '老镐子的提醒', text: '祖父的镐子说：慢慢来，石头不会跑。' },
  { id: 'meta_1', depth: 9, title: '碑文', text: '墙上刻着一行字：越深，越值得。' },
  { id: 'meta_2', depth: 11, title: '前人的标记', text: '有人在你之前来过，留下了记号。' },
  { id: 'mining_4', depth: 14, title: '回声', text: '你的每一声镐响，都会变成下一层的回声。' },
  { id: 'mining_5', depth: 16, title: '锡的味道', text: '空气里开始有了金属的气息。' },
  { id: 'mining_6', depth: 19, title: '矿工的信念', text: '相信你的镐，也相信你的耐心。' },
  { id: 'mining_7', depth: 21, title: '岔路', text: '每条岔路都通向不同的矿藏。' },
  { id: 'mining_8', depth: 24, title: '铁矿脉', text: '铁的硬度考验着你的镐。' },
  { id: 'mining_9', depth: 29, title: '隧道工坊', text: '有人在这里短暂停留，工具还散落着。' },
  { id: 'mining_10', depth: 31, title: '温度', text: '越往深处，空气越暖。' },
  { id: 'mining_11', depth: 34, title: '石中火', text: '缝隙里透出橙红的光。' },
  { id: 'mining_12', depth: 39, title: '熔岩的低鸣', text: '大地的心脏在更深处跳动。' },
  { id: 'mining_13', depth: 45, title: '金属的呼唤', text: '钛在呼唤你。' },
  { id: 'mining_14', depth: 49, title: '古老矿道', text: '这条矿道比想象中更古老。' },
  { id: 'mining_15', depth: 51, title: '矿脉之花', text: '岩壁上竟开出了结晶的花。' },
  { id: 'mining_16', depth: 56, title: '耐力的考验', text: '挖矿是体力的较量，也是意志的较量。' },
  { id: 'mining_17', depth: 62, title: '铂的光泽', text: '铂矿在黑暗中闪着柔光。' },
  { id: 'mining_19', depth: 69, title: '深渊边缘', text: '再往下，就是连老矿工都少去的地方。' },
  { id: 'mining_20', depth: 70, title: '第 70 层', text: '七十层，一个值得纪念的里程碑。' },
  { id: 'mining_21', depth: 79, title: '孤勇', text: '越深，越孤独；但越深，越富有。' },
  { id: 'mining_22', depth: 90, title: '煤的温暖', text: '煤能带来光和热，是矿工的宝藏。' },
  { id: 'mining_23', depth: 95, title: '硫磺味', text: '刺鼻的硫磺味预示着危险与财富。' },
  { id: 'mining_24', depth: 103, title: '铱的星光', text: '铱矿反射着像星星一样的光。' },
  { id: 'mining_26', depth: 119, title: '深处的壁画', text: '石壁上有一幅古老的矿工壁画。' },
  { id: 'mining_27', depth: 124, title: '锇的沉重', text: '锇是沉重而珍贵的金属。' },
  { id: 'mining_28', depth: 133, title: '暗流', text: '你听到更深处的暗流涌动。' },
  { id: 'mining_29', depth: 144, title: '铅的古老', text: '铅很古老，也很沉重。' },
  { id: 'mining_31', depth: 157, title: '寂静之地', text: '这里的寂静，让心跳格外清晰。' },
  { id: 'mining_32', depth: 166, title: '光的尽头', text: '你的灯，成了这里唯一的光。' },
  { id: 'mining_33', depth: 174, title: '至深处', text: '你已抵达前人未曾到达的深处。' },
]

const NOTE_BY_DEPTH: Record<number, MiningNote> = {}
for (const note of MINING_NOTES) {
  NOTE_BY_DEPTH[note.depth] = note
}
void NOTE_BY_DEPTH

/** 按深度取笔记（无则 undefined）。 */
export function noteAtDepth(depth: number): MiningNote | undefined {
  return NOTE_BY_DEPTH[depth]
}
