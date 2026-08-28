import { buildNum, digitSum, isPrime } from '../math'

/**
 * 采矿系统数据 —— 1:1 直译自 Gooboo 官方源码
 * （`js/constants.js`、`js/modules/mining/*.js`、`store/mining.js`）。
 *
 * 覆盖：9 种矿石（含锻造 power/impurity）、11 种稀有掉落、6 种气体、
 * 7 条熔炼产线、7 种锭增强、4 种信标，以及全部货币与乘区定义。
 */

/* ── 时间常量 ── */

export const SECONDS_PER_MINUTE = 60
export const SECONDS_PER_HOUR = 3600
export const SECONDS_PER_DAY = 86400
export const SECONDS_PER_YEAR = 31557600

/* ── 核心常量（js/constants.js） ── */

export const MINING_CONSTANTS = {
  /** 击碎一层时废料的额外倍率。 */
  SCRAP_BREAK: 4,
  /** 击碎一层时矿石的额外倍率。 */
  ORE_BREAK: 1,
  /** 击碎一层时稀有物的额外倍率。 */
  RARE_DROP_BREAK: 1,
  /** 击碎一层时烟的额外倍率。 */
  SMOKE_BREAK: 1,
  /** 每级压缩的成本/收益倍率。 */
  CRAFTING_COMPRESSION: 5,
  GRANITE_DEPTH: 50,
  SALT_DEPTH: 70,
  COAL_DEPTH: 90,
  SULFUR_DEPTH: 110,
  NITER_DEPTH: 130,
  OBSIDIAN_DEPTH: 150,
  DEEPROCK_DEPTH: 275,
  GLOWSHARD_DEPTH: 9999,
  MOONSHARD_DEPTH: 20,
  PHOSPHORUS_DEPTH: 150,
  SMELTERY_TEMPERATURE_SPEED: 0.004,
  SMELTERY_TIME_INCREMENT: 1.045,
  SMELTERY_ORE_INCREMENT: 1.04,
  ENHANCEMENT_BARS: 10,
  ENHANCEMENT_INCREMENT: 5,
  ENHANCEMENT_MAX: 10,
  OBSIDIAN_PENALTY_BASE: 0.5,
  OBSIDIAN_PENALTY_INCREMENT: 0.85,
  DWELLER_OVERCAP_MULT: 0.9,
  DWELLER_OVERFLOW: 5,
  /** 子模式 0 / 1 的耐久底数与基数。 */
  DURABILITY_INCREMENT: [1.75, 1.85],
  DURABILITY_BASE: [10, buildNum(500, 'M')],
  /** 镐子初始威力。 */
  PICKAXE_POWER_BASE: 8,
  /** 硬度硬上限。 */
  TOUGHNESS_CAP: buildNum(1, 'C'),
} as const

/* ── 矿石（js/modules/mining/ore.js） ── */

export type MiningOreId =
  | 'oreAluminium'
  | 'oreCopper'
  | 'oreTin'
  | 'oreIron'
  | 'oreTitanium'
  | 'orePlatinum'
  | 'oreIridium'
  | 'oreOsmium'
  | 'oreLead'

export interface MiningOre {
  id: MiningOreId
  /** 锻造贡献的品质基数。 */
  power: number
  /** 杂质系数（越高越难提纯）。 */
  impurity: number
  minDepth: number
  maxDepth: number
  modulo: number
  baseAmount: number
  amountMult: number
}

export const MINING_ORES: MiningOre[] = [
  { id: 'oreAluminium', power: 15, impurity: 1.5, minDepth: 15, maxDepth: 45, modulo: 3, baseAmount: 0.02, amountMult: 1.05 },
  { id: 'oreCopper', power: 50, impurity: 2, minDepth: 30, maxDepth: 68, modulo: 4, baseAmount: 0.004, amountMult: 1.05 },
  { id: 'oreTin', power: 240, impurity: 2.5, minDepth: 50, maxDepth: 100, modulo: 5, baseAmount: 0.0008, amountMult: 1.05 },
  { id: 'oreIron', power: 1300, impurity: 3, minDepth: 80, maxDepth: 140, modulo: 7, baseAmount: 0.00016, amountMult: 1.05 },
  { id: 'oreTitanium', power: 7000, impurity: 3.5, minDepth: 120, maxDepth: 200, modulo: 11, baseAmount: 0.000032, amountMult: 1.05 },
  { id: 'orePlatinum', power: buildNum(40, 'K'), impurity: 4, minDepth: 175, maxDepth: 295, modulo: 13, baseAmount: 0.0000064, amountMult: 1.05 },
  { id: 'oreIridium', power: buildNum(250, 'K'), impurity: 5, minDepth: 260, maxDepth: 420, modulo: 17, baseAmount: 0.00000128, amountMult: 1.05 },
  { id: 'oreOsmium', power: buildNum(1.75, 'M'), impurity: 6, minDepth: 350, maxDepth: 525, modulo: 23, baseAmount: 0.000000256, amountMult: 1.05 },
  { id: 'oreLead', power: buildNum(12.5, 'M'), impurity: 7.5, minDepth: 450, maxDepth: 650, modulo: 29, baseAmount: 0.0000000512, amountMult: 1.05 },
]

