<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PxButton } from '@mmt817/pixel-ui'
import { Menu, Settings, Sparkles, Volume2, VolumeX } from 'lucide-vue-next'

import { useSound } from '../../composables/useSound'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore, type CenterPanel } from '../../stores/uiStore'

const ui = useUiStore()
const { muted, toggleMuted, playClick } = useSound()
const store = useGameStore()

/** 当前关卡（原显示在赌桌下方状态条，现移到顶栏常驻展示）。 */
const round = computed(() => store.state.prestige.tier)

interface MenuItem { id: CenterPanel | 'settings'; label: string }
const menuItems: MenuItem[] = [
  { id: 'table', label: '返回赌桌' },
  { id: 'challenges', label: '任务关卡' },
  { id: 'talent', label: '天赋' },
  { id: 'gacha', label: '装饰扭蛋' },
  { id: 'settings', label: '设置' },
]

function onToggleMuted(): void {
  // 两个方向都给出明确的声音反馈：
  // 有声 → 静音：先播"嗒"作为最后一次反馈，再切静音；
  // 静音 → 有声：先恢复声音，再播"嗒"表示已开启。
  if (muted.value) {
    toggleMuted()
    playClick()
  } else {
    playClick()
    toggleMuted()
  }
}

function onToggleMenu(): void {
  playClick()
  ui.toggleMenu()
}

function onPick(item: MenuItem): void {
  playClick()
  if (item.id === 'settings') {
    ui.openSettings()
    return
  }
  ui.navigate(item.id as CenterPanel)
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
        <span class="logo-px">■</span>
        <span class="logo-text pixel-number">像素赌桌</span>
        <span class="logo-sub pixel-number">GAMBLERS TABLE</span>
      </div>

      <!-- 当前关卡（原赌桌下方状态条，移至顶栏常驻） -->
      <span class="topbar__round pixel-number">第 {{ round }} 关</span>

      <!-- 右侧操作 -->
      <div class="topbar__right">
        <PxButton
          :use-throttle="false"
          class="tb-btn"
          :type="muted ? 'base' : 'warning'"
          :aria-label="muted ? '开启声音' : '静音'"
          @click="onToggleMuted"
        >
          <VolumeX v-if="muted" :size="16" />
          <Volume2 v-else :size="16" />
        </PxButton>

        <PxButton
          :use-throttle="false"
          class="tb-btn"
          type="primary"
          :aria-label="ui.menuOpen ? '收起菜单' : '打开菜单'"
          @click="onToggleMenu"
        >
          <Menu :size="16" />
          菜单
        </PxButton>

        <!-- 下拉菜单 -->
        <Transition name="drop">
          <div v-if="ui.menuOpen" class="topbar__menu">
            <button
              v-for="item in menuItems"
              :key="item.id"
              class="menu-item pixel-number"
              @click="onPick(item)"
            >
              <Settings v-if="item.id === 'settings'" :size="15" />
              <Sparkles v-else-if="item.id === 'gacha'" :size="15" />
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
  background: var(--app-bg);
  border-bottom: 4px solid #212121;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  min-height: 56px;
}

.topbar__logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-right: 8px;
}

.logo-px {
  color: #b8912b;
  font-size: 16px;
  line-height: 1;
}

.logo-text {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.logo-sub {
  color: var(--text-dim);
  font-size: 16px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.topbar__round {
  flex-shrink: 0;
  padding: 2px 10px;
  background: rgba(184, 145, 43, 0.16);
  border: 2px solid #b8912b;
  color: #b8912b;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

/* 右侧按钮 */
.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  position: relative;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 下拉菜单 */
.topbar__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 176px;
  background: var(--app-bg);
  border: 3px solid #212121;
  box-shadow:
    inset 0 0 0 2px #3a3a3a,
    6px 6px 0 rgba(0, 0, 0, 0.4);
  padding: 6px;
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid #2a2a2a;
  color: var(--text-primary);
  font-size: 16px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #b8912b;
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
