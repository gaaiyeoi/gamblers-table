<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, Volume2, VolumeX } from 'lucide-vue-next'

import { useSound } from '../../composables/useSound'
import { i18n } from '../../i18n'
import { useGameStore } from '../../stores/gameStore'
import { UI_SCALE_STEPS, useUiStore } from '../../stores/uiStore'
import GtButton from '../ui/GtButton.vue'
import GtCard from '../ui/GtCard.vue'

const ui = useUiStore()
const store = useGameStore()
const { muted, volume, toggleMuted, setVolume, play } = useSound()

/** 图标尺寸随界面缩放（lucide 图标是 SVG，取整即可保持锐利）。 */
const iconSize = computed(() => Math.round(16 * ui.uiScale))

/** 缩放档位按整数百分比展示：1 → 100%。 */
function scaleLabel(scale: number): string {
  return `${Math.round(scale * 100)}%`
}

function onScale(scale: number): void {
  ui.setScale(scale)
  play('select')
}

/** 重置确认开关：点击"重置游戏"后需二次确认，避免误触。 */
const confirmReset = ref(false)

function onClose(): void {
  play('close')
  ui.closeSettings()
}

function onToggleMuted(): void {
  // 与顶栏一致：先解除静音再播"开启"音，先播"关闭"音再静音，两个方向都听得见
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

function onVolume(e: Event): void {
  play('tick')
  setVolume(Number((e.target as HTMLInputElement).value) / 100)
  store.notify(i18n.global.t('ui.volumeSet', { value: Math.round(volume.value * 100) }), 'info')
}

function onReset(): void {
  if (!confirmReset.value) {
    confirmReset.value = true
    play('danger')
    store.notify(i18n.global.t('ui.resetConfirm'), 'warn')
    window.setTimeout(() => {
      confirmReset.value = false
    }, 4000)
    return
  }
  confirmReset.value = false
  play('danger')
  // 重置会清空事件流，因此提示必须在重置完成后再写入
  void store.resetGame().then(() => store.notify(i18n.global.t('ui.resetDone'), 'warn'))
  ui.closeSettings()
}
</script>

<template>
  <Teleport to="body">
    <div class="settings-overlay" role="dialog" aria-modal="true" @click.self="onClose">
      <GtCard dark class="settings">
        <template #header>
          <div class="settings__header">
            <h2 class="settings__title pixel-number text-gold">设置</h2>
            <GtButton type="warning" :aria-label="'关闭'" @click="onClose">
              <X :size="iconSize" />
            </GtButton>
          </div>
        </template>

        <div class="settings__section">
          <div class="settings__row">
            <span class="settings__label">声音</span>
            <GtButton
              :type="muted ? 'base' : 'warning'"
              class="settings__toggle"
              @click="onToggleMuted"
            >
              <VolumeX v-if="muted" :size="iconSize" />
              <Volume2 v-else :size="iconSize" />
              {{ muted ? '已静音' : '已开启' }}
            </GtButton>
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
              @change="onVolume"
            />
            <span class="settings__value pixel-number">{{ Math.round(volume * 100) }}</span>
          </div>
        </div>

        <div class="settings__section">
          <div class="settings__row">
            <span class="settings__label">界面缩放</span>
            <div class="settings__scales">
              <GtButton
                v-for="step in UI_SCALE_STEPS"
                :key="step"
                size="small"
                :type="ui.uiScale === step ? 'warning' : 'base'"
                class="settings__scale"
                @click="onScale(step)"
              >
                {{ scaleLabel(step) }}
              </GtButton>
            </div>
          </div>
          <p class="settings__hint">整屏字号与组件尺寸同步缩放，选择后立即生效。</p>
        </div>

        <div class="settings__section settings__section--danger">
          <div class="settings__row">
            <span class="settings__label">存档</span>
            <GtButton type="danger" @click="onReset">
              {{ confirmReset ? '确认重置？' : '重置游戏' }}
            </GtButton>
          </div>
          <p class="settings__hint">重置会清空当前进度，无法恢复。</p>
        </div>
      </GtCard>
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
  width: calc(360px * var(--ui-scale));
  max-width: 90vw;
  box-shadow: var(--shadow-pop);
}

/* GtCard 的 body 默认有 padding，header 区自定义 */
.settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.settings__title {
  font-size: var(--fs-base);
  letter-spacing: 1px;
  margin: 0;
}

.settings__section {
  border-top: 1px dashed var(--line-2);
  padding: var(--sp-3) 0;
}
.settings__section:first-child { border-top: none; padding-top: 0; }

.settings__section--danger {
  margin-top: var(--sp-1);
}

.settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-2);
}

.settings__label {
  color: var(--txt-sub);
  font-size: var(--fs-base);
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
  width: calc(32px * var(--ui-scale));
  text-align: right;
  color: var(--txt-main);
}

.settings__scales {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sp-1);
}

.settings__scale {
  min-width: calc(56px * var(--ui-scale));
}

.settings__hint {
  color: var(--txt-dim);
  font-size: var(--fs-base);
  margin: 4px 0 0;
}
</style>
