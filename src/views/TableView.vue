<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { HELPER_TYPES, HAT_POOL, totalFlipsPerSec } from '../core'
import type { HatRarity } from '../core'
import HelperSprite from '../components/helpers/HelperSprite.vue'
import ItemsPanel from '../components/items/ItemsPanel.vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const { t } = useI18n()
const { state, uiVersion } = storeToRefs(store)

const carpetRef = ref<HTMLElement | null>(null)
const carpetW = ref(400)
const carpetH = ref(320)

let resizeObs: ResizeObserver | null = null

onMounted(() => {
  if (carpetRef.value) {
    carpetW.value = carpetRef.value.clientWidth
    carpetH.value = carpetRef.value.clientHeight
    resizeObs = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        carpetW.value = entry.contentRect.width
        carpetH.value = entry.contentRect.height
      }
    })
    resizeObs.observe(carpetRef.value)
  }
})

onBeforeUnmount(() => resizeObs?.disconnect())

/** 所有已雇佣助手的列表（每个助手 count 个精灵，最多渲染 12 个防性能损耗）。 */
const sprites = computed(() => {
  void uiVersion.value
  const list: Array<{
    key: string
    helperId: string
    hat: string
    rarity: HatRarity
    index: number
  }> = []

  let idx = 0
  for (const helper of HELPER_TYPES) {
    const owned = state.value.helpers[helper.id]
    if (!owned || owned.count === 0) continue
    const cap = Math.min(owned.count, 3) // 每种最多 3 个精灵
    for (let i = 0; i < cap && list.length < 12; i += 1) {
      const hatDef = owned.hat ? HAT_POOL.find((h) => h.id === owned.hat) : null
      const rarity: HatRarity = hatDef?.rarity ?? 'common'
      list.push({
        key: `${helper.id}-${i}`,
        helperId: helper.id,
        hat: owned.hat,
        rarity,
        index: idx++,
      })
    }
  }
  return list
})

const totalFlips = computed(() => {
  void uiVersion.value
  return totalFlipsPerSec(state.value)
})

const totalHelpers = computed(() => {
  void uiVersion.value
  return HELPER_TYPES.reduce((s, h) => s + (state.value.helpers[h.id]?.count ?? 0), 0)
})

const skullTokens = computed(() => {
  void uiVersion.value
  return state.value.skullTokens
})
</script>

<template>
  <div class="table-view">
    <!-- 中央赌台（吸血鬼幸存者画风：厚重木框 + 细腻毛毡） -->
    <section ref="carpetRef" class="table-view__carpet">
      <!-- 毛毡纤维点阵 -->
      <div class="carpet-fibre" />
      <!-- 菱形装饰线 -->
      <div class="carpet-diamond" />
      <!-- 中央光晕 -->
      <div class="carpet-glow" />
      <!-- 暗角 -->
      <div class="carpet-vignette" />
      <!-- 飘浮尘埃 -->
      <div class="carpet-embers" />
      <!-- 内框描边 -->
      <div class="carpet-rail" />

      <!-- 顶部指示条 -->
      <div class="carpet-hud pixel-number">
        <span>{{ t('tabs.helpers') }}: {{ totalHelpers }}</span>
        <span>{{ totalFlips.toFixed(1) }} flips/sec</span>
        <span>{{ t('game.skullTokens') }}: {{ skullTokens }}</span>
      </div>

      <!-- 助手精灵层：在赌桌上随机游走 -->
      <HelperSprite
        v-for="sprite in sprites"
        :key="sprite.key"
        class="carpet-helper"
        :helper-id="sprite.helperId"
        :hat="sprite.hat"
        :rarity="sprite.rarity"
        :count="1"
        :area-width="carpetW"
        :area-height="carpetH"
        :index="sprite.index"
        @flip="store.doFlip()"
      />

      <!-- 默认小助手：没有任何已雇佣助手时，桌布仍默认有一个新手助手在抛币（产生真实收益） -->
      <HelperSprite
        v-if="sprites.length === 0"
        key="default-helper"
        class="carpet-helper"
        helper-id="novice"
        hat=""
        rarity="common"
        :count="1"
        :area-width="carpetW"
        :area-height="carpetH"
        :index="99"
        @flip="store.doFlip()"
      />
    </section>

    <!-- 右侧 ITEMS 面板 -->
    <ItemsPanel />
  </div>
