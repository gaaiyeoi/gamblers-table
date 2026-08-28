<script setup lang="ts">
/**
 * 矿场面板（1:1 复刻 Gooboo 的 Mining 视图）。
 *
 * 分区与 Gooboo 一致：
 * 1. 转生条（深度居民 → 绿水晶）
 * 2. 状态区：深度导航 / 耐久 / 伤害 / 硬度 / 本层掉落
 * 3. 锻造区：矿石库存 + 槽位 + 锻造（RNG）
 * 4. 升级树（81 条，随深度渐进揭示）
 * 5. 熔炼厂（7 条产线）
 * 6. 锭增强（7 种）
 * 7. 信标
 * 8. 声望升级（54 条）
 * 9. 圣遗物
 */
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import GtProgress from '../../components/ui/GtProgress.vue'
import ActionButton from '../../components/ui/ActionButton.vue'
import Tooltip from '../../components/ui/Tooltip.vue'
import {
  cardCap,
  cardPower,
  cardsCollected,
  currencyOf,
  MINING_BEACON_NAMES,
  MINING_BEACONS,
  MINING_CARD_PACKS,
  MINING_CARDS,
  MINING_CURRENCY_NAMES,
  MINING_NOTES,
  MINING_PREMIUM_NAMES,
  MINING_PREMIUM_UPGRADES,
  MINING_ENHANCEMENTS,
  MINING_GAS_UPGRADES,
  MINING_ORES,
  MINING_PRESTIGE_UPGRADES,
  MINING_RARE_EARTHS,
  MINING_RELICS,
  MINING_SMELTERY,
  MINING_SMELTERY_NAMES,
  MINING_UPGRADE_NAMES,
  MINING_UPGRADES,
  miningActiveBeacon,
  miningBeaconOwned,
  miningCraftingSlots,
  miningDepthHitsNeeded,
  miningDwellerLimit,
  miningEffectiveDamage,
  miningEnhancementLevel,
  miningEnhancementMax,
  miningHitsNeeded,
  miningIsUnlocked,
  miningOreCollectible,
  miningOrePerSecond,
  miningPickaxeChance,
  miningPickaxePower,
  premiumLevelOf,
  isPremiumVisible,
  premiumBlock,
  miningPickaxeStats,
  miningRareDrops,
  miningScrapPerSecond,
  miningSmelteryProgress,
  miningSmelteryStored,
  miningSmelteryTimeNeeded,
  miningToughness,
  miningUpgradeUnlocked,
  miningWallProgress,
  relicUnlocked,
  scrapCap,
  upgradeLevel,
} from '../../core'
import type { MiningOreId, MiningUpgradeDef, SmelteryId } from '../../core'
import { useSound } from '../../composables/useSound'
import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)
const { play } = useSound()

/* ── 数值格式化 ── */

/** 大数记法：小数值保留 1~2 位小数，大数用 K/M/B/T… 后缀。 */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '∞'
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs < 0.01) return v.toExponential(1)
  if (abs < 1000) return abs < 10 ? v.toFixed(2).replace(/\.?0+$/, '') : Math.round(v).toString()
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N', 'D']
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3))
  const scaled = v / Math.pow(1000, tier)
  return `${scaled.toFixed(2)}${suffixes[tier]}`
}

function nameOf(id: string): string {
  return MINING_CURRENCY_NAMES[id] ?? id
}

function upgradeNameOf(id: string): string {
  return MINING_UPGRADE_NAMES[id] ?? id
}

/** 价格文本：`废料 1.20K + 铝矿 30`。 */
function priceText(price: Record<string, number>): string {
  return Object.keys(price)
    .map((key) => {
      const id = key.startsWith('mining_') ? key.slice(7) : key
      return `${nameOf(id)} ${fmt(price[key])}`
    })
    .join(' + ')
}

/* ── 状态区 ── */

const subfeature = computed(() => {
  void uiVersion.value
  return state.value.mining.subfeature
})
const depth = computed(() => {
  void uiVersion.value
  return state.value.mining.depth
})
const maxDepth = computed(() => {
  void uiVersion.value
  return state.value.mining.subfeature === 0
    ? state.value.mining.maxDepth0
    : state.value.mining.maxDepth1
})
const damage = computed(() => {
  void uiVersion.value
  return miningPickaxePower(state.value)
})
const toughness = computed(() => {
  void uiVersion.value
  return miningToughness(state.value)
})
const effective = computed(() => {
  void uiVersion.value
  return miningEffectiveDamage(state.value)
})
const wallPct = computed(() => {
  void uiVersion.value
  return Math.min(100, Math.max(0, (1 - miningWallProgress(state.value)) * 100))
})
const hitsText = computed(() => {
  void uiVersion.value
  const hits = miningHitsNeeded(state.value)
  return Number.isFinite(hits) ? fmt(hits) : '∞'
})
const nextHitsText = computed(() => {
  void uiVersion.value
  const hits = miningDepthHitsNeeded(state.value, depth.value + 1)
  return Number.isFinite(hits) ? fmt(hits) : '∞'
})
const scrapPerSec = computed(() => {
  void uiVersion.value
  return fmt(miningScrapPerSecond(state.value))
})
const scrapCapText = computed(() => {
  void uiVersion.value
  return fmt(scrapCap(state.value))
})
/** 伤害被硬度吃光：矿壁不再推进，需要降硬度手段。 */
const isStuck = computed(() => effective.value <= 0)

/** 本层可采矿石（含每秒产出）。 */
const depthOres = computed(() => {
  void uiVersion.value
  return MINING_ORES.filter((o) => miningOreCollectible(state.value, o)).map((o) => ({
    id: o.id,
    perSec: miningOrePerSecond(state.value, o.id),
  }))
})

/** 本层可得稀有掉落。 */
const rareHere = computed(() => {
  void uiVersion.value
  const drops = miningRareDrops(state.value)
  return MINING_RARE_EARTHS.filter((id) => (drops[id] ?? 0) > 0).map((id) => ({
    id,
    amount: drops[id] ?? 0,
  }))
})