export function oreOf(id: MiningOreId): MiningOre {
  const def = MINING_ORES.find((o) => o.id === id)
  if (def === undefined) throw new Error(`未知矿石：${id}`)
  return def
}

/* ── 稀有掉落（store/mining.js → rareDropBase） ── */

export type MiningRareEarthId =
  | 'granite'
  | 'salt'
  | 'coal'
  | 'sulfur'
  | 'niter'
  | 'obsidian'
  | 'deeprock'
  | 'glowshard'
  | 'limestone'
  | 'moonshard'
  | 'phosphorus'

const R = MINING_CONSTANTS

/** 每种稀有物在深度 `depth` 的基础掉落量（未乘增益乘区）。 */
export function rareDropBase(name: MiningRareEarthId, depth: number): number {
  switch (name) {
    case 'granite':
      return Math.pow(1.1, depth - R.GRANITE_DEPTH)
    case 'salt':
      return Math.pow(1.05, depth - R.SALT_DEPTH) * 0.1
    case 'coal':
      return 10 + depth - R.COAL_DEPTH
    case 'sulfur':
      return Math.pow(1.05, depth - R.SULFUR_DEPTH)
    case 'niter':
      return 100 + (depth - R.NITER_DEPTH) * 5
    case 'obsidian':
      return Math.pow(1.05, depth - R.OBSIDIAN_DEPTH)
    case 'deeprock':
      return Math.pow(1.05, depth - R.DEEPROCK_DEPTH) * Math.pow(1.5, digitSum(depth) - 14)
    case 'glowshard':
      return 10
    case 'limestone':
      return Math.pow(1.1, depth) * 0.001
    case 'moonshard':
      return Math.pow(1.35, depth - R.MOONSHARD_DEPTH) * 0.00001
    case 'phosphorus':
      return Math.pow(5, (depth - R.PHOSPHORUS_DEPTH) / 25) * 0.000001
    default:
      return 0
  }
}

export const MINING_RARE_EARTHS: MiningRareEarthId[] = [
  'granite',
  'salt',
  'coal',
  'sulfur',
  'niter',
  'obsidian',
  'deeprock',
  'glowshard',
  'limestone',
  'moonshard',
  'phosphorus',
]

/* ── 气体（store/mining.js → state.gas） ── */

export type MiningGasId = 'helium' | 'neon' | 'argon' | 'krypton' | 'xenon' | 'radon'

export const MINING_GAS_MIN_DEPTH: Record<MiningGasId, number> = {
  helium: 1,
  neon: 51,
  argon: 121,
  krypton: 221,
  xenon: 401,
  radon: 651,
}

export const MINING_GASES: MiningGasId[] = ['helium', 'neon', 'argon', 'krypton', 'xenon', 'radon']

/* ── 锭（bar） ── */

export type MiningBarId =
  | 'barAluminium'
  | 'barBronze'
  | 'barSteel'
  | 'barTitanium'
  | 'barShiny'
  | 'barIridium'
  | 'barDarkIron'

export const MINING_BARS: MiningBarId[] = [
  'barAluminium',
  'barBronze',
  'barSteel',
  'barTitanium',
  'barShiny',
  'barIridium',
  'barDarkIron',
]

/* ── 熔炼产线（js/modules/mining/smeltery.js） ── */

export type SmelteryId = 'aluminium' | 'bronze' | 'steel' | 'titanium' | 'shiny' | 'iridium' | 'darkIron'

export interface SmelteryDef {
  id: SmelteryId
  /** 第 lvl 次填炉的价格。 */
  price: (lvl: number) => Record<string, number>
  /** 产出的货币 id。 */
  output: MiningBarId
  /** 单条基础耗时（秒）。 */
  timeNeeded: number
  /** 起效所需最低温度。 */
  minTemperature: number
}