</template>

<style scoped>
.table-view {
  display: flex;
  gap: 16px;
  height: 100%;
  padding: 8px 16px 8px 8px;
}

/* 赌台主区域（吸血鬼幸存者画风：厚重木框 + 细腻毛毡） */
.table-view__carpet {
  flex: 1;
  background-color: #17541f;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.045) 1px, transparent 1.4px),
    radial-gradient(circle at 70% 65%, rgba(0, 0, 0, 0.09) 1px, transparent 1.4px),
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.04) 1px, transparent 1.4px),
    radial-gradient(circle at 85% 15%, rgba(0, 0, 0, 0.08) 1px, transparent 1.4px);
  background-size:
    16px 16px,
    16px 16px,
    22px 22px,
    22px 22px;
  border: 12px solid #3a2008;
  border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23382008'/%3E%3Crect x='0' y='0' width='24' height='24' fill='none' stroke='%23523010' stroke-width='4'/%3E%3C/svg%3E") 12;
  box-shadow:
    inset 0 0 0 4px #2a1804,
    inset 0 0 0 6px #5a3a14,
    inset 0 0 0 8px #2a1804,
    6px 6px 0 #161616;
  min-height: 320px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 装饰层（毛毡纤维 / 菱形线 / 光晕 / 暗角 / 尘埃 / 内框） */
.carpet-fibre,
.carpet-diamond,
.carpet-glow,
.carpet-vignette,
.carpet-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.carpet-fibre {
  z-index: 0;
  background-image:
    radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px),
    radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px);
  background-size:
    7px 7px,
    9px 9px,
    11px 11px;
  mix-blend-mode: overlay;
}

.carpet-diamond {
  z-index: 0;
  background-image:
    linear-gradient(135deg, rgba(212, 175, 55, 0.12) 2px, transparent 2px),
    linear-gradient(45deg, rgba(212, 175, 55, 0.12) 2px, transparent 2px);
  background-size:
    96px 96px,
    96px 96px;
  opacity: 0.5;
}

.carpet-glow {
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(255, 205, 120, 0.18), rgba(255, 205, 120, 0) 60%),
    radial-gradient(ellipse at 18% 20%, rgba(255, 160, 70, 0.14), rgba(255, 160, 70, 0) 40%),
    radial-gradient(ellipse at 82% 78%, rgba(255, 140, 60, 0.12), rgba(255, 140, 60, 0) 40%);
}

.carpet-vignette {
  z-index: 1;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.55),
    inset 0 0 120px rgba(0, 0, 0, 0.25);
}

.carpet-embers {
  z-index: 1;
  background-image:
    radial-gradient(rgba(255, 210, 140, 0.6) 1px, transparent 1.4px),
    radial-gradient(rgba(255, 235, 190, 0.45) 1px, transparent 1.4px),
    radial-gradient(rgba(255, 180, 120, 0.4) 1px, transparent 1.4px);
  background-size:
    140px 160px,
    180px 200px,
    220px 180px;
  background-position: 0 0, 60px 40px, 20px 120px;
  animation: ember-drift 26s linear infinite;
}

.carpet-rail {
  position: absolute;
  inset: 10px;
  z-index: 2;
  pointer-events: none;
  border: 2px solid rgba(212, 175, 55, 0.35);
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.4),
    0 0 12px rgba(212, 175, 55, 0.12);
}

.carpet-hud {
  display: flex;
  gap: 16px;
  color: #a0e0a0;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  padding: 4px 12px;
  width: 100%;
  z-index: 20;
}

/* 精灵层 */
.carpet-helper {
  position: absolute;
  z-index: 10;
}

.carpet-empty {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.35);
  font-size: 16px;
  white-space: nowrap;
  z-index: 20;
}

@keyframes ember-drift {
  from { background-position: 0 0, 60px 40px, 20px 120px; }
  to   { background-position: -140px 160px, 40px 240px, -200px 300px; }
}
</style>