/** 当前层是否被信标覆盖。 */
const beaconHere = computed(() => {
  void uiVersion.value
  return miningActiveBeacon(state.value)
})

/* ── 深度导航 ── */

/** 跳层：往下潜是下滑音、往回退是上滑音，方向不同声音不同。 */
function jump(target: number): void {
  play(target > depth.value ? 'navDown' : 'navUp')
  store.doSetMiningDepth(target)
}

/** 切换下次转生进入的子模式（普通矿 / 气态矿）。 */
function onSubfeature(sf: 0 | 1): void {
  play('tab')
  store.setPrestigeSubfeature(sf)
}

const autoProgress = computed(() => {
  void uiVersion.value
  return state.value.mining.autoProgress
})

/** 自动下潜是否开启：阈值 > 0 即开启（0 = 手动导航）。 */
const autoDive = computed(() => autoProgress.value > 0)

/** 开关勾选：开启时阈值为 0 则补默认值 1 秒；关闭时置 0。 */
function onAutoDive(e: Event): void {
  const enabled = (e.target as HTMLInputElement).checked
  play(enabled ? 'toggleOn' : 'toggleOff')
  store.doSetAutoProgress(enabled ? Math.max(1, autoProgress.value) : 0)
}

function onAutoProgress(e: Event): void {
  play('tick')
  store.doSetAutoProgress(Number((e.target as HTMLInputElement).value))
}

const autoBuyUpgrades = computed(() => {
  void uiVersion.value
  return state.value.mining.autoBuyUpgrades
})

function onAutoBuy(e: Event): void {
  const enabled = (e.target as HTMLInputElement).checked
  play(enabled ? 'toggleOn' : 'toggleOff')
  store.doSetAutoBuyUpgrades(enabled)
}

/* ── 锻造 ── */

const slots = computed(() => {
  void uiVersion.value
  return state.value.mining.ingredientList
})
const slotCount = computed(() => {
  void uiVersion.value
  return miningCraftingSlots(state.value)
})
const craftChance = computed(() => {
  void uiVersion.value
  return (miningPickaxeChance(state.value) * 100).toFixed(1)
})
const craftStats = computed(() => {
  void uiVersion.value
  return miningPickaxeStats(state.value)
})
const craftingUnlocked = computed(() => {
  void uiVersion.value
  return miningIsUnlocked(state.value, 'miningPickaxeCrafting', true)
})

function oreHeld(id: MiningOreId): number {
  return currencyOf(state.value, id)
}

/** 往锻造槽位放一份矿石。 */
function onAddOre(id: MiningOreId): void {
  play('place')
  store.doAddIngredient(id)
}

/** 从锻造槽位取出一份矿石。 */
function onRemoveIngredient(index: number): void {
  play('remove')
  store.doRemoveIngredient(index)
}

/* ── 升级树 ── */

/** 严格过滤（对齐 Gooboo UpgradeList）：只显示已满足解锁条件的升级，不预告未解锁卡片。 */
const visibleUpgrades = computed(() => {
  void uiVersion.value
  return MINING_UPGRADES.filter((u) => miningUpgradeUnlocked(state.value, u.id))
})

const visibleGasUpgrades = computed(() => {
  void uiVersion.value
  return MINING_GAS_UPGRADES.filter((u) => miningUpgradeUnlocked(state.value, u.id))
})

const visiblePrestige = computed(() => {
  void uiVersion.value
  return MINING_PRESTIGE_UPGRADES.filter((u) => miningUpgradeUnlocked(state.value, u.id))
})

/** 仅展示当前可见（已解锁或无条件）的 Premium 升级；无红宝石时区块整体隐藏。 */
const visiblePremium = computed(() => {
  void uiVersion.value
  return MINING_PREMIUM_UPGRADES.filter((u) => isPremiumVisible(state.value.mining, u))
})
const ruby = computed(() => {
  void uiVersion.value
  return currencyOf(state.value, 'gem_ruby')
})
/** 是否已购买过任一 Premium 升级（跨转生保留）。 */
const hasAnyPremium = computed(() => {
  void uiVersion.value
  return Object.values(state.value.mining.premiumUpgrades).some((lvl) => lvl > 0)
})

function premiumPriceText(id: string): string {
  const def = MINING_PREMIUM_UPGRADES.find((u) => u.id === id)
  if (def === undefined) return ''
  return priceText(def.price(premiumLevelOf(state.value.mining, id)))
}
function premiumReasonText(id: string): string {
  const block = premiumBlock(state.value.mining, id)
  if (block === null) return ''
  if (block.kind === 'resource') {
    return `需要 ${nameOf(block.id)} ${fmt(block.need)}`
  }
  if (block.kind === 'capped') return '已满级'
  return '未解锁'
}

/** 深度居民是否已解锁（对齐 Gooboo 的 `unlock.miningDepthDweller.see`）。 */
const dwellerUnlocked = computed(() => {
  void uiVersion.value
  return miningIsUnlocked(state.value, 'miningDepthDweller')
})

/** 效果名 → 中文，用于「下一个解锁」tooltip 的效果预览。 */
const EFFECT_LABELS: Record<string, string> = {
  miningDamage: '矿伤害',
  miningToughness: '硬度',
  miningOreGain: '矿石获取',
  miningOreCap: '矿石容量',
  miningOreQuality: '矿石品质',
  miningRareEarthGain: '稀有物获取',
  miningPickaxeCraftingPower: '镐子锻造威力',
  miningPickaxeCraftingSlots: '镐子锻造槽位',
  miningDepthDwellerSpeed: '深度居民速度',
  miningDepthDwellerMax: '深度居民上限',
  miningSmelteryTemperature: '熔炼温度',
  currencyMiningScrapGain: '废料获取',
  currencyMiningScrapCap: '废料上限',
  currencyMiningCrystalGreenGain: '绿水晶获取',
  currencyMiningOreAluminiumCap: '铝矿上限',
  currencyMiningOreCopperCap: '铜矿上限',
  currencyMiningOreTinCap: '锡矿上限',
  currencyMiningOreIronCap: '铁矿上限',
  currencyMiningOreTitaniumCap: '钛矿上限',
  currencyMiningOrePlatinumCap: '铂矿上限',
  currencyMiningOreIridiumCap: '铱矿上限',
  currencyMiningOreOsmiumCap: '锇矿上限',
  currencyMiningOreLeadCap: '铅矿上限',
  miningPickaxeCrafting: '镐子锻造',
  miningSmeltery: '熔炼厂',
  miningEnhancement: '锭增强',
  miningDepthDweller: '深度居民',
  miningCompressAluminium: '压缩铝矿',
  miningCompressCopper: '压缩铜矿',
  miningCompressTin: '压缩锡矿',
  miningCompressIron: '压缩铁矿',
  miningCompressTitanium: '压缩钛矿',
  miningCompressPlatinum: '压缩铂矿',
  miningCompressIridium: '压缩铱矿',
  miningCompressOsmium: '压缩锇矿',
  miningCompressLead: '压缩铅矿',
}

