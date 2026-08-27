/**
 * 助手 16×16 真实像素画（SVG）：
 * 每个助手有独特的动物/角色造型与配色，供助手页面头像与桌布精灵复用。
 */

/** 每种助手的 16×16 像素画 SVG 字符串（key = 助手 id）。 */
export const HELPER_SPRITES: Record<string, string> = {
  // 小鸭学徒：黄鸭（翘毛 + 扁嘴 + 翅膀 + 脚蹼）
  novice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="7" y="0" width="2" height="1" fill="#e8a800"/>
    <rect x="4" y="1" width="8" height="5" fill="#f5c518"/>
    <rect x="4" y="1" width="8" height="1" fill="#ffe14d"/>
    <rect x="12" y="2" width="1" height="3" fill="#e8a800"/>
    <rect x="5" y="3" width="1" height="2" fill="#1f2937"/>
    <rect x="10" y="3" width="1" height="2" fill="#1f2937"/>
    <rect x="5" y="3" width="1" height="1" fill="#fff"/>
    <rect x="10" y="3" width="1" height="1" fill="#fff"/>
    <rect x="5" y="6" width="6" height="2" fill="#ff8c00"/>
    <rect x="5" y="6" width="6" height="1" fill="#e07000"/>
    <rect x="3" y="8" width="10" height="5" fill="#f5a623"/>
    <rect x="3" y="8" width="10" height="1" fill="#ffd166"/>
    <rect x="12" y="9" width="1" height="3" fill="#e8950a"/>
    <rect x="4" y="9" width="2" height="3" fill="#e8a800"/>
    <rect x="10" y="9" width="2" height="3" fill="#e8a800"/>
    <rect x="4" y="13" width="3" height="1" fill="#ff8c00"/>
    <rect x="9" y="13" width="3" height="1" fill="#ff8c00"/>
    <rect x="3" y="14" width="5" height="1" fill="#e07000"/>
    <rect x="8" y="14" width="5" height="1" fill="#e07000"/>
  </svg>`,

  // 狐狸老手：橙狐（尖耳 + 白色尖嘴 + 白胸 + 蓬尾）
  apprentice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="0" width="1" height="1" fill="#c2410c"/>
    <rect x="11" y="0" width="1" height="1" fill="#c2410c"/>
    <rect x="3" y="1" width="3" height="1" fill="#c2410c"/>
    <rect x="10" y="1" width="3" height="1" fill="#c2410c"/>
    <rect x="3" y="2" width="2" height="1" fill="#ea580c"/>
    <rect x="11" y="2" width="2" height="1" fill="#ea580c"/>
    <rect x="5" y="2" width="1" height="1" fill="#fdba74"/>
    <rect x="10" y="2" width="1" height="1" fill="#fdba74"/>
    <rect x="3" y="3" width="10" height="3" fill="#f97316"/>
    <rect x="3" y="3" width="10" height="1" fill="#ea580c"/>
    <rect x="12" y="4" width="1" height="2" fill="#ea580c"/>
    <rect x="5" y="4" width="2" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="2" height="1" fill="#1f2937"/>
    <rect x="6" y="6" width="4" height="1" fill="#fff7ed"/>
    <rect x="6" y="7" width="4" height="1" fill="#fff7ed"/>
    <rect x="7" y="8" width="2" height="1" fill="#fff7ed"/>
    <rect x="7" y="6" width="2" height="1" fill="#1f2937"/>
    <rect x="4" y="9" width="8" height="4" fill="#f97316"/>
    <rect x="4" y="9" width="8" height="1" fill="#ea580c"/>
    <rect x="6" y="9" width="4" height="3" fill="#fff7ed"/>
    <rect x="12" y="10" width="2" height="3" fill="#f97316"/>
    <rect x="13" y="9" width="1" height="1" fill="#fff7ed"/>
    <rect x="4" y="13" width="3" height="2" fill="#c2410c"/>
    <rect x="9" y="13" width="3" height="2" fill="#c2410c"/>
    <rect x="4" y="14" width="3" height="1" fill="#7c2d12"/>
    <rect x="9" y="14" width="3" height="1" fill="#7c2d12"/>
  </svg>`,

  // 熊力壮汉：棕熊（圆耳 + 浅色口鼻 + 圆胖身体）
  journeyman: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="3" height="3" fill="#92400e"/>
    <rect x="10" y="1" width="3" height="3" fill="#92400e"/>
    <rect x="4" y="2" width="1" height="1" fill="#b45309"/>
    <rect x="11" y="2" width="1" height="1" fill="#b45309"/>
    <rect x="3" y="4" width="10" height="5" fill="#92400e"/>
    <rect x="3" y="4" width="10" height="1" fill="#b45309"/>
    <rect x="5" y="5" width="1" height="2" fill="#1f2937"/>
    <rect x="10" y="5" width="1" height="2" fill="#1f2937"/>
    <rect x="6" y="7" width="4" height="2" fill="#d97706"/>
    <rect x="7" y="8" width="2" height="1" fill="#1f2937"/>
    <rect x="2" y="9" width="12" height="5" fill="#78350f"/>
    <rect x="3" y="9" width="10" height="4" fill="#92400e"/>
    <rect x="3" y="9" width="10" height="1" fill="#a56218"/>
    <rect x="2" y="10" width="2" height="3" fill="#92400e"/>
    <rect x="12" y="10" width="2" height="3" fill="#92400e"/>
    <rect x="4" y="14" width="3" height="1" fill="#4a2c0a"/>
    <rect x="9" y="14" width="3" height="1" fill="#4a2c0a"/>
  </svg>`,

  // 魔法师傅：紫袍（尖顶帽 + 白胡须 + 魔杖）
  expert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="7" y="0" width="2" height="1" fill="#4c1d95"/>
    <rect x="6" y="1" width="4" height="1" fill="#5b21b6"/>
    <rect x="4" y="2" width="8" height="1" fill="#7c3aed"/>
    <rect x="5" y="3" width="6" height="4" fill="#f6c98a"/>
    <rect x="5" y="3" width="6" height="1" fill="#e8b97a"/>
    <rect x="6" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="5" y="6" width="6" height="2" fill="#fff"/>
    <rect x="6" y="6" width="4" height="1" fill="#e9e9e9"/>
    <rect x="3" y="8" width="10" height="6" fill="#5b21b6"/>
    <rect x="3" y="8" width="10" height="1" fill="#7c3aed"/>
    <rect x="7" y="9" width="2" height="2" fill="#ffd700"/>
    <rect x="2" y="9" width="1" height="4" fill="#7c3aed"/>
    <rect x="13" y="9" width="1" height="4" fill="#7c3aed"/>
    <rect x="13" y="6" width="1" height="3" fill="#a78bfa"/>
    <rect x="13" y="5" width="1" height="1" fill="#ffd700"/>
    <rect x="4" y="14" width="3" height="1" fill="#4c1d95"/>
    <rect x="9" y="14" width="3" height="1" fill="#4c1d95"/>
  </svg>`,

  // 冰霜大师：冰蓝（冰晶头饰 + 护肩 + 雪花胸饰）
  master: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="5" y="0" width="1" height="2" fill="#bae6fd"/>
    <rect x="7" y="0" width="2" height="1" fill="#bae6fd"/>
    <rect x="10" y="0" width="1" height="2" fill="#bae6fd"/>
    <rect x="4" y="2" width="8" height="5" fill="#7dd3fc"/>
    <rect x="4" y="2" width="8" height="1" fill="#bae6fd"/>
    <rect x="6" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="7" y="6" width="2" height="1" fill="#0369a1"/>
    <rect x="3" y="7" width="10" height="6" fill="#0ea5e9"/>
    <rect x="3" y="7" width="10" height="1" fill="#38bdf8"/>
    <rect x="2" y="8" width="2" height="2" fill="#bae6fd"/>
    <rect x="12" y="8" width="2" height="2" fill="#bae6fd"/>
    <rect x="2" y="10" width="1" height="3" fill="#38bdf8"/>
    <rect x="13" y="10" width="1" height="3" fill="#38bdf8"/>
    <rect x="7" y="9" width="2" height="2" fill="#e0f2fe"/>
    <rect x="4" y="13" width="3" height="2" fill="#0369a1"/>
    <rect x="9" y="13" width="3" height="2" fill="#0369a1"/>
  </svg>`,

  // 炎炎宗师：火红（火焰头发 + 火星）
  grandmaster: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="6" y="0" width="4" height="2" fill="#ff4500"/>
    <rect x="5" y="1" width="6" height="1" fill="#ef4444"/>
    <rect x="4" y="1" width="1" height="1" fill="#ffd700"/>
    <rect x="11" y="0" width="1" height="1" fill="#ffd700"/>
    <rect x="5" y="2" width="6" height="4" fill="#fca5a5"/>
    <rect x="6" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="7" y="5" width="2" height="1" fill="#991b1b"/>
    <rect x="3" y="6" width="10" height="6" fill="#dc2626"/>
    <rect x="3" y="6" width="10" height="1" fill="#ef4444"/>
    <rect x="5" y="8" width="2" height="2" fill="#ffd700"/>
    <rect x="9" y="8" width="2" height="2" fill="#ffd700"/>
    <rect x="2" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="13" y="7" width="1" height="4" fill="#ef4444"/>
    <rect x="4" y="12" width="3" height="3" fill="#991b1b"/>
    <rect x="9" y="12" width="3" height="3" fill="#991b1b"/>
  </svg>`,

  // 传奇英雄：金色（皇冠 + 金甲 + 披风）
  legend: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="4" y="0" width="8" height="1" fill="#ffd700"/>
    <rect x="4" y="1" width="2" height="2" fill="#ffd700"/>
    <rect x="7" y="0" width="2" height="2" fill="#ffd700"/>
    <rect x="10" y="1" width="2" height="2" fill="#ffd700"/>
    <rect x="6" y="0" width="1" height="1" fill="#fff"/>
    <rect x="9" y="0" width="1" height="1" fill="#fff"/>
    <rect x="5" y="3" width="6" height="4" fill="#fef08a"/>
    <rect x="6" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="7" y="6" width="2" height="1" fill="#b8860b"/>
    <rect x="3" y="7" width="10" height="6" fill="#b8860b"/>
    <rect x="3" y="7" width="10" height="1" fill="#ffd700"/>
    <rect x="5" y="8" width="6" height="3" fill="#ffd700"/>
    <rect x="7" y="9" width="2" height="2" fill="#fff"/>
    <rect x="2" y="8" width="1" height="4" fill="#d4af37"/>
    <rect x="13" y="8" width="1" height="4" fill="#d4af37"/>
    <rect x="4" y="13" width="3" height="2" fill="#92680a"/>
    <rect x="9" y="13" width="3" height="2" fill="#92680a"/>
  </svg>`,

  // 神话存在：粉紫（光环 + 星芒耳饰）
  mythic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="0" width="10" height="1" fill="#f0abfc"/>
    <rect x="2" y="1" width="1" height="2" fill="#f0abfc"/>
    <rect x="13" y="1" width="1" height="2" fill="#f0abfc"/>
    <rect x="5" y="2" width="6" height="5" fill="#f9a8d4"/>
    <rect x="5" y="2" width="6" height="1" fill="#fbcfe8"/>
    <rect x="3" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="11" y="3" width="2" height="2" fill="#f9a8d4"/>
    <rect x="6" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="9" y="4" width="1" height="1" fill="#1f2937"/>
    <rect x="7" y="6" width="2" height="1" fill="#be185d"/>
    <rect x="3" y="7" width="10" height="6" fill="#be185d"/>
    <rect x="3" y="7" width="10" height="1" fill="#ec4899"/>
    <rect x="7" y="8" width="2" height="2" fill="#f9a8d4"/>
    <rect x="6" y="9" width="4" height="1" fill="#f9a8d4"/>
    <rect x="2" y="8" width="1" height="4" fill="#f472b6"/>
    <rect x="13" y="8" width="1" height="4" fill="#f472b6"/>
    <rect x="1" y="4" width="1" height="1" fill="#a855f7"/>
    <rect x="14" y="5" width="1" height="1" fill="#a855f7"/>
    <rect x="4" y="13" width="3" height="2" fill="#9d174d"/>
    <rect x="9" y="13" width="3" height="2" fill="#9d174d"/>
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
