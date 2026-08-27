<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { HELPER_TYPES, HAT_POOL, totalFlipsPerSec } from '../core'
import type { HatRarity } from '../core'
import CoinClickArea from '../components/coins/CoinClickArea.vue'
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
    <!-- 中央红色地毯（绿色赌台风，参考截图） -->
    <section ref="carpetRef" class="table-view__carpet nes-container is-rounded">
      <!-- 顶部指示条 -->
      <div class="carpet-hud pixel-number">
        <span>{{ t('tabs.helpers') }}: {{ totalHelpers }}</span>
        <span>{{ totalFlips.toFixed(1) }} flips/sec</span>
        <span>{{ t('game.skullTokens') }}: {{ skullTokens }}</span>
      </div>

      <!-- 硬币点击区（中央） -->
      <CoinClickArea />

      <!-- 助手精灵层：在赌桌上随机游走 -->
      <HelperSprite
        v-for="sprite in sprites"
        :key="sprite.key"
        :helper-id="sprite.helperId"
        :hat="sprite.hat"
        :rarity="sprite.rarity"
        :count="1"
        :area-width="carpetW"
        :area-height="carpetH"
        :index="sprite.index"
        @flip="store.doFlip()"
      />

      <!-- 无助手提示 -->
      <p v-if="sprites.length === 0" class="carpet-empty pixel-number">
        {{ t('table.noHelpers') }}
      </p>
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

/* 绿色赌台主区域（参考截图） */
.table-view__carpet {
  flex: 1;
  background: radial-gradient(ellipse at 50% 40%, #2d7a3a, #1b5e28 70%, #0d3a18);
  border: 4px solid #7a5c00;
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.5);
  min-height: 320px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  z-index: 2;
}

.carpet-empty {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.35);
  font-size: 16px;
  white-space: nowrap;
}
</style>