const ORE_INC = R.SMELTERY_ORE_INCREMENT

export const MINING_SMELTERY: SmelteryDef[] = [
  {
    id: 'aluminium',
    price: (lvl) => ({
      mining_oreAluminium: Math.pow(ORE_INC, lvl) * 1000,
      mining_granite: Math.pow(1.1, lvl) * 7500,
    }),
    output: 'barAluminium',
    timeNeeded: 300,
    minTemperature: 100,
  },
  {
    id: 'bronze',
    price: (lvl) => ({
      mining_oreCopper: Math.pow(ORE_INC, lvl) * 900,
      mining_oreTin: Math.pow(ORE_INC, lvl) * 100,
      mining_salt: Math.pow(1.06, lvl) * 800,
    }),
    output: 'barBronze',
    timeNeeded: SECONDS_PER_HOUR,
    minTemperature: 275,
  },
  {
    id: 'steel',
    price: (lvl) => ({
      mining_oreIron: Math.pow(ORE_INC, lvl) * 1000,
      mining_coal: 5,
    }),
    output: 'barSteel',
    timeNeeded: 8 * SECONDS_PER_HOUR,
    minTemperature: 500,
  },
  {
    id: 'titanium',
    price: (lvl) => ({
      mining_oreTitanium: Math.pow(ORE_INC, lvl) * 1000,
      mining_sulfur: Math.pow(1.06, lvl) * 200,
      mining_niter: 100,
    }),
    output: 'barTitanium',
    timeNeeded: 3 * SECONDS_PER_DAY,
    minTemperature: 800,
  },
  {
    id: 'shiny',
    price: (lvl) => ({
      mining_orePlatinum: Math.pow(ORE_INC, lvl) * 1000,
      mining_obsidian: Math.pow(1.1, lvl) * 2e6,
    }),
    output: 'barShiny',
    timeNeeded: 30 * SECONDS_PER_DAY,
    minTemperature: 1250,
  },
  {
    id: 'iridium',
    price: (lvl) => ({
      mining_oreIridium: Math.pow(ORE_INC, lvl) * 1000,
      mining_helium: Math.pow(1.1, lvl) * 1e4,
    }),
    output: 'barIridium',
    timeNeeded: SECONDS_PER_YEAR,
    minTemperature: 2000,
  },
  {
    id: 'darkIron',
    price: (lvl) => ({
      mining_oreIron: Math.pow(ORE_INC, lvl) * 1e7,
      mining_oreOsmium: Math.pow(ORE_INC, lvl) * 1000,
      mining_deeprock: Math.pow(1.1, lvl) * 1e8,
      mining_neon: Math.pow(1.1, lvl) * 1e4,
    }),
    output: 'barDarkIron',
    timeNeeded: 15 * SECONDS_PER_YEAR,
    minTemperature: 3000,
  },
]

export function smelteryOf(id: SmelteryId): SmelteryDef {
  const def = MINING_SMELTERY.find((s) => s.id === id)
  if (def === undefined) throw new Error(`未知熔炼产线：${id}`)
  return def
}

/** 产出指定锭的熔炼产线定义。 */
export function barOf(id: MiningBarId): SmelteryDef {
  const def = MINING_SMELTERY.find((s) => s.output === id)
  if (def === undefined) throw new Error(`未知锭：${id}`)
  return def
}

/* ── 锭增强（js/modules/mining/enhancement.js） ── */

export interface MiningEnhancementDef {
  id: MiningBarId
  effect: { name: string; type: 'mult'; value: (lvl: number) => number }[]
}

export const MINING_ENHANCEMENTS: MiningEnhancementDef[] = [
  {
    id: 'barAluminium',
    effect: [
      { name: 'miningPickaxeCraftingQuality', type: 'mult', value: (lvl) => lvl * 0.5 + 1 },
      { name: 'miningOreQuality', type: 'mult', value: (lvl) => Math.pow(2, lvl) },
    ],
  },
  {
    id: 'barBronze',
    effect: [
      { name: 'miningOreGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.1 + 1) },
      { name: 'miningRareEarthGain', type: 'mult', value: (lvl) => Math.pow(1.15, lvl) * (lvl * 0.15 + 1) },
    ],
  },
  {
    id: 'barSteel',
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.08 + 1 },
      { name: 'miningToughness', type: 'mult', value: (lvl) => Math.pow(1 / 1.35, lvl) },
    ],
  },
  {
    id: 'barTitanium',
    effect: [
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.1 + 1) },
    ],
  },
  {
    id: 'barShiny',
    effect: [
      { name: 'miningDepthDwellerSpeed', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
      { name: 'currencyMiningCrystalGreenGain', type: 'mult', value: (lvl) => lvl * 0.1 + 1 },
    ],
  },
  {
    id: 'barIridium',
    effect: [
      { name: 'currencyMiningEmberGain', type: 'mult', value: (lvl) => lvl * 0.3 + 1 },
    ],
  },
  {
    id: 'barDarkIron',
    effect: [
      { name: 'currencyMiningScrapCap', type: 'mult', value: (lvl) => Math.pow(1.1, lvl) * (lvl * 0.15 + 1) },
    ],
  },
]