/** 找出当前区里「门槛最小且尚未达成」的升级（对齐 Gooboo `requirementNext`）。 */
function nextUpgradeHint(defs: readonly MiningUpgradeDef[]): MiningUpgradeDef | null {
  let best: MiningUpgradeDef | null = null
  for (const def of defs) {
    if (miningUpgradeUnlocked(state.value, def.id)) continue
    const r = def.requirement
    if (r.type !== 'depth' && r.type !== 'dwellerCap') continue
    if (best === null || r.value < (best.requirement as { value: number }).value) {
      best = def
    }
  }
  return best
}

const nextRegular = computed(() => {
  void uiVersion.value
  return nextUpgradeHint(MINING_UPGRADES)
})
const nextGas = computed(() => {
  void uiVersion.value
  return nextUpgradeHint(MINING_GAS_UPGRADES)
})
const nextPrestige = computed(() => {
  void uiVersion.value
  return nextUpgradeHint(MINING_PRESTIGE_UPGRADES)
})

/** 升级门槛的中文描述。 */
function thresholdTextOf(def: MiningUpgradeDef): string {
  const r = def.requirement
  if (r.type === 'depth') return `深度达到 ${fmt(r.value)}`
  if (r.type === 'dwellerCap') return `深度居民上限达到 ${fmt(r.value)}`
  return ''
}

/** 「下一个解锁」提示条的 tooltip 正文（门槛 + 价格 + 效果预览）。 */
function nextHintContent(def: MiningUpgradeDef, kind: 'regular' | 'prestige'): string {
  const price = upgradePrice(def.id, kind)
  const effects = def.effect
    .map((e) => {
      const label = EFFECT_LABELS[e.name] ?? e.name
      if (e.type === 'unlock') return `解锁${label}`
      const v = e.value(1)
      return `${label} ${fmt(typeof v === 'number' ? v : 0)}`
    })
    .join('\n')
  return `解锁条件：${thresholdTextOf(def)}\n价格：${price}\n效果：\n${effects}`
}

function upgradePrice(id: string, kind: 'regular' | 'prestige'): string {
  const def =
    kind === 'prestige'
      ? MINING_PRESTIGE_UPGRADES.find((u) => u.id === id)
      : ([...MINING_UPGRADES, ...MINING_GAS_UPGRADES] as Array<{ id: string; price: (l: number) => Record<string, number> }>).find(
          (u) => u.id === id,
        )
  if (def === undefined) return ''
  return priceText(def.price(upgradeLevel(state.value, id)))
}

/* ── 熔炼厂 ── */

const smelteryUnlocked = computed(() => {
  void uiVersion.value
  return miningIsUnlocked(state.value, 'miningSmeltery', true)
})

function smelteryPriceText(id: SmelteryId): string {
  void uiVersion.value
  const line = state.value.mining.smeltery[id]
  if (line === undefined) return ''
  const def = MINING_SMELTERY.find((s) => s.id === id)
  if (def === undefined) return ''
  return priceText(def.price(line.total))
}

function smelteryStored(id: SmelteryId): number {
  return miningSmelteryStored(state.value, id)
}

function smelteryProgress(id: SmelteryId): number {
  return miningSmelteryProgress(state.value, id) * 100
}

function smelteryEta(id: SmelteryId): string {
  void uiVersion.value
  const time = miningSmelteryTimeNeeded(state.value, id)
  if (!Number.isFinite(time)) return '—'
  if (time < 60) return `${time.toFixed(0)}s`
  if (time < 3600) return `${(time / 60).toFixed(1)}m`
  if (time < 86400) return `${(time / 3600).toFixed(1)}h`
  return `${(time / 86400).toFixed(1)}d`
}

/* ── 锭增强 ── */

const enhancementUnlocked = computed(() => {
  void uiVersion.value
  return miningIsUnlocked(state.value, 'miningEnhancement', true)
})
const enhancementMax = computed(() => {
  void uiVersion.value
  return miningEnhancementMax(state.value)
})

function onSelectBar(id: string): void {
  play('select')
  store.state.mining.enhancementIngredient = id
  uiVersion.value += 1
}

/* ── 信标 ── */

const beaconList = computed(() => {
  void uiVersion.value
  return MINING_BEACONS.map((b) => ({
    id: b.id,
    name: MINING_BEACON_NAMES[b.id] ?? b.id,
    owned: miningBeaconOwned(state.value, b.id),
    color: b.color,
  }))
})

const beaconPlaceDepth = ref<number>(1)

function onPlaceBeacon(id: 'piercing' | 'rich' | 'wonder' | 'hope'): void {
  play('place')
  store.doSetMiningDepth(beaconPlaceDepth.value)
  store.state.mining.beaconPlaced[state.value.mining.depth] = id
  uiVersion.value += 1
}

/* ── 转生 / 深度居民 ── */

