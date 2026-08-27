<script setup lang="ts">
import { ref } from 'vue'

import { useGameLoop } from './composables/useGameLoop'
import TopBar from './components/layout/TopBar.vue'
import LeftSidebar from './components/layout/LeftSidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import GameView from './views/GameView.vue'
import AscensionView from './views/AscensionView.vue'
import ChallengesView from './views/ChallengesView.vue'
import GachaModal from './components/GachaModal.vue'

useGameLoop()

export type CenterPanel = 'table' | 'talent' | 'challenges' | 'gacha'
const activePanel = ref<CenterPanel>('table')
const gachaOpen = ref(false)

function onNav(panel: CenterPanel): void {
  if (panel === 'gacha') {
    gachaOpen.value = true
    return
  }
  activePanel.value = panel
}
</script>

<template>
  <div class="app-layout">
    <TopBar />
    <div class="app-body">
      <LeftSidebar :active-panel="activePanel" @navigate="onNav" />
      <main class="app-center">
        <GameView v-if="activePanel === 'table'" />
        <AscensionView v-else-if="activePanel === 'talent'" />
        <ChallengesView v-else />
      </main>
      <RightSidebar />
    </div>
  </div>
  <GachaModal v-if="gachaOpen" @close="gachaOpen = false" />
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--app-bg);
  overflow: hidden;
}

.app-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.app-center {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
