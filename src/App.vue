<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useGameLoop } from './composables/useGameLoop'
import TopBar from './components/layout/TopBar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import GameView from './views/GameView.vue'
import SettingsModal from './components/layout/SettingsModal.vue'
import MilestoneModal from './components/layout/MilestoneModal.vue'
import ToastContainer from './components/layout/ToastContainer.vue'
import { useUiStore } from './stores/uiStore'

useGameLoop()

const ui = useUiStore()
const { settingsOpen } = storeToRefs(ui)
</script>

<template>
  <div class="app-layout">
    <TopBar />
    <div class="app-body">
      <main class="app-center">
        <GameView />
      </main>
      <RightSidebar />
    </div>
  </div>
  <SettingsModal v-if="settingsOpen" />
  <MilestoneModal />
  <ToastContainer />
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: transparent;
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