const crystal = computed(() => {
  void uiVersion.value
  return currencyOf(state.value, 'crystalGreen')
})
const dwellerCur = computed(() => {
  void uiVersion.value
  return state.value.mining.depthDweller0
})
const dwellerLimit = computed(() => {
  void uiVersion.value
  return miningDwellerLimit(state.value)
})
const dwellerPct = computed(() =>
  dwellerLimit.value <= 0 ? 0 : Math.min(100, (dwellerCur.value / dwellerLimit.value) * 100),
)
const prestigeReward = computed(() => {
  void uiVersion.value
  return fmt(store.previewMiningPrestige())
})
/** 气态子模式是否在转生选择中可见（历史深度 625 后解锁）。 */
const gasSubfeatureUnlocked = computed(() => {
  void uiVersion.value
  return miningIsUnlocked(state.value, 'miningGasSubfeature')
})

/* ── 圣遗物 ── */

const visibleRelics = computed(() => {
  void uiVersion.value
  return MINING_RELICS.filter((r) => relicUnlocked(r, state.value))
})
const relicPower = computed(() => {
  void uiVersion.value
  return state.value.mining.relicPower
})
const foundNotes = computed(() => {
  void uiVersion.value
  return MINING_NOTES.filter((n) => state.value.mining.discoveredNotes.includes(n.depth))
})

/* ── 卡牌 ── */

const emerald = computed(() => {
  void uiVersion.value
  return currencyOf(state.value, 'gem_emerald')
})
const cardCapNow = computed(() => {
  void uiVersion.value
  return cardCap(state.value.mining)
})
const cardPowerNow = computed(() => {
  void uiVersion.value
  return cardPower(state.value.mining)
})
const cardCount = computed(() => {
  void uiVersion.value
  return cardsCollected(state.value.mining)
})
const ownedCards = computed(() => {
  void uiVersion.value
  return MINING_CARDS.filter((c) => (state.value.mining.cards[c.id] ?? 0) > 0)
})
const packList = computed(() => {
  void uiVersion.value
  return Object.keys(MINING_CARD_PACKS).map((id) => {
    const pack = MINING_CARD_PACKS[id]
    return {
      id,
      pack,
      unlocked:
        pack.unlock === undefined ? true : miningIsUnlocked(state.value, pack.unlock),
    }
  })
})

function cardSelected(id: number): boolean {
  return state.value.mining.cardSelected.includes(id)
}
</script>

