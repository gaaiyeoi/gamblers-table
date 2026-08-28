<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Menu, Settings, Volume2, VolumeX } from 'lucide-vue-next'

import GtButton from '../ui/GtButton.vue'

import { currencyOf, miningScrapPerSecond } from '../../core'
import { formatCash } from '../../core/format'
import { useSound } from '../../composables/useSound'
import { i18n } from '../../i18n'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore, type CenterPanel } from '../../stores/uiStore'

const ui = useUiStore()
const { muted, toggleMuted, play } = useSound()
const store = useGameStore()
const { state, uiVersion } = storeToRefs(store)

/** 图标尺寸随界面缩放（lucide 图标是 SVG，取整即可保持锐利）。 */
const iconSize = computed(() => Math.round(16 * ui.uiScale))

/** 当前深度（矿场核心进度）。 */
const depth = computed(() => {
  void uiVersion.value
  return state.value.mining.depth
})

/** 中央废料：顶栏常驻展示。 */
const scrap = computed(() => {
  void uiVersion.value
  return formatCash(currencyOf(state.value, 'scrap'))
})
const perSec = computed(() => {
  void uiVersion.value
  const v = miningScrapPerSecond(state.value)
  return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString()
})

interface MenuItem { id: CenterPanel | 'settings'; label: string }
const menuItems: MenuItem[] = [
  { id: 'table', label: '返回矿场' },
  { id: 'settings', label: '设置' },
]

function onToggleMuted(): void {
  // 两个方向都要听得见：
  // 静音 → 有声：先解除静音，再播"开启"的上扬音；
  // 有声 → 静音：先播"关闭"的下扬音作为最后一次反馈，再切静音。
  const next = !muted.value
  if (muted.value) {
    toggleMuted()
    play('toggleOn')
  } else {
    play('toggleOff')
    toggleMuted()
  }
  store.notify(next ? i18n.global.t('ui.soundOn') : i18n.global.t('ui.soundOff'), 'info')
}

function onToggleMenu(): void {
  // 收起菜单是"关闭"音、展开菜单是"打开"音
  play(ui.menuOpen ? 'close' : 'open')
  ui.toggleMenu()
}

function onPick(item: MenuItem): void {
  if (item.id === 'settings') {
    play('open')
    ui.openSettings()
    store.notify(i18n.global.t('ui.openedSettings'), 'info')
    return
  }
  play('click')
  ui.navigate(item.id as CenterPanel)
  store.notify(i18n.global.t('ui.switchedPanel', { panel: i18n.global.t('ui.panelTable') }), 'info')
}

// 点击菜单外部时关闭下拉
const rootRef = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent): void {
  if (!rootRef.value) return
  if (rootRef.value.contains(e.target as Node)) return
  ui.menuOpen = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="topbar-wrap">
    <header class="topbar">
      <!-- LOGO -->
      <div class="topbar__logo">
        <span class="logo-px">♦</span>
        <div class="topbar__logo-text">
          <span class="logo-text pixel-number">DIGIVERSE</span>
          <span class="logo-sub pixel-number">PIXEL IDLE</span>
        </div>
      </div>

      <!-- 当前深度 -->
      <span class="topbar__round pixel-number">深度 {{ depth }} 层</span>

      <!-- 中央资源条（废料） -->
      <div class="topbar__hero">
        <div class="topbar__hero-cash pixel-number">{{ scrap }}</div>
        <div class="topbar__hero-rate pixel-number">
          <span class="topbar__hero-rate-icon">✦</span>
          {{ perSec }}/s
        </div>
      </div>

      <!-- 右侧操作 -->
      <div class="topbar__right">
        <GtButton
          class="tb-btn"
          :type="muted ? 'base' : 'warning'"
          :aria-label="muted ? '开启声音' : '静音'"
          @click="onToggleMuted"
        >
          <VolumeX v-if="muted" :size="iconSize" />
          <Volume2 v-else :size="iconSize" />
        </GtButton>

        <GtButton
          class="tb-btn"
          type="primary"
          :aria-label="ui.menuOpen ? '收起菜单' : '打开菜单'"
          @click="onToggleMenu"
        >
          <Menu :size="iconSize" />
          菜单
        </GtButton>

        <!-- 下拉菜单 -->
        <Transition name="drop">
          <div v-if="ui.menuOpen" class="topbar__menu">
            <button
              v-for="item in menuItems"
              :key="item.id"
              class="menu-item pixel-number"
              @click="onPick(item)"
            >
              <Settings v-if="item.id === 'settings'" :size="iconSize" />
              {{ item.label }}
            </button>
          </div>
        </Transition>
      </div>
    </header>
  </div>
</template>

<style scoped>
.topbar-wrap {
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(24, 16, 48, 0.95) 0%, rgba(11, 7, 20, 0.95) 100%),
    var(--bg-1);
  border-bottom: 1px solid var(--line-1);
  box-shadow:
    0 2px 0 var(--gold-glow),
    0 4px 14px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 40;
  backdrop-filter: blur(2px);
}

