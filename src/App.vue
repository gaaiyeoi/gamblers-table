<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useGameLoop } from './composables/useGameLoop'
import TopBar from './components/layout/TopBar.vue'
import LeftSidebar from './components/layout/LeftSidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import GameView from './views/GameView.vue'
import AscensionView from './views/AscensionView.vue'
import LevelsView from './views/LevelsView.vue'
import GachaModal from './components/GachaModal.vue'
import SettingsModal from './components/layout/SettingsModal.vue'
import ToastContainer from './components/layout/ToastContainer.vue'
import { useUiStore, type CenterPanel } from './stores/uiStore'

useGameLoop()

const ui = useUiStore()
const { activePanel, gachaOpen, settingsOpen } = storeToRefs(ui)

function onNav(panel: CenterPanel): void {
  ui.navigate(panel)
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
        <LevelsView v-else />
      </main>
      <RightSidebar />
    </div>
  </div>
  <GachaModal v-if="gachaOpen" @close="ui.gachaOpen = false" />
  <SettingsModal v-if="settingsOpen" />
  <ToastContainer />
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