<template>
  <div class="mining-panel pixel-number">
    <!-- ── 转生条 ── -->
    <section class="mp-section">
      <div class="mp-rebirth">
        <div class="mp-rebirth__info">
          <span class="mp-rebirth__crystal">💎 {{ fmt(crystal) }}</span>
          <span class="mp-rebirth__reward">本次 +{{ prestigeReward }}</span>
          <span class="mp-rebirth__threshold">
            深度居民 {{ fmt(dwellerCur) }} / {{ fmt(dwellerLimit) }}
          </span>
        </div>
        <div class="mp-rebirth__right">
          <div v-if="gasSubfeatureUnlocked" class="mp-nav">
            <button
              class="mp-nav__btn"
              :class="{ 'is-active': store.prestigeSubfeature === 0 }"
              @click="onSubfeature(0)"
            >
              普通矿
            </button>
            <button
              class="mp-nav__btn"
              :class="{ 'is-active': store.prestigeSubfeature === 1 }"
              @click="onSubfeature(1)"
            >
              气态矿
            </button>
          </div>
          <ActionButton
            type="success"
            sound="prestige"
            :disabled="!store.canPrestige(1)"
            :reason="store.whyCannotPrestige(1)"
            placement="left"
            @click="store.doPrestige(1)"
          >
            转生
          </ActionButton>
        </div>
      </div>
      <GtProgress :percentage="dwellerPct" status="warning" />
    </section>

    <!-- ── 状态区 ── -->
    <section class="mp-section">
      <h3 class="mp-title">
        <span>⛏ 矿场状态</span>
        <Tooltip content="每秒对当前层造成一次伤害；耐久归零即击碎一层。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>

      <!-- 深度导航：左组贴左、右组贴右，深度居中 -->
      <div class="mp-nav">
        <div class="mp-nav__group">
          <button class="mp-nav__btn" :disabled="depth <= 1" @click="jump(1)">⏮</button>
          <button class="mp-nav__btn" :disabled="depth <= 1" @click="jump(depth - 10)">◀◀</button>
          <button class="mp-nav__btn" :disabled="depth <= 1" @click="jump(depth - 1)">◀</button>
        </div>
        <span class="mp-nav__depth">第 {{ depth }} / {{ maxDepth }} 层</span>
        <div class="mp-nav__group mp-nav__group--end">
          <button class="mp-nav__btn" :disabled="depth >= maxDepth" @click="jump(depth + 1)">▶</button>
          <button class="mp-nav__btn" :disabled="depth >= maxDepth" @click="jump(depth + 10)">▶▶</button>
          <button class="mp-nav__btn" :disabled="depth >= maxDepth" @click="jump(maxDepth)">⏭</button>
        </div>
      </div>

      <div class="mp-nav-settings">
        <div class="mp-nav-settings__item">
          <label class="mp-nav-settings__toggle">
            <input
              type="checkbox"
              :checked="autoDive"
              @change="onAutoDive"
            />
            <span>自动下潜</span>
          </label>
          <input
            class="mp-input"
            type="number"
            min="0"
            max="999999999"
            :disabled="!autoDive"
            :value="autoProgress"
            @change="onAutoProgress"
          />
          <span class="mp-nav-settings__hint">下一层在 N 秒内可击碎则前进</span>
        </div>
        <label class="mp-nav-settings__item">
          <input
            type="checkbox"
            :checked="autoBuyUpgrades"
            @change="onAutoBuy"
          />
          <span>自动购买升级</span>
          <span class="mp-nav-settings__hint">每 10 秒自动购买买得起的升级</span>
        </label>
      </div>

      <div class="mp-stats">
        <span class="stat">伤害 <b>{{ fmt(damage) }}</b></span>
        <span class="stat">硬度 <b>{{ fmt(toughness) }}</b></span>
        <span class="stat" :class="{ 'stat--bad': isStuck }">
          有效 <b>{{ fmt(effective) }}</b>
        </span>
        <span class="stat">击碎所需 <b>{{ hitsText }}</b></span>
        <span class="stat">下一层 <b>{{ nextHitsText }}</b></span>
        <span class="stat">废料 <b>{{ scrapPerSec }}</b>/s</span>
        <span class="stat">废料上限 <b>{{ scrapCapText }}</b></span>
      </div>

      <p v-if="isStuck" class="mp-warn">
        ⚠ 伤害被硬度吃光，矿壁不再推进 —— 需要降硬度（破壁者 / 腐蚀烟气 / 炸药 / 信标）。
      </p>

      <GtProgress :percentage="wallPct" status="success" />

      <div class="mp-chips">
        <span v-for="o in depthOres" :key="o.id" class="chip chip--ore">
          {{ nameOf(o.id) }} +{{ fmt(o.perSec) }}/s
        </span>
        <span v-for="r in rareHere" :key="r.id" class="chip chip--rare">
          {{ nameOf(r.id) }} +{{ fmt(r.amount) }}
        </span>
        <span v-if="beaconHere !== null" class="chip chip--beacon">
          信标：{{ MINING_BEACON_NAMES[beaconHere] ?? beaconHere }}
        </span>
        <span v-if="depthOres.length === 0 && rareHere.length === 0" class="chip chip--empty">
          本层无产出
        </span>
      </div>
    </section>

    <!-- ── 锻造 ── -->
    <section v-if="craftingUnlocked" class="mp-section">
      <h3 class="mp-title">
        <span>🔨 镐子锻造</span>
        <Tooltip
          content="把矿石放进槽位后锻造：品质决定上限，纯度决定提升概率，结果有随机性。"
          placement="right"
        >
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>

      <div class="mp-craft">
        <span class="mp-craft__power">镐子威力 <b>{{ fmt(damage) }}</b></span>
        <span class="mp-craft__stat">品质 {{ fmt(craftStats.quality) }}</span>
        <span class="mp-craft__stat">纯度 {{ (craftStats.purity * 100).toFixed(1) }}%</span>
        <span class="mp-craft__stat">杂质 ×{{ craftStats.impurity.toFixed(2) }}</span>
        <span class="mp-craft__stat">提升概率 {{ craftChance }}%</span>
      </div>

      <div class="mp-slots">
        <span class="mp-slots__label">槽位 {{ slots.length }}/{{ slotCount }}</span>
        <div class="mp-chips">
          <span v-for="(s, i) in slots" :key="i" class="chip chip--slot" @click="onRemoveIngredient(i)">
            {{ nameOf(s.name) }}<template v-if="s.compress > 0"> ×{{ 5 ** s.compress }}</template> ✕
          </span>
          <span v-if="slots.length === 0" class="chip chip--empty">点击下方矿石加入槽位</span>
        </div>
      </div>

      <div class="mp-chips">
        <button
          v-for="o in MINING_ORES"
          :key="o.id"
          class="chip chip--btn"
          :disabled="oreHeld(o.id) <= 0"
          @click="onAddOre(o.id)"
        >
          {{ nameOf(o.id) }} {{ fmt(oreHeld(o.id)) }}
        </button>
      </div>

      <ActionButton type="primary" sound="craft" @click="store.doCraftPickaxe()">锻造</ActionButton>
    </section>

    <!-- ── 升级树 ── -->
    <section class="mp-section">
      <h3 class="mp-title">
        <span>⛏ 升级树</span>
        <Tooltip content="以废料与矿石购买；解锁按历史最大深度阶梯开放。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>
      <div v-if="nextRegular" class="mp-next">
        <Tooltip :title="upgradeNameOf(nextRegular.id)" :content="nextHintContent(nextRegular, 'regular')" placement="right">
          <span class="mp-next__label">⌃ 下一个解锁：{{ thresholdTextOf(nextRegular) }} → {{ upgradeNameOf(nextRegular.id) }}</span>
        </Tooltip>
      </div>
      <div class="mp-grid">
        <div
          v-for="u in visibleUpgrades"
          :key="u.id"
          class="mp-card"
          :class="{
            'mp-card--locked': !miningUpgradeUnlocked(state, u.id),
            'mp-card--affordable': store.canBuyMining(u.id),
          }"
        >
          <div class="mp-card__head">
            <span class="mp-card__name">{{ upgradeNameOf(u.id) }}</span>
            <span class="mp-card__lvl">Lv{{ upgradeLevel(state, u.id) }}</span>
          </div>
          <div class="mp-card__foot">
            <span class="mp-card__cost">{{ upgradePrice(u.id, 'regular') }}</span>
            <div class="mp-card__btns">
              <ActionButton
                size="small"
                sound="buy"
                :disabled="!store.canBuyMining(u.id)"
                :reason="store.whyCannotBuyMining(u.id)"
                @click="store.doBuyMiningUpgrade(u.id)"
              >
                ↑
              </ActionButton>
              <ActionButton
                size="small"
                type="success"
                sound="buy"
                :disabled="!store.canBuyMining(u.id)"
                :reason="store.whyCannotBuyMining(u.id)"
                @click="store.doBuyMiningUpgradeMax(u.id)"
              >
                最大
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 气态升级（仅在气态子模式下展示） ── -->
    <section v-if="subfeature === 1" class="mp-section">
      <h3 class="mp-title"><span>💨 气态升级（子模式 1）</span></h3>
      <div v-if="nextGas" class="mp-next">
        <Tooltip :title="upgradeNameOf(nextGas.id)" :content="nextHintContent(nextGas, 'regular')" placement="right">
          <span class="mp-next__label">⌃ 下一个解锁：{{ thresholdTextOf(nextGas) }} → {{ upgradeNameOf(nextGas.id) }}</span>
        </Tooltip>
      </div>
      <div class="mp-grid">
        <div
          v-for="g in visibleGasUpgrades"
          :key="g.id"
          class="mp-card"
          :class="{ 'mp-card--locked': !miningUpgradeUnlocked(state, g.id) }"
        >
          <div class="mp-card__head">
            <span class="mp-card__name">{{ upgradeNameOf(g.id) }}</span>
            <span class="mp-card__lvl">Lv{{ upgradeLevel(state, g.id) }}</span>
          </div>
          <div class="mp-card__foot">
            <span class="mp-card__cost">{{ upgradePrice(g.id, 'regular') }}</span>
            <div class="mp-card__btns">
              <ActionButton
                size="small"
                sound="buy"
                :disabled="!store.canBuyGas(g.id)"
                :reason="store.whyCannotBuyGas(g.id)"
                @click="store.doBuyGasUpgrade(g.id)"
              >
                ↑
              </ActionButton>
              <ActionButton
                size="small"
                type="success"
                sound="buy"
                :disabled="!store.canBuyGas(g.id)"
                :reason="store.whyCannotBuyGas(g.id)"
                @click="store.doBuyGasUpgradeMax(g.id)"
              >
                最大
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 熔炼厂 ── -->
    <section v-if="smelteryUnlocked" class="mp-section">
      <h3 class="mp-title">
        <span>🔥 熔炼厂</span>
        <Tooltip content="投入矿石与稀有物，按温度与堆料成本计时产出锭。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>
      <div class="mp-grid">
        <div v-for="s in MINING_SMELTERY" :key="s.id" class="mp-card">
          <div class="mp-card__head">
            <span class="mp-card__name">{{ MINING_SMELTERY_NAMES[s.id] ?? s.id }}</span>
            <span class="mp-card__lvl">{{ nameOf(s.output) }} {{ fmt(currencyOf(state, s.output)) }}</span>
          </div>
          <span class="mp-card__cost">{{ smelteryPriceText(s.id) }}</span>
          <span class="mp-card__cost">待产 {{ smelteryStored(s.id) }} · 单炉 {{ smelteryEta(s.id) }}</span>
          <GtProgress :percentage="smelteryProgress(s.id)" status="warning" />
          <ActionButton size="small" sound="place" @click="store.doAddToSmeltery(s.id, true)">
            投料
          </ActionButton>
        </div>
      </div>
    </section>

    <!-- ── 锭增强 ── -->
    <section v-if="enhancementUnlocked" class="mp-section">
      <h3 class="mp-title">
        <span>✨ 锭增强</span>
        <Tooltip content="消耗锭提升对应效果；有增强时黑曜石产出会被压制。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>
      <div class="mp-chips">
        <button
          v-for="e in MINING_ENHANCEMENTS"
          :key="e.id"
          class="chip chip--btn"
          :class="{ 'chip--active': state.mining.enhancementIngredient === e.id }"
          @click="onSelectBar(e.id)"
        >
          {{ nameOf(e.id) }} Lv{{ miningEnhancementLevel(state, e.id) }}/{{ enhancementMax }}
        </button>
      </div>
      <div class="mp-enhance">
        <span class="mp-card__cost">
          需要 {{ 10 + 5 * miningEnhancementLevel(state, state.mining.enhancementIngredient ?? '') }} 根
        </span>
        <ActionButton
          size="small"
          type="success"
          sound="enhance"
          :disabled="!store.canEnhance()"
          :reason="store.whyCannotEnhance()"
          @click="store.doEnhancePickaxe()"
        >
          增强
        </ActionButton>
      </div>
    </section>

    <!-- ── 卡牌 ── -->
    <section v-if="emerald > 0 || ownedCards.length > 0" class="mp-section">
      <h3 class="mp-title">
        <span>🃏 卡牌</span>
        <Tooltip content="绿宝石购买卡包；装备上限卡后获得加成。绿宝石在转生时按深度居民产出。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>

      <div class="mp-stats">
        <span class="stat">绿宝石 <b>{{ fmt(emerald) }}</b></span>
        <span class="stat">已收集 <b>{{ cardCount }}</b>/59</span>
        <span class="stat">装备槽 <b>{{ cardCapNow }}</b></span>
        <span class="stat">卡力量 <b>{{ cardPowerNow }}</b></span>
      </div>

      <div class="mp-chips">
        <span v-for="p in packList.filter((x) => x.unlocked)" :key="p.id" class="chip">
          {{ p.id }} · {{ p.pack.price }}💎 ×{{ p.pack.amount }}
          <button class="chip chip--btn" @click="store.doOpenCardPack(p.id)">买</button>
        </span>
      </div>

      <div v-if="ownedCards.length > 0" class="mp-enhance">
        <span class="mp-slots__label">装备卡（选择 {{ cardCapNow }} 张）</span>
        <div class="mp-chips">
          <button
            v-for="c in ownedCards"
            :key="c.id"
            class="chip chip--btn"
            :class="{ 'chip--active': cardSelected(c.id) || state.mining.cardEquipped.includes(c.id) }"
            @click="store.doToggleCard(c.id)"
          >
            #{{ c.id }} · {{ c.power === 'adaptive' ? '?' : fmt(c.power) }}
          </button>
        </div>
        <ActionButton size="small" type="success" @click="store.doActivateCards()">装备</ActionButton>
        <ActionButton size="small" @click="store.doUnequipCards()">卸下</ActionButton>
      </div>
    </section>

    <!-- ── 信标 ── -->
    <section class="mp-section">
      <h3 class="mp-title">
        <span>🚩 信标</span>
        <Tooltip content="信标按范围加成：穿透降硬度、富饶加矿石、奇景加稀产、希望加伤害。" placement="right">
          <span class="mp-title__hint">?</span>
        </Tooltip>
      </h3>
      <div class="mp-chips">
        <span v-for="b in beaconList" :key="b.id" class="chip" :class="`chip--${b.color}`">
          {{ b.name }} ×{{ b.owned }}
        </span>
      </div>
      <div v-if="beaconList.some((b) => b.owned > 0)" class="mp-enhance">
        <input v-model.number="beaconPlaceDepth" class="mp-input" type="number" min="1" :max="maxDepth" />
        <button
          v-for="b in beaconList.filter((x) => x.owned > 0)"
          :key="b.id"
          class="chip chip--btn"
          @click="onPlaceBeacon(b.id)"
        >
          放置 {{ b.name }}
        </button>
      </div>
    </section>

    <!-- ── 声望升级（对齐 Gooboo：未解锁「深度居民」时整个区块隐藏） ── -->
    <section v-if="dwellerUnlocked" class="mp-section">
      <h3 class="mp-title"><span>💎 声望升级</span></h3>
      <div v-if="nextPrestige" class="mp-next">
        <Tooltip :title="upgradeNameOf(nextPrestige.id)" :content="nextHintContent(nextPrestige, 'prestige')" placement="right">
          <span class="mp-next__label">⌃ 下一个解锁：{{ thresholdTextOf(nextPrestige) }} → {{ upgradeNameOf(nextPrestige.id) }}</span>
        </Tooltip>
      </div>
      <div class="mp-grid">
        <div
          v-for="p in visiblePrestige"
          :key="p.id"
          class="mp-card"
          :class="{ 'mp-card--locked': !miningUpgradeUnlocked(state, p.id) }"
        >
          <div class="mp-card__head">
            <span class="mp-card__name">{{ upgradeNameOf(p.id) }}</span>
            <span class="mp-card__lvl">Lv{{ upgradeLevel(state, p.id) }}</span>
          </div>
          <div class="mp-card__foot">
            <span class="mp-card__cost">{{ upgradePrice(p.id, 'prestige') }}</span>
            <div class="mp-card__btns">
              <ActionButton
                size="small"
                sound="buy"
                :disabled="!store.canBuyPrestige(p.id)"
                :reason="store.whyCannotBuyPrestige(p.id)"
                @click="store.doBuyMiningPrestige(p.id)"
              >
                ↑
              </ActionButton>
              <ActionButton
                size="small"
                type="success"
                sound="buy"
                :disabled="!store.canBuyPrestige(p.id)"
                :reason="store.whyCannotBuyPrestige(p.id)"
                @click="store.doBuyMiningPrestigeMax(p.id)"
              >
                最大
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section v-else class="mp-section">
      <h3 class="mp-title"><span>💎 声望升级</span></h3>
      <p class="mp-next mp-next--locked">
        🔒 声望升级未开放：历史最大深度达到 40 并购买「深度居民」后开放。
      </p>
    </section>

    <!-- ── Premium 升级（红宝石） ── -->
    <section v-if="ruby > 0 || hasAnyPremium" class="mp-section">
      <h3 class="mp-title">
        <span>💠 Premium 升级</span>
        <span class="mp-nav-settings__hint">红宝石 {{ fmt(ruby) }}</span>
      </h3>
      <div class="mp-grid">
        <div
          v-for="p in visiblePremium"
          :key="p.id"
          class="mp-card"
          :class="{ 'mp-card--locked': !isPremiumVisible(state.mining, p) }"
        >
          <div class="mp-card__head">
            <span class="mp-card__name">{{ MINING_PREMIUM_NAMES[p.id] ?? p.id }}</span>
            <span class="mp-card__lvl">Lv{{ premiumLevelOf(state.mining, p.id) }}/{{ p.cap ?? '∞' }}</span>
          </div>
          <div class="mp-card__foot">
            <span class="mp-card__cost">{{ premiumPriceText(p.id) }}</span>
            <div class="mp-card__btns">
              <ActionButton
                size="small"
                type="success"
                :disabled="premiumBlock(state.mining, p.id) !== null"
                :reason="premiumReasonText(p.id)"
                @click="store.doBuyPremium(p.id)"
              >
                ↑
              </ActionButton>
              <ActionButton
                size="small"
                type="success"
                :disabled="premiumBlock(state.mining, p.id) !== null"
                :reason="premiumReasonText(p.id)"
                @click="store.doBuyPremiumMax(p.id)"
              >
                最大
              </ActionButton>
            </div>
          </div>
          <span v-if="!isPremiumVisible(state.mining, p)" class="mp-card__unlock">
            🔒 {{ premiumReasonText(p.id) }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── 圣遗物 ── -->
    <section v-if="visibleRelics.length > 0" class="mp-section">
      <h3 class="mp-title">
        <span>🦇 圣遗物</span>
        <span class="mp-nav-settings__hint">遗物之力 {{ relicPower.toFixed(1) }} / 100</span>
      </h3>
      <div class="mp-grid">
        <div
          v-for="r in visibleRelics"
          :key="r.id"
          class="mp-card"
          :class="{ 'mp-card--locked': !relicUnlocked(r, state) }"
        >
          <div class="mp-card__head">
            <span class="mp-card__name">{{ r.icon }} {{ r.id }}</span>
            <span v-if="relicUnlocked(r, state)" class="mp-card__lvl">✓ 已解锁</span>
            <span v-else class="mp-card__lock">🔒</span>
          </div>
          <p v-if="!relicUnlocked(r, state)" class="mp-card__unlock">
            {{ r.unlockGl !== undefined ? `全局等级 ${r.unlockGl} 解锁` : '树脂成就 Lv3 解锁' }}
          </p>
          <div v-if="r.active" class="mp-card__foot">
            <span class="mp-card__cost">消耗 {{ r.active.cost }} 之力</span>
            <ActionButton
              size="small"
              type="success"
              :disabled="!relicUnlocked(r, state) || relicPower < (r.active?.cost ?? 0)"
              @click="store.doUseRelicActive(r.id)"
            >
              发动
            </ActionButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 探险笔记 ── -->
    <section v-if="foundNotes.length > 0" class="mp-section">
      <h3 class="mp-title"><span>📜 探险笔记</span></h3>
      <div class="mp-grid">
        <div v-for="n in foundNotes" :key="n.id" class="mp-card">
          <div class="mp-card__head">
            <span class="mp-card__name">{{ n.title }}</span>
            <span class="mp-card__lvl">第 {{ n.depth }} 层</span>
          </div>
          <p class="mp-note-text">{{ n.text }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mining-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}
.mp-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.mp-rebirth {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--line-2);
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.3);
}
.mp-rebirth__info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-xs);
}
.mp-rebirth__crystal { color: #6ee89a; font-weight: 700; }
.mp-rebirth__reward { color: var(--gold-400); }
.mp-rebirth__threshold { color: var(--txt-faint); font-size: var(--fs-xs); }
.mp-rebirth__right { display: flex; align-items: center; gap: var(--sp-2); }
.mp-nav__btn.is-active { color: var(--gold-300); border-color: var(--gold-500); }
.mp-nav__auto {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-left: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--txt-faint);
}
.mp-nav__auto-hint { font-size: var(--fs-xs); }

