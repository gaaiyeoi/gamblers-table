<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useGameStore } from '../../stores/gameStore'

const store = useGameStore()
const { t } = useI18n()
const flipping = ref(false)
let flipTimer: ReturnType<typeof setTimeout> | null = null

function onClick(): void {
  store.doFlip()
  flipping.value = true
  if (flipTimer !== null) clearTimeout(flipTimer)
  flipTimer = setTimeout(() => {
    flipping.value = false
  }, 300)
}
</script>

<template>
  <div class="coin-area">
    <!-- 像素方块大硬币 -->
    <button
      class="coin-px"
      :class="{ 'is-flipping': flipping }"
      type="button"
      aria-label="flip coin"
      @click="onClick"
    >
      <!-- 像素高光 -->
      <div class="coin-px__glare" />
      <!-- 面值 -->
      <span class="coin-px__face pixel-number">$</span>
      <!-- 像素底部阴影 -->
      <div class="coin-px__shadow-bottom" />
    </button>
    <p class="coin-area__hint pixel-number">{{ t('table.flip') }}</p>
  </div>
</template>

<style scoped>
.coin-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  min-height: 240px;
}

/* ── 像素方块大硬币（无圆角，无渐变） ── */
.coin-px {
  position: relative;
  width: 96px;
  height: 96px;
  background: #d4a017;
  /* NES 像素立体硬边框 */
  border: 4px solid #7a5c00;
  box-shadow:
    inset -8px -8px 0 #8a6000,
    inset  8px  8px 0 #f0c840,
    8px 8px 0 rgba(0, 0, 0, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  image-rendering: pixelated;
  overflow: hidden;
}

.coin-px:hover {
  box-shadow:
    inset -8px -8px 0 #8a6000,
    inset  8px  8px 0 #f0c840,
    8px 8px 0 rgba(0, 0, 0, 0.9),
    0 0 0 3px #fff;
}

.coin-px:active,
.coin-px.is-flipping:active {
  transform: translate(4px, 4px);
  box-shadow:
    inset -4px -4px 0 #8a6000,
    inset  4px  4px 0 #f0c840,
    4px 4px 0 rgba(0, 0, 0, 0.8);
}

/* 像素高光块：左上 */
.coin-px__glare {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 12px;
  background: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}

/* 像素底阴影块：右下 */
.coin-px__shadow-bottom {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 12px;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.coin-px__face {
  font-size: 40px;
  font-weight: 900;
  color: #3d2800;
  line-height: 1;
  position: relative;
  z-index: 2;
  /* 像素文字阴影 */
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.5);
}

/* 像素翻转：步进，不平滑 */
.coin-px.is-flipping {
  animation: px-flip 0.3s steps(3, end);
}

.coin-area__hint {
  color: var(--text-dim);
  font-size: 16px;
}

@keyframes px-flip {
  0%   { transform: scaleX(1); }
  33%  { transform: scaleX(0.1); background: #888; }
  66%  { transform: scaleX(1); background: #8b6914; }
  100% { transform: scaleX(1); background: #d4a017; }
}
</style>