/* ── 信标（js/modules/mining/beacon.js） ── */

export type MiningBeaconId = 'piercing' | 'rich' | 'wonder' | 'hope'

export interface MiningBeaconDef {
  id: MiningBeaconId
  color: string
  /** 持有数量所在的乘区名。 */
  ownedMult: string
  /** 作用范围（层数）。 */
  range: number
  effect: { name: string; type: 'mult'; value: (lvl: number) => number }[]
}

export const MINING_BEACONS: MiningBeaconDef[] = [
  {
    id: 'piercing',
    color: 'purple',
    ownedMult: 'miningBeaconPiercing',
    range: 1,
    effect: [{ name: 'miningToughness', type: 'mult', value: (lvl) => 1 / (lvl * 0.25 + 5) }],
  },
  {
    id: 'rich',
    color: 'orange',
    ownedMult: 'miningBeaconRich',
    range: 1,
    effect: [{ name: 'miningOreGain', type: 'mult', value: (lvl) => lvl * 0.05 + 2 }],
  },
  {
    id: 'wonder',
    color: 'blue',
    ownedMult: 'miningBeaconWonder',
    range: 1,
    effect: [{ name: 'miningRareEarthGain', type: 'mult', value: (lvl) => lvl * 0.04 + 1.6 }],
  },
  {
    id: 'hope',
    color: 'green',
    ownedMult: 'miningBeaconHope',
    range: 5,
    effect: [
      { name: 'miningDamage', type: 'mult', value: (lvl) => lvl * 0.01 + 1.1 },
      { name: 'currencyMiningScrapGain', type: 'mult', value: (lvl) => lvl * 0.015 + 1.2 },
    ],
  },
]

export function beaconOf(id: MiningBeaconId): MiningBeaconDef {
  const def = MINING_BEACONS.find((b) => b.id === id)
  if (def === undefined) throw new Error(`未知信标：${id}`)
  return def
}

/* ── 货币（js/modules/mining.js → currency） ── */

export type MiningSubtype = 'ore' | 'bar' | 'rareEarth' | 'gas'

export interface MiningCurrencyDef {
  id: string
  subtype?: MiningSubtype
  /** 是否为跨转生保留的货币。 */
  prestige?: boolean
  /** 基础存储上限（capMult.baseValue）。 */
  capBase?: number
  /** 是否按整数显示。 */
  int?: boolean
  /**
   * 超过上限后每段获得的衰减倍率（Gooboo `currency.overcapMult`，默认 0.25）。
   * 仅对 `capBase` 有定义的货币生效；无上限货币（cap=null）不受影响。
   */
  overcapMult?: number
  /**
   * overcap 段数的指数衰减因子（Gooboo `currency.overcapScaling`，默认 0.5）。
   * 段 0 满额，段 1 为 `overcapMult * scaling^0`，段 2 为 `overcapMult * scaling^1`，依此类推。
   */
  overcapScaling?: number
  /**
   * 货币自身的乘区联动（Gooboo 的 `currencyMult`）：
   * 持有量反过来增强某些乘区。
   */
  currencyMult?: Record<string, (value: number) => number>
}

/**
 * 气体对乘区的联动。Gooboo 中写在货币定义里，
 * 这里单独抽出以便按气体动态计算。
 */
export const GAS_CURRENCY_MULT: Record<MiningGasId, Record<string, (value: number) => number>> = {
  helium: { currencyMiningScrapCap: (val) => val * 0.01 + 1 },
  neon: { miningPickaxeCraftingPower: (val) => Math.pow(val * 0.01 + 1, 0.9) },
  argon: { currencyMiningScrapGain: (val) => Math.pow(val * 0.01 + 1, 0.8) },
  krypton: { miningRareEarthGain: (val) => Math.pow(val * 0.01 + 1, 0.7) },
  xenon: {},
  radon: {},
}