/* 顶栏底部霓虹强调条 */
.topbar-wrap::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--neon-pink) 10%,
    var(--gold-500) 50%,
    var(--neon-pink) 90%,
    transparent 100%
  );
  box-shadow: 0 0 12px var(--gold-glow);
}

.topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-4);
  min-height: calc(64px * var(--ui-scale));
}

.topbar__logo {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
  margin-right: var(--sp-2);
  padding-right: var(--sp-3);
  border-right: 1px solid var(--line-1);
}

.topbar__logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

/* LOGO 方块：霓虹青绿光晕 */
.logo-px {
  color: var(--gold-500);
  font-size: calc(20px * var(--ui-scale));
  line-height: 1;
  filter: drop-shadow(0 0 4px var(--gold-glow));
}

.logo-text {
  color: var(--txt-hi);
  font-size: var(--fs-md);
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

.logo-sub {
  color: var(--txt-faint);
  font-size: var(--fs-xs);
  letter-spacing: 3px;
  white-space: nowrap;
  margin-top: 2px;
}

/* 当前关卡徽标 */
.topbar__round {
  flex-shrink: 0;
  padding: var(--sp-1) var(--sp-3);
  background: var(--bg-3);
  border: 1px solid var(--line-2);
  color: var(--txt-sub);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
  box-shadow: inset -2px -2px 0 rgba(0, 0, 0, 0.3);
}

/* ── 中央英雄资源条 ── */
.topbar__hero {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-3);
  overflow: hidden;
  white-space: nowrap;
}

.topbar__hero-cash {
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.1;
  background: linear-gradient(180deg, var(--txt-gold-bright) 0%, var(--gold-400) 60%, var(--gold-600) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 20px rgba(240, 162, 60, 0.35);
  font-variant-numeric: tabular-nums;
}

.topbar__hero-rate {
  font-size: var(--fs-sm);
  color: var(--txt-sub);
  letter-spacing: 0.5px;
  padding: calc(2px * var(--ui-scale)) var(--sp-2);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--line-1);
}

.topbar__hero-rate-icon {
  color: var(--gold-400);
  margin-right: 2px;
}

/* 右侧按钮 */
.topbar__right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-left: auto;
  flex-shrink: 0;
  position: relative;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--ui-scale));
}

/* 下拉菜单 */
.topbar__menu {
  position: absolute;
  top: calc(100% + var(--sp-2));
  right: 0;
  min-width: calc(200px * var(--ui-scale));
  background: var(--bg-3);
  border: 2px solid var(--gold-500);
  box-shadow:
    inset 0 0 0 1px var(--line-0),
    0 12px 24px rgba(0, 0, 0, 0.6),
    0 0 16px var(--gold-glow-soft);
  padding: var(--sp-1);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--fs-base);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--line-1);
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:hover {
  background: var(--gold-dim);
  color: var(--gold-300);
  padding-left: calc(var(--sp-3) + 4px);
}

/* 下拉展开动画 */
.drop-enter-active,
.drop-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
  transform-origin: top right;
}
.drop-enter-from,
.drop-leave-to {
  transform: scaleY(0.8);
  opacity: 0;
}
</style>
