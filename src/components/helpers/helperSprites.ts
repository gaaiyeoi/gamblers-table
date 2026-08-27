/**
 * 助手 16×16 真实像素画（SVG）：
 * 每个助手有独特的动物/角色造型与配色，供助手页面头像与桌布精灵复用。
 */

/** 每种助手的 16×16 像素画 SVG 字符串（key = 助手 id）。 */
export const HELPER_SPRITES: Record<string, string> = {
  // 小鸭学徒：黄鸭
  novice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="1" width="6" height="1" fill="#f5c518"/>
    <rect x="4" y="2" width="8" height="4" fill="#f5c518"/>
    <rect x="3" y="3" width="1" height="2" fill="#f5c518"/>
    <rect x="11" y="3" width="2" height="1" fill="#ff8c00"/>
    <rect x="4" y="4" width="1" height="1" fill="#000"/>
    <rect x="7" y="4" width="1" height="1" fill="#000"/>
    <rect x="3" y="6" width="10" height="5" fill="#f5a623"/>
    <rect x="2" y="7" width="1" height="3" fill="#f5a623"/>
    <rect x="13" y="7" width="1" height="3" fill="#f5a623"/>
    <rect x="4" y="11" width="2" height="3" fill="#f5a623"/>
    <rect x="9" y="11" width="2" height="3" fill="#f5a623"/>
    <rect x="3" y="13" width="4" height="1" fill="#ff8c00"/>
    <rect x="8" y="13" width="4" height="1" fill="#ff8c00"/>
  </svg>`,

  // 狐狸老手：橙红狐狸
  apprentice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="1" width="2" height="3" fill="#ef4444"/>
    <rect x="12" y="1" width="2" height="3" fill="#ef4444"/>
    <rect x="4" y="2" width="8" height="4" fill="#ef4444"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fca5a5"/>
    <rect x="3" y="6" width="10" height="5" fill="#dc2626"/>
    <rect x="5" y="6" width="6" height="2" fill="#fca5a5"/>
    <rect x="2" y="8" width="1" height="2" fill="#ef4444"/>
    <rect x="13" y="8" width="1" height="2" fill="#ef4444"/>
    <rect x="4" y="11" width="3" height="3" fill="#ef4444"/>
    <rect x="9" y="11" width="3" height="3" fill="#ef4444"/>
    <rect x="3" y="14" width="4" height="1" fill="#7a0000"/>
    <rect x="9" y="14" width="4" height="1" fill="#7a0000"/>
  </svg>`,

  // 熊力壮汉：棕熊
  journeyman: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="2" height="2" fill="#92400e"/>
    <rect x="11" y="1" width="2" height="2" fill="#92400e"/>
    <rect x="4" y="2" width="8" height="5" fill="#92400e"/>
    <rect x="5" y="5" width="1" height="1" fill="#000"/>
    <rect x="9" y="5" width="1" height="1" fill="#000"/>
    <rect x="6" y="6" width="4" height="1" fill="#d97706"/>
    <rect x="2" y="7" width="12" height="5" fill="#78350f"/>
    <rect x="5" y="7" width="6" height="3" fill="#92400e"/>
    <rect x="2" y="9" width="2" height="2" fill="#92400e"/>
    <rect x="12" y="9" width="2" height="2" fill="#92400e"/>
    <rect x="4" y="12" width="3" height="3" fill="#78350f"/>
    <rect x="9" y="12" width="3" height="3" fill="#78350f"/>
  </svg>`,

  // 魔法师傅：紫袍
  expert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="0" width="6" height="1" fill="#4c1d95"/>
    <rect x="4" y="1" width="8" height="1" fill="#7c3aed"/>
    <rect x="5" y="2" width="6" height="4" fill="#a78bfa"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#c4b5fd"/>
    <rect x="3" y="6" width="10" height="6" fill="#5b21b6"/>
    <rect x="2" y="7" width="1" height="4" fill="#7c3aed"/>
    <rect x="13" y="7" width="1" height="4" fill="#7c3aed"/>
    <rect x="7" y="6" width="2" height="1" fill="#ffd700"/>
    <rect x="4" y="12" width="3" height="3" fill="#4c1d95"/>
    <rect x="9" y="12" width="3" height="3" fill="#4c1d95"/>
    <rect x="13" y="9" width="2" height="2" fill="#ffd700"/>
  </svg>`,

  // 冰霜大师：冰蓝
  master: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="1" width="6" height="4" fill="#7dd3fc"/>
    <rect x="4" y="2" width="1" height="3" fill="#7dd3fc"/>
    <rect x="11" y="2" width="1" height="3" fill="#7dd3fc"/>
    <rect x="5" y="3" width="1" height="1" fill="#000"/>
    <rect x="9" y="3" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#e0f2fe"/>
    <rect x="3" y="6" width="10" height="5" fill="#0ea5e9"/>
    <rect x="2" y="7" width="1" height="4" fill="#38bdf8"/>
    <rect x="13" y="7" width="1" height="4" fill="#38bdf8"/>
    <rect x="4" y="11" width="3" height="4" fill="#0369a1"/>
    <rect x="9" y="11" width="3" height="4" fill="#0369a1"/>
    <rect x="6" y="0" width="1" height="2" fill="#bae6fd"/>
    <rect x="9" y="0" width="1" height="2" fill="#bae6fd"/>
  </svg>`,

  // 炎炎宗师：火红
  grandmaster: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="6" y="0" width="4" height="2" fill="#ef4444"/>
    <rect x="5" y="1" width="6" height="4" fill="#fca5a5"/>
    <rect x="5" y="3" width="1" height="1" fill="#000"/>
    <rect x="9" y="3" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fee2e2"/>
    <rect x="3" y="6" width="10" height="5" fill="#dc2626"/>
    <rect x="2" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="13" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="6" y="6" width="4" height="2" fill="#fca5a5"/>
    <rect x="4" y="11" width="3" height="4" fill="#991b1b"/>
    <rect x="9" y="11" width="3" height="4" fill="#991b1b"/>
    <rect x="5" y="0" width="1" height="1" fill="#ffd700"/>
    <rect x="10" y="0" width="1" height="1" fill="#ffd700"/>
  </svg>`,

  // 传奇英雄：金色
  legend: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="0" width="8" height="2" fill="#ffd700"/>
    <rect x="5" y="2" width="6" height="4" fill="#fef08a"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fff"/>
    <rect x="3" y="6" width="10" height="5" fill="#b8860b"/>
    <rect x="5" y="6" width="6" height="3" fill="#d4a017"/>
    <rect x="2" y="7" width="1" height="4" fill="#ffd700"/>
    <rect x="13" y="7" width="1" height="4" fill="#ffd700"/>
    <rect x="4" y="11" width="3" height="4" fill="#92680a"/>
    <rect x="9" y="11" width="3" height="4" fill="#92680a"/>
    <rect x="3" y="0" width="1" height="2" fill="#ffd700"/>
    <rect x="12" y="0" width="1" height="2" fill="#ffd700"/>
  </svg>`,

  // 神话存在：粉紫
  mythic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="10" height="1" fill="#ec4899"/>
    <rect x="5" y="2" width="6" height="4" fill="#f9a8d4"/>
    <rect x="3" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="11" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="5" y="4" width="1" height="1" fill="#000"/>
    <rect x="9" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="5" width="4" height="1" fill="#fce7f3"/>
    <rect x="3" y="6" width="10" height="5" fill="#be185d"/>
    <rect x="5" y="6" width="6" height="3" fill="#ec4899"/>
    <rect x="2" y="7" width="1" height="4" fill="#f472b6"/>
    <rect x="13" y="7" width="1" height="4" fill="#f472b6"/>
    <rect x="4" y="11" width="3" height="4" fill="#9d174d"/>
    <rect x="9" y="11" width="3" height="4" fill="#9d174d"/>
    <rect x="7" y="0" width="2" height="1" fill="#a855f7"/>
    <rect x="6" y="15" width="4" height="1" fill="#ec4899"/>
  </svg>`,
}

/** 助手 id 的展示顺序（与 HELPER_TYPES 一致）。 */
export const HELPER_SPRITE_IDS: string[] = Object.keys(HELPER_SPRITES)

/** 取某个助手的 16×16 像素画 SVG 字符串（未知 id 兜底为小鸭 novice）。 */
export function helperSpriteSvg(id: string): string {
  return HELPER_SPRITES[id] ?? HELPER_SPRITES.novice!
}

/** 生成助手像素画的 data URL（可直接作为 <img src>）。 */
export function helperSpriteDataUrl(id: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(helperSpriteSvg(id))}`
}
