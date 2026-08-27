<script setup lang="ts">
import { ref } from 'vue'
import { PxButton, PxCard } from '@mmt817/pixel-ui'
import { X, Volume2, VolumeX } from 'lucide-vue-next'

import { useSound } from '../../composables/useSound'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

const ui = useUiStore()
const store = useGameStore()
const { muted, volume, toggleMuted, setVolume, playClick } = useSound()

/** 重置确认开关：点击"重置游戏"后需二次确认，避免误触。 */
const confirmReset = ref(false)

function onClose(): void {
  ui.closeSettings()
}

function onToggleMuted(): void {
  toggleMuted()
  playClick()
}

function onVolume(e: Event): void {
  setVolume(Number((e.target as HTMLInputElement).value) / 100)
}

function onReset(): void {
  if (!confirmReset.value) {
    confirmReset.value = true
    window.setTimeout(() => {
      confirmReset.value = false
    }, 4000)
    return
  }
  confirmReset.value = false
  void store.resetGame()
  ui.closeSettings()
}
</script>

<template>
  <Teleport to="body">
    <div class="settings-overlay" role="dialog" aria-modal="true" @click.self="onClose">
      <PxCard class="settings px-card--dark">
        <div class="settings__header">
          <h2 class="settings__title pixel-number text-gold">设置</h2>
          <PxButton :use-throttle="false" type="warning" aria-label="close" @click="onClose">
            <X :size="14" />
          </PxButton>
        </div>

        <div class="settings__section">
          <div class="settings__row">
            <span class="settings__label">声音</span>
            <PxButton
              :use-throttle="false"
              :type="muted ? 'base' : 'warning'"
              class="settings__toggle"
              @click="onToggleMuted"
            >
              <VolumeX v-if="muted" :size="16" />
              <Volume2 v-else :size="16" />
              {{ muted ? '已静音' : '已开启' }}
            </PxButton>
          </div>

          <div class="settings__row">
            <span class="settings__label">音量</span>
            <input
              class="settings__range"
              type="range"
              min="0"
              max="100"
              :value="Math.round(volume * 100)"
              :disabled="muted"
              @input="onVolume"
            />
            <span class="settings__value pixel-number">{{ Math.round(volume * 100) }}</span>
          </div>
        </div>

        <div class="settings__section settings__section--danger">
          <div class="settings__row">
            <span class="settings__label">存档</span>
            <PxButton :use-throttle="false" type="danger" @click="onReset">
              {{ confirmReset ? '确认重置？' : '重置游戏' }}
            </PxButton>
          </div>
          <p class="settings__hint">重置会清空当前进度，无法恢复。</p>
        </div>
      </PxCard>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings {
  display: block;
  width: 360px;
  max-width: 90vw;
  padding: 16px;
  --px-border-color: var(--gold);
}

.settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.settings__title {
  font-size: 16px;
}

.settings__section {
  border-top: 2px solid var(--gold-dark);
  padding: 12px 0;
}

.settings__section--danger {
  margin-top: 4px;
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.settings__label {
  color: var(--text-secondary);
  font-size: 16px;
  flex-shrink: 0;
}

.settings__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.settings__range {
  flex: 1;
  min-width: 0;
  accent-color: var(--gold);
}

.settings__value {
  width: 32px;
  text-align: right;
  color: var(--text-primary);
}

.settings__hint {
  color: var(--text-dim);
  font-size: 16px;
  margin: 4px 0 0;
}
</style>
