/**
 * 挖矿小动物的像素几何模型。
 *
 * 形体用「逐行宽度表」描述（一行一个 [起始x, 宽度]），而不是手写上百个 <rect>：
 * - 轮廓能画得更圆润（想改圆一点，加减一两格宽度即可）
 * - 描边、镜像、顶部高光都由数据自动推导，不用手工补第二遍
 * - 渲染时每个形体只输出 2~3 个 <path>，DOM 比逐格 <rect> 少一个数量级
 *
 * 画布约定：48×36，与 CSS 尺寸 1:1（保证像素锐利）；中轴 x=17；脚底 y=36。
 * 成对部件（耳/脚/爪）只写左半边，右半边由 mirrorX 推导，保证严格对称。
 */
import { MAT } from './critterPalette'

/** 一行像素：[起始 x, 宽度]。 */
export type Row = readonly [number, number]

/** 自 y 起、自上而下逐行描述的形体。 */
export interface Shape {
  y: number
  rows: readonly Row[]
}

/** 刚性矩形（五官、镐子这类规则零件）。 */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** 带固定色的矩形零件。 */
export interface FilledBox {
  box: Box
  fill: string
}

/** 画布尺寸（viewBox 与 CSS 尺寸一致，1:1 渲染）。 */
export const CANVAS = { w: 48, h: 36 } as const

/** 成对部件的镜像轴（像素列 i 的镜像列是 AXIS - 1 - i）。 */
const AXIS = 34

/** 头：宽 21 × 高 15 的圆润大头。 */
export const HEAD: Shape = {
  y: 4,
  rows: [
    [12, 11],
    [10, 15],
    [9, 17],
    [8, 19],
    [7, 21],
    [7, 21],
    [7, 21],
    [7, 21],
    [7, 21],
    [8, 19],
    [8, 19],
    [9, 17],
    [9, 17],
    [10, 15],
    [12, 11],
  ],
}

/** 躯干：宽 17 × 高 10 的胖身子。 */
export const TORSO: Shape = {
  y: 18,
  rows: [
    [12, 11],
    [11, 13],
    [10, 15],
    [9, 17],
    [9, 17],
    [9, 17],
    [9, 17],
    [10, 15],
    [10, 15],
    [11, 13],
  ],
}

/** 肚皮（浅色）。 */
export const BELLY: Shape = {
  y: 21,
  rows: [[13, 9], [12, 11], [12, 11], [12, 11], [12, 11], [13, 9], [14, 7]],
}

/** 口鼻（浅色矩形区）。 */
export const MUZZLE: Shape = {
  y: 14,
  rows: [[13, 9], [13, 9], [13, 9], [13, 9], [13, 9]],
}

/** 左耳。 */
export const EAR_L: Shape = {
  y: 5,
  rows: [[6, 3], [5, 4], [4, 5], [4, 5], [4, 5], [4, 5], [5, 4], [6, 3]],
}

/** 左耳内耳（靠脸侧的一小条粉色，右耳由 mirrorX 推导）。 */
export const EAR_INNER_L: Shape = {
  y: 7,
  rows: [[6, 1], [6, 1], [6, 1], [6, 1], [6, 1]],
}

/** 左后脚。 */
export const FOOT_L: Shape = {
  y: 28,
  rows: [[11, 5], [10, 7], [10, 7], [10, 7], [10, 7], [10, 7], [10, 7], [10, 7]],
}

/** 左前爪（撑地扒土那侧）。 */
export const PAW_L: Shape = {
  y: 21,
  rows: [[7, 4], [6, 5], [5, 6], [5, 6], [4, 7], [4, 7], [4, 7], [5, 6], [5, 6], [6, 5], [6, 5]],
}

/** 擦汗时抬起的手臂（从左肩斜伸到额头）。 */
export const WIPE_ARM: Shape = {
  y: 8,
  rows: [
    [12, 5],
    [12, 5],
    [11, 6],
    [10, 5],
    [9, 4],
    [8, 3],
    [7, 3],
    [6, 3],
    [6, 3],
    [6, 3],
    [6, 3],
    [6, 3],
    [6, 3],
    [6, 3],
    [6, 3],
  ],
}

/** 沿中轴镜像，得到成对部件的右半边。 */
export function mirrorX(shape: Shape): Shape {
  return {
    y: shape.y,
    rows: shape.rows.map(([x, w]) => [AXIS - x - w, w] as Row),
  }
}

/** 外扩一圈得到描边轮廓（左右各 1 格，上下各补一行）。 */
export function outlineOf(shape: Shape): Shape {
  const rows = shape.rows.map(([x, w]) => [x - 1, w + 2] as Row)
  const first = rows[0]
  const last = rows[rows.length - 1]
  return { y: shape.y - 1, rows: [first, ...rows, last] }
}

/** 截取前 n 行（顶部受光的高光带）。 */
export function topRows(shape: Shape, n: number): Shape {
  return { y: shape.y, rows: shape.rows.slice(0, n) }
}

