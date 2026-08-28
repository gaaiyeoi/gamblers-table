/**
 * 挖矿小动物的配色。
 *
 * 颜色全部收敛在这里：改配色只动本文件，不用去 SVG 里翻。
 * 毛色随 variant 变化，材质色（木头/金属/头灯…）固定。
 */

/** 按系数压暗。 */
export function shade(hex: string, amount = 0.6): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * amount)
  const g = Math.round(((n >> 8) & 255) * amount)
  const b = Math.round((n & 255) * amount)
  return `rgb(${r},${g},${b})`
}

/** 按比例向白色提亮。 */
export function lighten(hex: string, amount = 0.35): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const mix = (v: number): number => Math.min(255, Math.round(v + (255 - v) * amount))
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`
}

/** 毛色变体：主色 + 肚皮色。 */
export interface FurPalette {
  fur: string
  belly: string
}

/** 四种毛色：鼹鼠棕 / 仓鼠金 / 灰兔灰 / 狐狸橙。 */
export const FUR_PALETTES: readonly FurPalette[] = [
  { fur: '#7a5230', belly: '#e2c398' },
  { fur: '#d8a24a', belly: '#f8e5b6' },
  { fur: '#8b8b9c', belly: '#e6e6ee' },
  { fur: '#c86a2c', belly: '#f4d5a8' },
]

/** 取毛色变体（索引循环）。 */
export function furPaletteOf(variant: number): FurPalette {
  return FUR_PALETTES[variant % FUR_PALETTES.length]
}

/** 一整套明暗：受光亮面 / 背光暗面 / 外描边。 */
export interface Shades {
  base: string
  light: string
  dark: string
  outline: string
}

/**
 * 由主色派生整套明暗。
 * outline 是压得很暗的一档，用来勾外轮廓——暗色矿洞背景里，
 * 没有描边的小动物会糊成一团。
 */
export function shadesOf(base: string): Shades {
  return {
    base,
    light: lighten(base, 0.32),
    dark: shade(base, 0.72),
    outline: shade(base, 0.4),
  }
}

/** 固定材质色（不随毛色变化）。 */
export const MAT = {
  strap: '#2f2f3a',
  strapLight: '#4a4a58',
  lampCase: '#5a5a68',
  lampCaseLight: '#7d7d8c',
  lampGlass: '#ffd97a',
  lampCore: '#fff8dc',
  eye: '#241a12',
  eyeShine: '#ffffff',
  nose: '#ef7f9d',
  noseLight: '#ffc6d6',
  claw: '#f2e6cf',
  whisker: '#efe4cf',
  earInner: '#d98a94',
  wood: '#8a5a2a',
  woodLight: '#b07a3a',
  woodDark: '#5a3a16',
  grip: '#3a2a12',
  metal: '#c2c6cf',
  metalLight: '#e8eaf0',
  metalDark: '#7d828e',
} as const

/** 木柄/金属的一整套明暗。 */
export const WOOD_SHADES: Shades = {
  base: MAT.wood,
  light: MAT.woodLight,
  dark: MAT.woodDark,
  outline: shade(MAT.wood, 0.4),
}
