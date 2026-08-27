<script setup lang="ts">
import type { CenterPanel } from '../../App.vue'

defineProps<{ activePanel: CenterPanel }>()
const emit = defineEmits<{ navigate: [panel: CenterPanel] }>()

interface NavItem { id: CenterPanel; label: string; icon: string }
const sections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: '关卡 & 成就',
    items: [
      { id: 'table', label: '返回赌桌', icon: '♠' },
      { id: 'challenges', label: '任务关卡', icon: '★' },
    ],
  },
  {
    title: '长线养成',
    items: [
      { id: 'talent', label: '天赋', icon: '◆' },
      { id: 'talent', label: '重生', icon: '↺' },
    ],
  },
]

const bottomItems: NavItem[] = [
  { id: 'gacha', label: '桌布', icon: '▣' },
  { id: 'gacha', label: '装饰扭蛋', icon: '✦' },
]
</script>

<template>
  <nav class="left-sidebar">
    <template v-for="section in sections" :key="section.title">
      <div class="section-header">{{ section.title }}</div>
      <button
        v-for="item in section.items"
        :key="`${item.id}-${item.label}`"
        class="nes-btn nav-item"
        :class="{ 'is-error': activePanel === item.id }"
        type="button"
        @click="emit('navigate', item.id)"
      >
        <span class="nav-item__icon">{{ item.icon }}</span>
        {{ item.label }}
      </button>
    </template>

    <div class="section-divider" />
    <div class="section-header">娱乐 / 外观</div>
    <button
      v-for="item in bottomItems"
      :key="item.label"
      class="nes-btn nav-item"
      type="button"
      @click="emit('navigate', item.id)"
    >
      <span class="nav-item__icon">{{ item.icon }}</span>
      {{ item.label }}
    </button>

    <div class="section-divider" />
    <div class="section-header">系统</div>
    <button class="nes-btn nav-item" type="button">
      <span class="nav-item__icon">ℹ</span>
      设置
    </button>
  </nav>
</template>

<style scoped>
.left-sidebar {
  width: 168px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 4px solid #212121;
  padding: 10px 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-header {
  font-size: 16px;
  color: var(--text-dim);
  padding: 10px 12px 4px;
  letter-spacing: .5px;
  text-transform: uppercase;
  font-family: 'Ark Pixel 16px Monospaced', monospace;
}

.section-divider {
  height: 4px;
  background: #212121;
  margin: 6px 0;
}

/* NES 按钮全宽左对齐 */
.nav-item {
  display: flex !important;
  align-items: center;
  gap: 8px;
  width: calc(100% - 16px) !important;
  margin: 3px 8px;
  padding: 9px 12px !important;
  font-size: 16px !important;
  text-align: left !important;
  justify-content: flex-start !important;
}

.nav-item__icon {
  width: 16px;
  text-align: center;
  font-size: 16px;
  flex-shrink: 0;
}
</style>