export const EMBER_CURRENCY_MULT: Record<string, (value: number) => number> = {
  miningSmelteryTime: (val) => 1 / (val * 0.02 + 1),
}

export const MINING_CURRENCIES: MiningCurrencyDef[] = [
  { id: 'scrap', capBase: buildNum(10, 'K') },
  { id: 'smoke', subtype: 'ore', capBase: 10, overcapScaling: 0.25 },
  { id: 'ember', prestige: true, int: true, capBase: 100, overcapMult: 1, overcapScaling: 0 },
  { id: 'resin', prestige: true, capBase: 5 },

  { id: 'oreAluminium', subtype: 'ore', capBase: 12 },
  { id: 'oreCopper', subtype: 'ore', capBase: 4 },
  { id: 'oreTin', subtype: 'ore', capBase: 2 },
  { id: 'oreIron', subtype: 'ore', capBase: 1 },
  { id: 'oreTitanium', subtype: 'ore', capBase: 1 },
  { id: 'orePlatinum', subtype: 'ore', capBase: 1 },
  { id: 'oreIridium', subtype: 'ore', capBase: 1 },
  { id: 'oreOsmium', subtype: 'ore', capBase: 1 },
  { id: 'oreLead', subtype: 'ore', capBase: 1 },

  { id: 'barAluminium', subtype: 'bar', int: true },
  { id: 'barBronze', subtype: 'bar', int: true },
  { id: 'barSteel', subtype: 'bar', int: true },
  { id: 'barTitanium', subtype: 'bar', int: true },
  { id: 'barShiny', subtype: 'bar', int: true },
  { id: 'barIridium', subtype: 'bar', int: true },
  { id: 'barDarkIron', subtype: 'bar', int: true },

  { id: 'granite', subtype: 'rareEarth' },
  { id: 'salt', subtype: 'rareEarth' },
  { id: 'coal', int: true },
  { id: 'sulfur', subtype: 'rareEarth' },
  { id: 'niter' },
  { id: 'obsidian', subtype: 'rareEarth' },
  { id: 'deeprock', subtype: 'rareEarth' },
  { id: 'glowshard' },
  { id: 'limestone', subtype: 'rareEarth' },
  { id: 'moonshard', subtype: 'rareEarth' },
  { id: 'phosphorus', subtype: 'rareEarth' },

  { id: 'crystalGreen', prestige: true },
  { id: 'crystalYellow', prestige: true },

  { id: 'helium', prestige: true, subtype: 'gas' },
  { id: 'neon', prestige: true, subtype: 'gas' },
  { id: 'argon', prestige: true, subtype: 'gas' },
  { id: 'krypton', prestige: true, subtype: 'gas' },
  { id: 'xenon', prestige: true, subtype: 'gas' },
  { id: 'radon', prestige: true, subtype: 'gas' },
]

export const MINING_CURRENCY_IDS: string[] = MINING_CURRENCIES.map((c) => c.id)

const CURRENCY_BY_ID = new Map(MINING_CURRENCIES.map((c) => [c.id, c]))

export function miningCurrencyOf(id: string): MiningCurrencyDef {
  const def = CURRENCY_BY_ID.get(id)
  if (def === undefined) throw new Error(`未知采矿货币：${id}`)
  return def
}