.mp-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--gold-400);
  letter-spacing: 1px;
}
.mp-title__hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(16px * var(--ui-scale));
  height: calc(16px * var(--ui-scale));
  flex-shrink: 0;
  border: 1px solid var(--line-2);
  background: var(--bg-4);
  color: var(--txt-dim);
  font-size: var(--fs-xs);
  line-height: 1;
  cursor: help;
  user-select: none;
}
.mp-title__hint:hover { color: var(--gold-300); border-color: var(--gold-500); }

/* 深度导航：撑满卡片宽度，左/右按钮组贴边，深度居中 */
.mp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2);
  background: var(--bg-3);
  border: 1px solid var(--line-2);
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.3);
}
.mp-nav__group {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}
.mp-nav__group--end { justify-content: flex-end; }
.mp-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(28px * var(--ui-scale));
  padding: var(--sp-1) var(--sp-2);
  background: var(--bg-2);
  border: 1px solid var(--line-2);
  color: var(--txt-sub);
  font-family: inherit;
  font-size: var(--fs-xs);
  line-height: 1.2;
  cursor: pointer;
}
.mp-nav__btn:hover:not(:disabled) { color: var(--gold-300); border-color: var(--gold-500); }
.mp-nav__btn:disabled { opacity: 0.3; cursor: not-allowed; }
.mp-nav__depth {
  flex: 1;
  min-width: 0;
  text-align: center;
  color: var(--gold-400);
  font-size: var(--fs-xs);
  font-weight: 700;
  white-space: nowrap;
}