/** 逐行宽度表 → SVG path（顺时针闭合，阶梯边即像素轮廓）。 */
export function shapeToPath(shape: Shape): string {
  const rows = shape.rows
  const first = rows[0]
  const last = rows[rows.length - 1]
  const rightOf = (i: number): number => rows[i][0] + rows[i][1]
  const cmds = [`M${first[0]} ${shape.y}`, `h${first[1]}`]

  // 右侧：逐行下移一格，并横向对齐到当前行的右边界
  for (let i = 1; i < rows.length; i += 1) {
    cmds.push('v1')
    const delta = rightOf(i) - rightOf(i - 1)
    if (delta !== 0) cmds.push(`h${delta}`)
  }
  cmds.push('v1')
  // 底边回到左侧
  cmds.push(`h${-last[1]}`)
  // 左侧：逐行上移一格
  for (let i = rows.length - 1; i > 0; i -= 1) {
    cmds.push('v-1')
    const delta = rows[i - 1][0] - rows[i][0]
    if (delta !== 0) cmds.push(`h${delta}`)
  }
  cmds.push('v-1', 'Z')
  return cmds.join('')
}

/* ── 五官与装备 ── */

/** 静态五官：头灯绑带 + 胡须。 */
export const FACE_STATIC: readonly FilledBox[] = [
  { box: { x: 7, y: 7, w: 21, h: 2 }, fill: MAT.strap },
  { box: { x: 7, y: 7, w: 21, h: 1 }, fill: MAT.strapLight },
  { box: { x: 9, y: 15, w: 4, h: 1 }, fill: MAT.whisker },
  { box: { x: 22, y: 15, w: 4, h: 1 }, fill: MAT.whisker },
]

/** 双眼：眼珠 + 高光（整组做眨眼）。 */
export const EYES: readonly FilledBox[] = [
  { box: { x: 11, y: 11, w: 4, h: 4 }, fill: MAT.eye },
  { box: { x: 20, y: 11, w: 4, h: 4 }, fill: MAT.eye },
  { box: { x: 11, y: 11, w: 2, h: 2 }, fill: MAT.eyeShine },
  { box: { x: 20, y: 11, w: 2, h: 2 }, fill: MAT.eyeShine },
]

/** 鼻子（整组做抽动）。 */
export const NOSE: readonly FilledBox[] = [
  { box: { x: 15, y: 15, w: 4, h: 2 }, fill: MAT.nose },
  { box: { x: 15, y: 15, w: 2, h: 1 }, fill: MAT.noseLight },
]

/** 头灯（整组做闪烁）。 */
export const LAMP: readonly FilledBox[] = [
  { box: { x: 14, y: 4, w: 7, h: 6 }, fill: MAT.lampCase },
  { box: { x: 14, y: 4, w: 7, h: 1 }, fill: MAT.lampCaseLight },
  { box: { x: 15, y: 5, w: 5, h: 4 }, fill: MAT.lampGlass },
  { box: { x: 15, y: 5, w: 2, h: 2 }, fill: MAT.lampCore },
]

/** 前爪的爪尖（左右各一）。 */
export const PAW_CLAWS: readonly FilledBox[] = [
  { box: { x: 6, y: 31, w: 3, h: 1 }, fill: MAT.claw },
  { box: { x: 23, y: 31, w: 3, h: 1 }, fill: MAT.claw },
]

/** 擦汗臂的爪尖。 */
export const WIPE_CLAW: FilledBox = { box: { x: 12, y: 8, w: 5, h: 1 }, fill: MAT.claw }

/** 镐子的分层名。 */
export type PickPart =
  | 'headTop'
  | 'headBody'
  | 'headTipL'
  | 'headTipR'
  | 'collar'
  | 'shaftLight'
  | 'shaftBody'
  | 'shaftDark'
  | 'grip'

/** 镐子各层几何（数组顺序即绘制顺序，自然姿态下镐头朝正上方）。 */
export const PICK_LAYERS: readonly { part: PickPart; box: Box }[] = [
  { part: 'headTop', box: { x: 21, y: 2, w: 11, h: 1 } },
  { part: 'headBody', box: { x: 21, y: 3, w: 11, h: 1 } },
  { part: 'headTipL', box: { x: 20, y: 4, w: 2, h: 2 } },
  { part: 'headTipR', box: { x: 31, y: 4, w: 2, h: 2 } },
  { part: 'collar', box: { x: 25, y: 2, w: 3, h: 6 } },
  { part: 'shaftLight', box: { x: 25, y: 8, w: 1, h: 18 } },
  { part: 'shaftBody', box: { x: 26, y: 8, w: 1, h: 18 } },
  { part: 'shaftDark', box: { x: 27, y: 8, w: 1, h: 18 } },
  { part: 'grip', box: { x: 25, y: 19, w: 3, h: 8 } },
]

/** 各部件的旋转锚点（viewBox 坐标）。 */
export const ANCHOR = {
  /** 镐子的握把中心（挥镐绕此点）。 */
  pick: [26.5, 20] as const,
  /** 左爪肩关节。 */
  pawL: [8.5, 21] as const,
  /** 右爪肩关节。 */
  pawR: [24.5, 21] as const,
  /** 擦汗臂的肩关节。 */
  wipe: [7.5, 22] as const,
  /** 头与脖子相连的旋转中心。 */
  neck: [17, 18] as const,
  /** 左耳根。 */
  earL: [7.5, 12] as const,
  /** 右耳根。 */
  earR: [26.5, 12] as const,
} as const

/** 镐头砸地的落点（土块从这里迸出）。 */
export const IMPACT = { x: 37.5, y: 31 } as const

/** 挥镐弧线（度）：0% 举到最高，36% 砸到最低。 */
export const PICK_ARC = { up: 38, down: 135, recoil: 127, pull: 95 } as const