/** 货币 id → 大写首字母形式（scrap → Scrap），用于拼接乘区名。 */
export function capitalizeId(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/* ── 乘区定义（js/modules/mining.js → mult） ── */

export function createMiningMultDefs(): Record<string, { baseValue?: number; max?: number; round?: boolean; group?: string[] }> {
  const defs: Record<string, { baseValue?: number; max?: number; round?: boolean; group?: string[] }> = {
    miningDamage: {},
    miningToughness: {},
    miningOreGain: { group: MINING_ORES.map((o) => `currencyMining${capitalizeId(o.id)}Gain`) },
    miningOreCap: { group: MINING_ORES.map((o) => `currencyMining${capitalizeId(o.id)}Cap`) },
    miningRareEarthGain: {
      group: ['granite', 'salt', 'sulfur', 'obsidian', 'deeprock', 'limestone', 'moonshard', 'phosphorus']
        .map((n) => `currencyMining${capitalizeId(n)}Gain`),
    },
    miningGasGain: { group: MINING_GASES.map((g) => `currencyMining${capitalizeId(g)}Gain`) },
    miningPickaxeCraftingSlots: { round: true, baseValue: 1 },
    miningPickaxePremiumCraftingSlots: { round: true },
    miningPickaxeCraftingPower: {},
    miningPickaxeCraftingQuality: {},
    miningOreQuality: { baseValue: 1 },
    miningDepthDwellerSpeed: { baseValue: 0.000065 },
    miningDepthDwellerMax: { baseValue: 0.1, max: 0.5 },
    miningResinMax: { round: true, baseValue: 1 },
    miningPremiumOreCap: {},
    miningSmelteryTime: {},
    miningSmelteryTemperature: { baseValue: 100 },
    miningEnhancementMax: { round: true, baseValue: 3 },
    miningPrestigeIncome: {
      group: ['currencyMiningCrystalGreenGain', 'currencyMiningCrystalYellowGain'],
    },
    miningCardCap: { round: true, baseValue: 1 },
    miningBeaconPiercing: { round: true },
    miningBeaconRich: { round: true },
    miningBeaconWonder: { round: true },
    miningBeaconHope: { round: true },
  }

  for (const gas of MINING_GASES) {
    defs[`currencyMining${capitalizeId(gas)}Limit`] = { baseValue: 100 }
    defs[`currencyMining${capitalizeId(gas)}Increment`] = {}
  }
  for (const currency of MINING_CURRENCIES) {
    if (currency.capBase !== undefined) {
      defs[`currencyMining${capitalizeId(currency.id)}Cap`] = { baseValue: currency.capBase }
    }
    defs[`currencyMining${capitalizeId(currency.id)}Gain`] = {}
  }
  // 树脂每秒基础产出固定为万分之一
  defs.currencyMiningResinGain = { baseValue: 0.0001 }

  return defs
}

/* ── 深度相关公式（store/mining.js） ── */

/** 该层矿壁耐久。 */
export function depthDurability(depth: number, subfeature = 0): number {
  const increment = R.DURABILITY_INCREMENT[subfeature]
  const base = R.DURABILITY_BASE[subfeature]
  return Math.ceil(Math.pow(increment, depth) * Math.pow(depth * 0.1 + 1, 2) * base)
}

/** 该层基础硬度（未乘 `miningToughness` 乘区）。 */
export function depthBaseToughness(depth: number, subfeature = 0): number {
  if (depth < 10 || subfeature === 1) {
    return 0
  }
  return Math.min(
    R.TOUGHNESS_CAP,
    Math.pow(1.82, depth) *
      (depth * 0.01 - 0.09) *
      0.25 *
      Math.pow(depth * 0.1 + 1, 2) *
      (depth > 150 ? Math.pow(depth * 0.002 + 0.7, depth - 150) : 1) *
      (depth >= 300 && depth % 10 === 0 ? 100 : 1),
  )
}

/** 该层基础废料产出。 */
export function depthBaseScrap(depth: number, subfeature = 0): number {
  const factor = subfeature === 1 ? (isPrime(depth) ? 0.01 : 0.1) : 2
  return Math.pow(1.2, depth) * Math.pow(depth * 0.2 + 1.2, 2) * factor
}

/** 该层基础烟产出（子模式 1 且深度 ≥ 25）。 */
export function depthBaseSmoke(depth: number): number {
  return Math.pow(1.05, depth - 25) * (depth >= R.PHOSPHORUS_DEPTH && depth % 25 === 0 ? 0 : 0.0005)
}

/** 该层矿石是否可采：`depth >= minDepth && (depth <= maxDepth || depth % modulo === 0)`。 */
export function isOreAtDepth(ore: MiningOre, depth: number): boolean {
  return depth >= ore.minDepth && (depth <= ore.maxDepth || depth % ore.modulo === 0)
}

/** 该层某矿石的基础产量；`half` 表示因火把而半价产出。 */
export function oreBaseAmount(ore: MiningOre, depth: number): number {
  const penalty = depth > ore.maxDepth ? (depth - ore.maxDepth) * ((ore.modulo - 1) / ore.modulo) : 0
  return Math.pow(ore.amountMult, depth - ore.minDepth - penalty) * ore.baseAmount
}

/* 兼容旧导出的别名 —— 旧代码 / 测试仍在使用 */
export const ENHANCEMENT_BARS = R.ENHANCEMENT_BARS
export const GRANITE_DEPTH = R.GRANITE_DEPTH
export const COAL_DEPTH = R.COAL_DEPTH
export const SCRAP_BREAK = R.SCRAP_BREAK
export const ORE_BREAK = R.ORE_BREAK
export const RARE_DROP_BREAK = R.RARE_DROP_BREAK