/* 导航条下方设置行 */
.mp-nav-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2) var(--sp-4);
  font-size: var(--fs-xs);
  color: var(--txt-dim);
}
.mp-nav-settings__item {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}
label.mp-nav-settings__item,
.mp-nav-settings__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  cursor: pointer;
}
.mp-nav-settings__hint { font-size: var(--fs-xs); color: var(--txt-faint); }
.mp-input:disabled { opacity: 0.45; cursor: not-allowed; }

/* 状态数值 */
.mp-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-1) var(--sp-4);
  font-size: var(--fs-xs);
  color: var(--txt-dim);
}
.mp-stats b { color: var(--txt-hi); }
.stat--bad b { color: #e05a5a; }

.mp-warn {
  margin: 0;
  padding: var(--sp-2);
  font-size: var(--fs-xs);
  color: #f0a23c;
  background: rgba(240, 162, 60, 0.1);
  border: 1px dashed rgba(240, 162, 60, 0.5);
}

/* 掉落 chips */
.mp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.chip {
  font-size: var(--fs-xs);
  padding: calc(2px * var(--ui-scale)) var(--sp-2);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--line-2);
  color: var(--txt-sub);
}
.chip--ore { color: #c0c4cc; }
.chip--rare { color: #7ee0a0; }
.chip--beacon { color: #d0a0ff; }
.chip--empty { color: var(--txt-faint); border-style: dashed; }
.chip--slot { cursor: pointer; color: var(--gold-300); }
.chip--slot:hover { background: var(--gold-dim); }
.chip--btn {
  cursor: pointer;
  font-family: inherit;
  color: var(--txt-sub);
}
.chip--btn:hover:not(:disabled) { color: var(--gold-300); border-color: var(--gold-500); }
.chip--btn:disabled { opacity: 0.4; cursor: not-allowed; }
.chip--active { color: var(--gold-300); border-color: var(--gold-500); }
.chip--dim { opacity: 0.45; }
.chip--purple { color: #d0a0ff; }
.chip--orange { color: #f0a23c; }
.chip--blue { color: #7ec8ff; }
.chip--green { color: #7ee0a0; }

/* 锻造 */
.mp-craft {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-3);
  font-size: var(--fs-xs);
  color: var(--txt-dim);
}
.mp-craft b,
.mp-craft__power b { color: var(--gold-300); font-size: var(--fs-sm); }
.mp-slots { display: flex; flex-direction: column; gap: var(--sp-1); }
.mp-slots__label { font-size: var(--fs-xs); color: var(--txt-faint); }

.mp-enhance {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.mp-input {
  width: calc(72px * var(--ui-scale));
  padding: var(--sp-1) var(--sp-2);
  background: var(--bg-2);
  border: 1px solid var(--line-2);
  color: var(--txt-hi);
  font-family: inherit;
  font-size: var(--fs-xs);
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(190px * var(--ui-scale)), 1fr));
  gap: var(--sp-2);
}
.mp-next {
  margin: 0 0 var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-2);
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--gold-500);
  border-radius: var(--radius-1);
}
.mp-next__label {
  font-size: var(--fs-xs);
  color: var(--gold-300);
}
.mp-next--locked {
  color: var(--txt-faint);
  border-left-color: var(--txt-faint);
}
.mp-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--line-2);
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.3);
}
.mp-card--locked { opacity: 0.55; background: var(--bg-2); border-color: var(--line-1); }
.mp-card--affordable {
  border-color: var(--gold-500);
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px var(--gold-600);
  background: var(--bg-4);
}
.mp-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sp-2);
}
.mp-card__name { font-size: var(--fs-xs); color: var(--txt-hi); font-weight: 700; }
.mp-card__lvl { font-size: var(--fs-xs); color: var(--gold-400); font-weight: 700; }
.mp-card__lock { font-size: var(--fs-xs); color: var(--txt-faint); }
.mp-card__unlock { margin: 0; font-size: var(--fs-xs); color: var(--txt-faint); }
.mp-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-2);
}
.mp-card__cost { font-size: var(--fs-xs); color: var(--txt-sub); }
.mp-card__btns { display: flex; align-items: center; gap: var(--sp-1); }
.mp-note-text { margin: 0; font-size: 11px; color: var(--txt-dim); line-height: 1.5; }
</style>
