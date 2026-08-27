/**
 * 当局升级 16×16 真实像素画（SVG）：
 * 与 helperSprites 同一套像素风格（crispEdges + 主色/暗色/亮色三层分层），
 * 取代原来随意的 Unicode 符号图标（↻ ☝ » ➤ ❖ ☛ ⤴），使升级页视觉统一。
 */

/** 每种当局升级的 16×16 像素画 SVG 字符串（key = 升级 id）。 */
export const UPGRADE_SPRITES: Record<string, string> = {
  // 快速翻转：金色循环箭头（顺时针刷新，主/亮/暗三层 + 箭头尖）
  quickFlip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="2" width="9" height="2" fill="#f5a623"/>
    <rect x="3" y="2" width="9" height="1" fill="#ffd166"/>
    <rect x="12" y="2" width="1" height="3" fill="#b8860b"/>
    <rect x="11" y="3" width="1" height="1" fill="#ffd166"/>
    <rect x="11" y="4" width="2" height="5" fill="#f5a623"/>
    <rect x="12" y="4" width="1" height="5" fill="#b8860b"/>
    <rect x="3" y="9" width="9" height="2" fill="#f5a623"/>
    <rect x="3" y="10" width="9" height="1" fill="#b8860b"/>
    <rect x="3" y="5" width="2" height="4" fill="#f5a623"/>
    <rect x="3" y="5" width="1" height="4" fill="#b8860b"/>
    <rect x="2" y="5" width="1" height="3" fill="#ffd166"/>
    <rect x="2" y="5" width="1" height="1" fill="#fff"/>
  </svg>`,

  // 点金大手：点击的手指 + 迸发金币与火花
  touchOfMidas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="1" width="2" height="2" fill="#f5a623"/>
    <rect x="3" y="1" width="2" height="1" fill="#ffd166"/>
    <rect x="11" y="0" width="2" height="2" fill="#f5a623"/>
    <rect x="11" y="0" width="2" height="1" fill="#ffd166"/>
    <rect x="14" y="4" width="1" height="1" fill="#ffd700"/>
    <rect x="1" y="4" width="1" height="1" fill="#ffd700"/>
    <rect x="6" y="3" width="3" height="3" fill="#f6c98a"/>
    <rect x="6" y="3" width="3" height="1" fill="#fcd9a8"/>
    <rect x="8" y="4" width="1" height="2" fill="#e8b97a"/>
    <rect x="7" y="6" width="4" height="3" fill="#f6c98a"/>
    <rect x="7" y="6" width="4" height="1" fill="#e8b97a"/>
    <rect x="5" y="9" width="6" height="3" fill="#e8b97a"/>
    <rect x="5" y="9" width="6" height="1" fill="#d9a86a"/>
    <rect x="5" y="12" width="6" height="1" fill="#d9a86a"/>
    <rect x="10" y="4" width="2" height="2" fill="#ffd700"/>
    <rect x="10" y="4" width="2" height="1" fill="#ffe14d"/>
    <rect x="12" y="6" width="2" height="2" fill="#f5a623"/>
    <rect x="12" y="6" width="2" height="1" fill="#ffd166"/>
    <rect x="13" y="7" width="1" height="1" fill="#fff"/>
  </svg>`,

  // 脚步轻快：青色脚印（脚趾朝左）+ 速度线
  lightFootsteps: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="11" y="1" width="3" height="1" fill="#7dd3fc"/>
    <rect x="12" y="2" width="3" height="1" fill="#38bdf8"/>
    <rect x="13" y="3" width="2" height="1" fill="#0ea5e9"/>
    <rect x="2" y="6" width="6" height="3" fill="#0ea5e9"/>
    <rect x="2" y="6" width="6" height="1" fill="#38bdf8"/>
    <rect x="2" y="8" width="6" height="1" fill="#0284c7"/>
    <rect x="1" y="5" width="2" height="1" fill="#38bdf8"/>
    <rect x="1" y="7" width="2" height="1" fill="#38bdf8"/>
    <rect x="1" y="9" width="2" height="1" fill="#38bdf8"/>
    <rect x="8" y="10" width="5" height="2" fill="#0284c7"/>
    <rect x="7" y="10" width="1" height="1" fill="#0369a1"/>
    <rect x="7" y="11" width="1" height="1" fill="#0369a1"/>
    <rect x="2" y="13" width="4" height="1" fill="#bae6fd"/>
    <rect x="10" y="13" width="3" height="1" fill="#bae6fd"/>
  </svg>`,

  // 银币滑行：圆形银币（内圈 + 高光）+ 滑行尾迹
  silverGlide: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="1" y="6" width="5" height="1" fill="#9ca3af"/>
    <rect x="2" y="7" width="5" height="1" fill="#6b7280"/>
    <rect x="1" y="8" width="4" height="1" fill="#9ca3af"/>
    <rect x="9" y="4" width="4" height="1" fill="#e5e7eb"/>
    <rect x="8" y="5" width="6" height="3" fill="#a8a9ad"/>
    <rect x="8" y="5" width="6" height="1" fill="#e5e7eb"/>
    <rect x="9" y="8" width="4" height="1" fill="#6b7280"/>
    <rect x="10" y="6" width="2" height="1" fill="#fff"/>
    <rect x="9" y="6" width="2" height="2" fill="#c9ccd3"/>
  </svg>`,

  // 点金之手：金色手套（竖拇指）+ 金币
  handOfMidas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="3" y="2" width="4" height="4" fill="#ffd700"/>
    <rect x="3" y="2" width="4" height="1" fill="#ffe14d"/>
    <rect x="2" y="2" width="1" height="4" fill="#d4af37"/>
    <rect x="3" y="6" width="7" height="3" fill="#ffd700"/>
    <rect x="3" y="6" width="7" height="1" fill="#ffe14d"/>
    <rect x="3" y="8" width="7" height="1" fill="#b8860b"/>
    <rect x="4" y="9" width="6" height="3" fill="#b8860b"/>
    <rect x="4" y="9" width="6" height="1" fill="#d4af37"/>
    <rect x="12" y="4" width="3" height="3" fill="#f5a623"/>
    <rect x="12" y="4" width="3" height="1" fill="#ffd166"/>
    <rect x="13" y="5" width="1" height="1" fill="#fff"/>
    <rect x="1" y="5" width="1" height="1" fill="#ffd166"/>
    <rect x="11" y="2" width="1" height="1" fill="#ffd166"/>
  </svg>`,

  // 幸运四叶草：四片叶子 + 高光 + 茎
  luckyClover: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="6" y="1" width="4" height="2" fill="#22c55e"/>
    <rect x="6" y="1" width="2" height="1" fill="#86efac"/>
    <rect x="3" y="3" width="2" height="2" fill="#22c55e"/>
    <rect x="3" y="3" width="1" height="1" fill="#86efac"/>
    <rect x="11" y="3" width="2" height="2" fill="#22c55e"/>
    <rect x="11" y="3" width="1" height="1" fill="#86efac"/>
    <rect x="3" y="5" width="2" height="2" fill="#16a34a"/>
    <rect x="11" y="5" width="2" height="2" fill="#16a34a"/>
    <rect x="4" y="2" width="8" height="1" fill="#16a34a"/>
    <rect x="5" y="3" width="1" height="4" fill="#16a34a"/>
    <rect x="10" y="3" width="1" height="4" fill="#16a34a"/>
    <rect x="7" y="3" width="2" height="1" fill="#86efac"/>
    <rect x="7" y="7" width="2" height="2" fill="#22c55e"/>
    <rect x="7" y="7" width="1" height="1" fill="#86efac"/>
    <rect x="7" y="9" width="2" height="5" fill="#15803d"/>
    <rect x="7" y="9" width="2" height="1" fill="#16a34a"/>
    <rect x="7" y="14" width="2" height="1" fill="#16a34a"/>
  </svg>`,

  // 优先高级币：蓝色上升箭头 + 闪烁钻石（高级币）
  preferHigherCoins: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="4" width="5" height="1" fill="#0ea5e9"/>
    <rect x="3" y="3" width="3" height="1" fill="#38bdf8"/>
    <rect x="4" y="2" width="1" height="1" fill="#7dd3fc"/>
    <rect x="1" y="5" width="7" height="3" fill="#0ea5e9"/>
    <rect x="1" y="5" width="7" height="1" fill="#38bdf8"/>
    <rect x="3" y="5" width="1" height="3" fill="#0369a1"/>
    <rect x="5" y="5" width="1" height="3" fill="#0369a1"/>
    <rect x="0" y="8" width="9" height="1" fill="#0284c7"/>
    <rect x="0" y="9" width="9" height="1" fill="#0369a1"/>
    <rect x="12" y="3" width="1" height="1" fill="#fff"/>
    <rect x="11" y="4" width="3" height="1" fill="#bae6fd"/>
    <rect x="10" y="5" width="5" height="2" fill="#7dd3fc"/>
    <rect x="11" y="7" width="3" height="1" fill="#38bdf8"/>
    <rect x="12" y="8" width="1" height="1" fill="#0369a1"/>
  </svg>`,
}

/** 升级 id 的展示顺序（与 UPGRADES 一致）。 */
export const UPGRADE_SPRITE_IDS: string[] = Object.keys(UPGRADE_SPRITES)

/** 取某个当局升级的 16×16 像素画 SVG 字符串（未知 id 兜底为快速翻转）。 */
export function upgradeSpriteSvg(id: string): string {
  return UPGRADE_SPRITES[id] ?? UPGRADE_SPRITES.quickFlip!
}

/** 生成当局升级像素画的 data URL（可直接作为 <img src>）。 */
export function upgradeSpriteDataUrl(id: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(upgradeSpriteSvg(id))}`
}
